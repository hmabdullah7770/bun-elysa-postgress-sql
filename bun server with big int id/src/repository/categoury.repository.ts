import { asc, eq, sql } from "drizzle-orm";
import { db } from "../db";
import { categories, type NewCategory } from "../schemas/categoury.schema";
import { posts } from "../schemas/post.schema";

export class CategouryRepository {
  async list(page: number, limit: number) {
    const [rows, countRows] = await Promise.all([
      db
        .select()
        .from(categories)
        .orderBy(asc(categories.categouryname))
        .limit(limit)
        .offset((page - 1) * limit),
      db.select({ count: sql<number>`count(*)::int` }).from(categories),
    ]);
    return { rows, total: Number(countRows[0]?.count ?? 0) };
  }

  async listNames() {
    const [storedNames, postNames] = await Promise.all([
      db.select({ name: categories.categouryname }).from(categories),
      db
        .selectDistinct({ name: posts.category })
        .from(posts)
        .where(andPublishedCategory()),
    ]);
    const uniqueNames = new Map<string, string>();
    for (const { name } of [...storedNames, ...postNames]) {
      const trimmed = name.trim();
      if (trimmed) uniqueNames.set(trimmed.toLowerCase(), trimmed);
    }
    return [...uniqueNames.values()].sort((a, b) => a.localeCompare(b));
  }

  async findById(id: number) {
    const rows = await db.select().from(categories).where(eq(categories._id, id)).limit(1);
    return rows[0] ?? null;
  }

  async findByName(name: string) {
    const rows = await db
      .select()
      .from(categories)
      .where(sql`lower(${categories.categouryname}) = lower(${name})`)
      .limit(1);
    return rows[0] ?? null;
  }

  async create(data: NewCategory) {
    const rows = await db
      .insert(categories)
      .values(data)
      .onConflictDoNothing({ target: categories.categouryname })
      .returning();
    return rows[0] ?? null;
  }

  async update(id: number, name: string) {
    const rows = await db
      .update(categories)
      .set({ categouryname: name, updatedAt: new Date() })
      .where(eq(categories._id, id))
      .returning();
    return rows[0] ?? null;
  }

  async delete(id: number) {
    const rows = await db
      .delete(categories)
      .where(eq(categories._id, id))
      .returning({ _id: categories._id });
    return rows[0] ?? null;
  }
}

export const categouryRepository = new CategouryRepository();

function andPublishedCategory() {
  return sql`${posts.isPublished} = true and ${posts.category} <> ''`;
}