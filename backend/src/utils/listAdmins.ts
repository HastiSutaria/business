/** Lists provisioned login IDs (never passwords). Run with: npm run list-users */
import dotenv from 'dotenv';
dotenv.config();

import { listAdmins } from '../services/auth.service';
import { connectToDatabase, closeDatabaseConnection } from './mongoClient';

async function run(): Promise<void> {
  await connectToDatabase();
  const admins = await listAdmins();

  if (admins.length === 0) {
    // eslint-disable-next-line no-console
    console.log('No logins provisioned yet. Run: npm run create-admin');
  } else {
    // eslint-disable-next-line no-console
    console.log(`\n${admins.length} login(s):\n`);
    for (const admin of admins) {
      // eslint-disable-next-line no-console
      console.log(`  ${admin.loginId}  (id: ${admin.id}, created: ${admin.createdAt})`);
    }
    console.log('');
  }

  await closeDatabaseConnection();
}

run()
  .then(() => process.exit(0))
  .catch(async (err) => {
    await closeDatabaseConnection();
    // eslint-disable-next-line no-console
    console.error('Failed to list logins:', err);
    process.exit(1);
  });
