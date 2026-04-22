import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL ?? "postgres://postgres:postgres@127.0.0.1:5432/postgres";
const queryClient = postgres(connectionString, { prepare: false });

export const db = drizzle(queryClient, { schema });
