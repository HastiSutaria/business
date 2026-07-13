/**
 * Provisions the single admin login ID + password. There is no sign-up flow —
 * this script is the only way an admin account is created.
 * Run again with --force to rotate credentials (invalidates the previous ones).
 *
 *   npm run create-admin                                     # random credentials, only if none exist
 *   npm run create-admin -- --force                          # regenerate random credentials
 *   npm run create-admin -- --login-id=user --password=test1234 --force   # fixed credentials (still hashed)
 */
import dotenv from 'dotenv';
dotenv.config();

import { adminExists, provisionAdmin, provisionAdminWithCredentials } from '../services/auth.service';
import { connectToDatabase, closeDatabaseConnection } from './mongoClient';

function readFlag(name: string): string | undefined {
  const match = process.argv.find((arg) => arg.startsWith(`--${name}=`));
  return match?.slice(name.length + 3);
}

async function run(): Promise<void> {
  await connectToDatabase();

  const force = process.argv.includes('--force');
  const loginId = readFlag('login-id');
  const password = readFlag('password');

  if (!force && (await adminExists())) {
    // eslint-disable-next-line no-console
    console.log('An admin account already exists. Re-run with --force to rotate credentials.');
    await closeDatabaseConnection();
    return;
  }

  if ((loginId && !password) || (!loginId && password)) {
    // eslint-disable-next-line no-console
    console.error('Both --login-id and --password must be supplied together.');
    await closeDatabaseConnection();
    process.exit(1);
    return;
  }

  const credentials =
    loginId && password ? await provisionAdminWithCredentials(loginId, password) : await provisionAdmin();

  // eslint-disable-next-line no-console
  console.log('\nAdmin account provisioned. Store these credentials now — the password will not be shown again:\n');
  // eslint-disable-next-line no-console
  console.log(`  Login ID: ${credentials.loginId}`);
  // eslint-disable-next-line no-console
  console.log(`  Password: ${credentials.password}\n`);

  await closeDatabaseConnection();
}

run()
  .then(() => process.exit(0))
  .catch(async (err) => {
    await closeDatabaseConnection();
    // eslint-disable-next-line no-console
    console.error('Failed to provision admin account:', err);
    process.exit(1);
  });
