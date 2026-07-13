import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import { adminUserStore } from '../database/repositories';
import { AdminUser } from '../types';
import { AppError } from '../utils/errors';

const BCRYPT_ROUNDS = 12;
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;

const LOGIN_ID_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous chars (0/O, 1/I)
const PASSWORD_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%^&*';

// Precomputed once so a "no such login id" lookup takes the same time as a real password check.
const DUMMY_HASH = bcrypt.hashSync('dummy-password-for-constant-time-comparison', BCRYPT_ROUNDS);

function randomString(length: number, alphabet: string): string {
  let out = '';
  for (let i = 0; i < length; i++) {
    out += alphabet[crypto.randomInt(alphabet.length)];
  }
  return out;
}

/** Generates a brand-new random login id + password pair. Plaintext password is never persisted. */
export function generateCredentials(): { loginId: string; password: string } {
  const loginId = `HJ-${randomString(6, LOGIN_ID_CHARS)}`;
  const password = randomString(20, PASSWORD_CHARS);
  return { loginId, password };
}

export async function findAdminByLoginId(loginId: string): Promise<AdminUser | undefined> {
  const all = await adminUserStore.read();
  return all.find((a) => a.loginId === loginId);
}

export async function listAdmins(): Promise<Array<{ id: string; loginId: string; createdAt: string }>> {
  const all = await adminUserStore.read();
  return all.map((a) => ({ id: a.id, loginId: a.loginId, createdAt: a.createdAt }));
}

/**
 * Adds a brand-new tenant with freshly generated credentials. Retries on the
 * astronomically unlikely chance of a loginId collision.
 * Returns the plaintext credentials — this is the only moment they are ever visible.
 */
export async function provisionNewAdmin(): Promise<{ loginId: string; password: string }> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const { loginId, password } = generateCredentials();
    if (await findAdminByLoginId(loginId)) continue;

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const now = new Date().toISOString();
    await adminUserStore.update((current) => [
      ...current,
      { id: uuid(), loginId, passwordHash, failedAttempts: 0, createdAt: now, updatedAt: now },
    ]);
    return { loginId, password };
  }
  throw new Error('Failed to generate a unique login id after several attempts');
}

export class LoginIdTakenError extends Error {
  constructor(loginId: string) {
    super(`Login ID "${loginId}" is already in use`);
  }
}

/**
 * Creates a tenant with a caller-supplied loginId/password, or rotates the password
 * of an existing one with that loginId when `allowRotate` is true.
 */
export async function provisionAdminWithCredentials(
  loginId: string,
  password: string,
  allowRotate: boolean
): Promise<{ loginId: string; password: string; rotated: boolean }> {
  const existing = await findAdminByLoginId(loginId);
  if (existing && !allowRotate) {
    throw new LoginIdTakenError(loginId);
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const now = new Date().toISOString();

  await adminUserStore.update((current) => {
    const index = current.findIndex((a) => a.loginId === loginId);
    if (index === -1) {
      return [...current, { id: uuid(), loginId, passwordHash, failedAttempts: 0, createdAt: now, updatedAt: now }];
    }
    const next = [...current];
    next[index] = { ...next[index], passwordHash, failedAttempts: 0, lockedUntil: undefined, updatedAt: now };
    return next;
  });

  return { loginId, password, rotated: Boolean(existing) };
}

function registerFailedAttempt(current: AdminUser): AdminUser {
  const failedAttempts = current.failedAttempts + 1;
  const lockedUntil =
    failedAttempts >= MAX_FAILED_ATTEMPTS ? new Date(Date.now() + LOCKOUT_MS).toISOString() : undefined;
  return { ...current, failedAttempts, lockedUntil, updatedAt: new Date().toISOString() };
}

function isLocked(admin: AdminUser): boolean {
  return Boolean(admin.lockedUntil && new Date(admin.lockedUntil) > new Date());
}

/**
 * Verifies credentials with lockout after repeated failures.
 * The mutator never throws (MongoStore.update rewraps mutator errors as generic 500s),
 * so all pass/fail decisions are made by inspecting the returned record afterwards.
 */
export async function verifyLogin(loginId: string, password: string): Promise<AdminUser> {
  const trimmedLoginId = loginId.trim();
  let matchedId: string | undefined;

  const all = await adminUserStore.update(async (current) => {
    const index = current.findIndex((a) => a.loginId === trimmedLoginId);

    if (index === -1) {
      await bcrypt.compare(password, DUMMY_HASH);
      return current;
    }

    const target = current[index];
    matchedId = target.id;

    if (isLocked(target)) {
      return current;
    }

    const passwordMatches = await bcrypt.compare(password, target.passwordHash);
    const next = [...current];
    next[index] = passwordMatches
      ? { ...target, failedAttempts: 0, lockedUntil: undefined, updatedAt: new Date().toISOString() }
      : registerFailedAttempt(target);
    return next;
  });

  if (!matchedId) {
    throw AppError.unauthorized('Invalid login ID or password');
  }

  const result = all.find((a) => a.id === matchedId) as AdminUser;

  if (isLocked(result)) {
    const minutesLeft = Math.ceil((new Date(result.lockedUntil as string).getTime() - Date.now()) / 60000);
    throw AppError.locked(`Too many failed attempts. Try again in ${minutesLeft} minute(s).`);
  }

  if (result.failedAttempts > 0) {
    throw AppError.unauthorized('Invalid login ID or password');
  }

  return result;
}
