import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

/**
 * Serverless-optimized database connection
 * 
 * Key optimizations:
 * 1. Single connection per function instance (max: 1)
 * 2. Connection reuse across warm starts
 * 3. Automatic cleanup of idle connections
 * 4. Fast connection timeout for better error handling
 * 
 * Note: In serverless, each function instance maintains its own connection.
 * Vercel keeps functions "warm" for ~5 minutes, reusing connections.
 */

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set');
}

// Singleton pattern: reuse connection across function invocations (warm starts)
declare global {
    var dbClient: postgres.Sql | undefined;
}

// Reuse existing connection if available (during warm starts)
const client = global.dbClient ?? postgres(connectionString, {
    max: 1, // Single connection per serverless function instance
    idle_timeout: 20, // Close idle connections after 20 seconds
    max_lifetime: 60 * 60, // Maximum connection lifetime: 1 hour
    connect_timeout: 10, // Timeout after 10 seconds if can't connect
    prepare: false, // Disable prepared statements for better serverless compatibility
});

// Store in global to persist across warm starts (in both dev and production!)
if (!global.dbClient) {
    global.dbClient = client;
}

export const db = drizzle(client, { schema });
