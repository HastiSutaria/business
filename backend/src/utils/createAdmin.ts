/**
 * Provisions logins. There is no sign-up flow — this script is the only way a
 * login is ever created. Each login is a fully independent tenant: its own
 * clients, transactions, settlements, settings, everything.
 *
 *   npm run create-admin                                     -> adds ONE new tenant with random credentials
 *   npm run create-admin -- --login-id=acme --password=Test@1234           -> adds a tenant with fixed credentials (fails if taken)
 *   npm run create-admin -- --login-id=acme --password=NewPass1! --force   -> rotates that tenant's password
 */
import dotenv from 'dotenv';
dotenv.config();

import { LoginIdTakenError, provisionAdminWithCredentials, provisionNewAdmin } from '../services/auth.service';
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

  if ((loginId && !password) || (!loginId && password)) {
    // eslint-disable-next-line no-console
    console.error('Both --login-id and --password must be supplied together.');
    await closeDatabaseConnection();
    process.exit(1);
    return;
  }

  try {
    const credentials =
      loginId && password
        ? await provisionAdminWithCredentials(loginId, password, force)
        : { ...(await provisionNewAdmin()), rotated: false };

    // eslint-disable-next-line no-console
    console.log(
      `\n${credentials.rotated ? 'Password rotated' : 'New login provisioned'}. Store these credentials now — the password will not be shown again:\n`
    );
    // eslint-disable-next-line no-console
    console.log(`  Login ID: ${credentials.loginId}`);
    // eslint-disable-next-line no-console
    console.log(`  Password: ${credentials.password}\n`);
  } catch (err) {
    if (err instanceof LoginIdTakenError) {
      // eslint-disable-next-line no-console
      console.error(`${err.message}. Re-run with --force to rotate its password instead.`);
      await closeDatabaseConnection();
      process.exit(1);
      return;
    }
    throw err;
  }

  await closeDatabaseConnection();
}

run()
  .then(() => process.exit(0))
  .catch(async (err) => {
    await closeDatabaseConnection();
    // eslint-disable-next-line no-console
    console.error('Failed to provision login:', err);
    process.exit(1);
  });
