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

// Precomputed once so a "no account exists yet" lookup takes the same time as a real password check.
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

/**
 * Creates (or replaces) the single admin account with freshly generated credentials.
 * Returns the plaintext credentials — this is the only moment they are ever visible.
 */
export async function provisionAdmin(): Promise<{ loginId: string; password: string }> {
  const { loginId, password } = generateCredentials();
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const now = new Date().toISOString();

  await adminUserStore.write({
    id: uuid(),
    loginId,
    passwordHash,
    failedAttempts: 0,
    createdAt: now,
    updatedAt: now,
  });

  return { loginId, password };
}

/** Same as provisionAdmin, but with a caller-supplied loginId/password (e.g. a fixed one for local testing). */
export async function provisionAdminWithCredentials(
  loginId: string,
  password: string
): Promise<{ loginId: string; password: string }> {
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const now = new Date().toISOString();

  await adminUserStore.write({
    id: uuid(),
    loginId,
    passwordHash,
    failedAttempts: 0,
    createdAt: now,
    updatedAt: now,
  });

  return { loginId, password };
}

export async function adminExists(): Promise<boolean> {
  return (await adminUserStore.read()) !== null;
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
  const result = await adminUserStore.update(async (current) => {
    if (!current) {
      await bcrypt.compare(password, DUMMY_HASH);
      return current;
    }

    if (isLocked(current)) {
      return current;
    }

    const loginIdMatches = current.loginId === loginId.trim();
    const passwordMatches = await bcrypt.compare(password, current.passwordHash);

    if (!loginIdMatches || !passwordMatches) {
      return registerFailedAttempt(current);
    }

    return { ...current, failedAttempts: 0, lockedUntil: undefined, updatedAt: new Date().toISOString() };
  });

  if (!result) {
    throw AppError.unauthorized('Invalid login ID or password');
  }

  if (isLocked(result)) {
    const minutesLeft = Math.ceil((new Date(result.lockedUntil as string).getTime() - Date.now()) / 60000);
    throw AppError.locked(`Too many failed attempts. Try again in ${minutesLeft} minute(s).`);
  }

  if (result.failedAttempts > 0) {
    throw AppError.unauthorized('Invalid login ID or password');
  }

  return result;
}
