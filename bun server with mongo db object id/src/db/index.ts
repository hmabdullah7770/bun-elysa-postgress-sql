import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../schemas";
import *  as schema2 from "../schemas/mastarPortal"

import { DB_NAME, DB_NAME_2 } from "../constant";


export const connectionString = `${process.env.DATABASE_URL}/${DB_NAME}`;

export const connectionString2 = `${process.env.DATABASE_URL}/${DB_NAME_2}`;

const client = postgres(connectionString);
const client2 = postgres(connectionString2);

export const db = drizzle(client, { schema });
export const db2 = drizzle(client2, { schema: schema2 });