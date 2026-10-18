import fs from 'fs';
import path from 'path';
import { DatabaseSync } from 'node:sqlite';

const DB_DIR = process.env.DATA_DIR || (process.env.DATABASE_PATH ? path.dirname(process.env.DATABASE_PATH) : path.join(process.cwd(), 'data'));
const DB_PATH = process.env.DATABASE_PATH || path.join(DB_DIR, 'lalumiere.db');
const BACKUP_DIR = path.join(DB_DIR, 'backups');

export function createDatabaseBackup(customLabel?: string): { success: boolean; backupPath: string; sizeBytes: number } {
  if (!fs.existsSync(DB_PATH)) {
    throw new Error(`Database file not found at ${DB_PATH}`);
  }

  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  // 1. Open and flush WAL journal to ensure main DB file is complete
  try {
    const db = new DatabaseSync(DB_PATH);
    db.exec('PRAGMA wal_checkpoint(TRUNCATE);');
  } catch (err) {
    console.warn('[Backup] Notice during WAL checkpoint:', err);
  }

  // 2. Generate backup filename
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const label = customLabel ? `_${customLabel}` : '';
  const backupFileName = `lalumiere_backup_${timestamp}${label}.db`;
  const backupPath = path.join(BACKUP_DIR, backupFileName);

  // 3. Copy file synchronously
  fs.copyFileSync(DB_PATH, backupPath);

  // 4. Verify integrity of the backup file
  const backupDb = new DatabaseSync(backupPath);
  const integrityResult = backupDb.prepare('PRAGMA integrity_check').get() as any;
  const isOk = integrityResult && (integrityResult.integrity_check === 'ok' || integrityResult['integrity_check'] === 'ok');

  if (!isOk) {
    throw new Error(`Backup integrity check failed: ${JSON.stringify(integrityResult)}`);
  }

  const stat = fs.statSync(backupPath);

  // 5. Query verified counts
  const usersCount = (backupDb.prepare('SELECT COUNT(*) as c FROM users').get() as any)?.c || 0;
  const songsCount = (backupDb.prepare('SELECT COUNT(*) as c FROM songs').get() as any)?.c || 0;
  const lyricsCount = (backupDb.prepare('SELECT COUNT(*) as c FROM lyrics').get() as any)?.c || 0;
  const eventsCount = (backupDb.prepare('SELECT COUNT(*) as c FROM events').get() as any)?.c || 0;
  const donationsCount = (backupDb.prepare('SELECT COUNT(*) as c FROM donation_transactions').get() as any)?.c || 0;

  console.log(`\n==================================================`);
  console.log(`  LA LUMIERE CHOIR DATABASE BACKUP VERIFIED`);
  console.log(`==================================================`);
  console.log(`Backup Destination: ${backupPath}`);
  console.log(`File Size:          ${(stat.size / 1024).toFixed(1)} KB`);
  console.log(`Verified Records:`);
  console.log(`  - Users / Members: ${usersCount}`);
  console.log(`  - Songs:           ${songsCount}`);
  console.log(`  - Lyrics:          ${lyricsCount}`);
  console.log(`  - Events:          ${eventsCount}`);
  console.log(`  - Donations:       ${donationsCount}`);
  console.log(`Status:             INTEGRITY VERIFIED (PRAGMA integrity_check: ok)`);
  console.log(`==================================================\n`);

  return {
    success: true,
    backupPath,
    sizeBytes: stat.size,
  };
}

// CLI execution
if (process.argv[1] && process.argv[1].endsWith('backup-database.ts')) {
  try {
    const labelArg = process.argv[2];
    createDatabaseBackup(labelArg);
  } catch (err: any) {
    console.error('[Backup Failed]:', err.message);
    process.exit(1);
  }
}
