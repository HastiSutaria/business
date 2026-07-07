/**
 * Generic JSON file data-access layer.
 *
 * This is the ONLY module that touches the filesystem for persistence.
 * Every read/write goes through an in-process queue (per file) AND an
 * on-disk lockfile (via proper-lockfile), so:
 *   - concurrent requests within this process are serialized per file
 *   - concurrent processes (e.g. a second server instance) are also safe
 *
 * Writes are atomic: we write to a temp file then rename() over the
 * target, so a crash mid-write can never leave a half-written JSON file.
 *
 * To swap this for a real database later, replace only this file's
 * implementation of read/write while keeping the same function signatures -
 * every controller/service in this codebase depends only on JsonStore<T>.
 */
import * as fs from 'fs';
import * as path from 'path';
import lockfile from 'proper-lockfile';

const DB_DIR = path.join(__dirname, '..', 'database');

if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

/** Per-file promise chain to serialize operations within this process. */
const fileQueues = new Map<string, Promise<unknown>>();

function enqueue<T>(filePath: string, task: () => Promise<T>): Promise<T> {
  const previous = fileQueues.get(filePath) ?? Promise.resolve();
  const next = previous.then(task, task);
  // Store a settled-agnostic promise so one rejection doesn't wedge the queue.
  fileQueues.set(
    filePath,
    next.then(
      () => undefined,
      () => undefined
    )
  );
  return next;
}

function ensureFileExists(filePath: string, defaultValue: unknown): void {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(defaultValue, null, 2), 'utf-8');
  }
}

async function atomicWrite(filePath: string, data: unknown): Promise<void> {
  const tmpPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  const serialized = JSON.stringify(data, null, 2);
  await fs.promises.writeFile(tmpPath, serialized, 'utf-8');
  await fs.promises.rename(tmpPath, filePath);
}

export class JsonStore<T> {
  private readonly filePath: string;
  private readonly defaultValue: T;

  constructor(fileName: string, defaultValue: T) {
    this.filePath = path.join(DB_DIR, fileName);
    this.defaultValue = defaultValue;
    ensureFileExists(this.filePath, defaultValue);
  }

  getPath(): string {
    return this.filePath;
  }

  /** Read the full contents of the JSON file. */
  async read(): Promise<T> {
    return enqueue(this.filePath, async () => {
      try {
        const raw = await fs.promises.readFile(this.filePath, 'utf-8');
        if (!raw.trim()) return this.defaultValue;
        return JSON.parse(raw) as T;
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
          await atomicWrite(this.filePath, this.defaultValue);
          return this.defaultValue;
        }
        throw new Error(`Failed to read ${path.basename(this.filePath)}: ${(err as Error).message}`);
      }
    });
  }

  /** Overwrite the full contents of the JSON file, with cross-process locking. */
  async write(data: T): Promise<void> {
    return enqueue(this.filePath, async () => {
      ensureFileExists(this.filePath, this.defaultValue);
      let release: (() => Promise<void>) | undefined;
      try {
        release = await lockfile.lock(this.filePath, {
          retries: { retries: 10, minTimeout: 20, maxTimeout: 200 },
          stale: 5000,
        });
        await atomicWrite(this.filePath, data);
      } catch (err) {
        throw new Error(`Failed to write ${path.basename(this.filePath)}: ${(err as Error).message}`);
      } finally {
        if (release) await release();
      }
    });
  }

  /** Read-modify-write in a single serialized operation to avoid lost updates. */
  async update(mutator: (current: T) => T | Promise<T>): Promise<T> {
    return enqueue(this.filePath, async () => {
      ensureFileExists(this.filePath, this.defaultValue);
      let release: (() => Promise<void>) | undefined;
      try {
        release = await lockfile.lock(this.filePath, {
          retries: { retries: 10, minTimeout: 20, maxTimeout: 200 },
          stale: 5000,
        });
        const raw = await fs.promises.readFile(this.filePath, 'utf-8');
        const current = raw.trim() ? (JSON.parse(raw) as T) : this.defaultValue;
        const updated = await mutator(current);
        await atomicWrite(this.filePath, updated);
        return updated;
      } catch (err) {
        throw new Error(`Failed to update ${path.basename(this.filePath)}: ${(err as Error).message}`);
      } finally {
        if (release) await release();
      }
    });
  }

  /** Reset the file back to its default (empty) value. Used by Master Reset. */
  async reset(): Promise<void> {
    await this.write(this.defaultValue);
  }
}

export { DB_DIR };
