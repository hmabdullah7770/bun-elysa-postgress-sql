import { sql } from "drizzle-orm";
import { db } from "../src/db";
import { flags } from "../flags";

type SearchOptions = {
  table: string;
  columns: string[];
  query: string;
  limit?: number;
};

type VectorSearchOptions = {
  table: string;
  vectorColumn: string;
  embedding: number[];
  limit?: number;
};

const quoteIdentifier = (identifier: string): string => {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(identifier)) {
    throw new Error(`Invalid PostgreSQL identifier: ${identifier}`);
  }
  return `"${identifier}"`;
};

const quoteTable = (table: string): string => {
  const parts = table.split(".");
  if (parts.length > 2) throw new Error(`Invalid PostgreSQL table name: ${table}`);
  return parts.map(quoteIdentifier).join(".");
};

const validateOptions = ({ table, columns, query, limit = 20 }: SearchOptions) => {
  if (!table.trim()) throw new Error("A PostgreSQL table name is required");
  if (columns.length === 0) throw new Error("At least one search column is required");
  if (!query.trim()) throw new Error("A search query is required");
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new Error("Search limit must be an integer between 1 and 100");
  }

  return {
    table: quoteTable(table),
    columns: columns.map(quoteIdentifier),
    query: query.trim(),
    limit,
  };
};

const textExpression = (columns: string[]) =>
  sql.raw(columns.map((column) => `COALESCE(search_source.${column}::text, '')`).join(", "));

export const searchFullText = async (options: SearchOptions) => {
  if (!flags.postgresBackends.useFullTextSearch) {
    throw new Error("PostgreSQL full-text search is disabled");
  }

  const validated = validateOptions(options);
  const document = sql`to_tsvector('simple', concat_ws(' ', ${textExpression(validated.columns)}))`;
  const query = sql`plainto_tsquery('simple', ${validated.query})`;

  return db.execute(sql`
    SELECT search_source.*, ts_rank(${document}, ${query}) AS search_rank
    FROM ${sql.raw(validated.table)} AS search_source
    WHERE ${document} @@ ${query}
    ORDER BY search_rank DESC
    LIMIT ${validated.limit}
  `);
};

export const searchTrigram = async (
  options: SearchOptions & { minSimilarity?: number },
) => {
  if (!flags.postgresBackends.useTrigramSearch) {
    throw new Error("PostgreSQL trigram search is disabled");
  }

  const validated = validateOptions(options);
  const minSimilarity = options.minSimilarity ?? 0.3;
  if (!Number.isFinite(minSimilarity) || minSimilarity < 0 || minSimilarity > 1) {
    throw new Error("Minimum trigram similarity must be between 0 and 1");
  }

  const scores = validated.columns.map(
    (column) => sql`similarity(search_source.${sql.raw(column)}::text, ${validated.query})`,
  );
  const score = sql`greatest(${sql.join(scores, sql`, `)})`;

  return db.execute(sql`
    SELECT search_source.*, ${score} AS search_similarity
    FROM ${sql.raw(validated.table)} AS search_source
    WHERE ${score} >= ${minSimilarity}
    ORDER BY search_similarity DESC
    LIMIT ${validated.limit}
  `);
};

export const searchVector = async (options: VectorSearchOptions) => {
  if (!flags.postgresBackends.useVectorSearch) {
    throw new Error("PostgreSQL vector search is disabled");
  }

  if (!options.table.trim()) throw new Error("A PostgreSQL table name is required");
  if (options.embedding.length === 0 || !options.embedding.every(Number.isFinite)) {
    throw new Error("Embedding must contain finite numbers");
  }

  const limit = options.limit ?? 20;
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new Error("Search limit must be an integer between 1 and 100");
  }

  const table = quoteTable(options.table);
  const vectorColumn = quoteIdentifier(options.vectorColumn);
  const embedding = `[${options.embedding.join(",")}]`;

  return db.execute(sql`
    SELECT search_source.*,
      search_source.${sql.raw(vectorColumn)} <=> ${embedding}::vector AS vector_distance
    FROM ${sql.raw(table)} AS search_source
    WHERE search_source.${sql.raw(vectorColumn)} IS NOT NULL
    ORDER BY vector_distance ASC
    LIMIT ${limit}
  `);
};
