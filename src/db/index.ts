import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../schemas";
import { DB_NAME } from "../constant";

export const connectionString = `${process.env.DATABASE_URL}/${DB_NAME}`;

const client = postgres(connectionString);

export const db = drizzle(client, { schema });