import dotenv from 'dotenv';
dotenv.config();

import { createApp } from './app';
import { connectToDatabase } from './utils/mongoClient';

const PORT = Number(process.env.PORT ?? 5000);

async function start(): Promise<void> {
  await connectToDatabase();

  const app = createApp();

  const server = app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`Gold & Silver Trading API listening on http://localhost:${PORT}`);
  });

  function shutdown(signal: string): void {
    // eslint-disable-next-line no-console
    console.log(`\nReceived ${signal}, shutting down gracefully...`);
    server.close(() => process.exit(0));
  }

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

start().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Failed to start server:', err);
  process.exit(1);
});
