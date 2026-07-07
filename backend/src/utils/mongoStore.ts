/**
 * Generic MongoDB-backed data-access layer.
 *
 * Drop-in replacement for the old file-based JsonStore: each store keeps its
 * entire value (an array or a single object, same as before) in ONE document
 * inside its own collection, so every controller/service in this codebase
 * keeps working against the same read/write/update/reset signatures.
 *
 * Read-modify-write operations are serialized per collection within this
 * process (mirroring the old per-file queue) so concurrent requests can't
 * produce lost updates.
 */
import { Collection } from 'mongodb';
import { getDb } from './mongoClient';

const SINGLETON_ID = 'singleton';

interface DocumentWrapper<T> {
  _id: string;
  value: T;
}

/** Per-collection promise chain to serialize operations within this process. */
const collectionQueues = new Map<string, Promise<unknown>>();

function enqueue<T>(key: string, task: () => Promise<T>): Promise<T> {
  const previous = collectionQueues.get(key) ?? Promise.resolve();
  const next = previous.then(task, task);
  collectionQueues.set(
    key,
    next.then(
      () => undefined,
      () => undefined
    )
  );
  return next;
}

export class MongoStore<T> {
  private readonly collectionName: string;
  private readonly defaultValue: T;

  constructor(collectionName: string, defaultValue: T) {
    this.collectionName = collectionName;
    this.defaultValue = defaultValue;
  }

  private collection(): Collection<DocumentWrapper<T>> {
    return getDb().collection<DocumentWrapper<T>>(this.collectionName);
  }

  /** Read the full contents of the store. */
  async read(): Promise<T> {
    return enqueue(this.collectionName, async () => {
      try {
        const doc = await this.collection().findOne({ _id: SINGLETON_ID });
        return doc ? doc.value : this.defaultValue;
      } catch (err) {
        throw new Error(`Failed to read ${this.collectionName}: ${(err as Error).message}`);
      }
    });
  }

  /** Overwrite the full contents of the store. */
  async write(data: T): Promise<void> {
    return enqueue(this.collectionName, async () => {
      try {
        await this.collection().replaceOne(
          { _id: SINGLETON_ID },
          { _id: SINGLETON_ID, value: data } as DocumentWrapper<T>,
          { upsert: true }
        );
      } catch (err) {
        throw new Error(`Failed to write ${this.collectionName}: ${(err as Error).message}`);
      }
    });
  }

  /** Read-modify-write in a single serialized operation to avoid lost updates. */
  async update(mutator: (current: T) => T | Promise<T>): Promise<T> {
    return enqueue(this.collectionName, async () => {
      try {
        const doc = await this.collection().findOne({ _id: SINGLETON_ID });
        const current = doc ? doc.value : this.defaultValue;
        const updated = await mutator(current);
        await this.collection().replaceOne(
          { _id: SINGLETON_ID },
          { _id: SINGLETON_ID, value: updated } as DocumentWrapper<T>,
          { upsert: true }
        );
        return updated;
      } catch (err) {
        throw new Error(`Failed to update ${this.collectionName}: ${(err as Error).message}`);
      }
    });
  }

  /** Reset the store back to its default (empty) value. Used by Master Reset. */
  async reset(): Promise<void> {
    await this.write(this.defaultValue);
  }
}
