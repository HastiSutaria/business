/**
 * Single shared MongoDB connection for the whole process.
 * Every MongoStore pulls its collection from the same Db instance returned here.
 */
import { Db, MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017';
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME ?? 'hasti_jewellers';

let client: MongoClient | undefined;
let db: Db | undefined;
let connectPromise: Promise<Db> | undefined;

export function connectToDatabase(): Promise<Db> {
  if (connectPromise) return connectPromise;

  connectPromise = MongoClient.connect(MONGODB_URI).then((connectedClient) => {
    client = connectedClient;
    db = client.db(MONGODB_DB_NAME);
    return db;
  });

  return connectPromise;
}

export function getDb(): Db {
  if (!db) {
    throw new Error('MongoDB connection has not been established yet. Call connectToDatabase() first.');
  }
  return db;
}

export async function closeDatabaseConnection(): Promise<void> {
  await client?.close();
  client = undefined;
  db = undefined;
  connectPromise = undefined;
}
