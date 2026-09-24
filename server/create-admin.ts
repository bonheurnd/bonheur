import { DatabaseSync } from 'node:sqlite';
import bcrypt from 'bcryptjs';
import path from 'path';
import fs from 'fs';

const DB_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DB_DIR, 'lalumiere.db');

if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const db = new DatabaseSync(DB_PATH);

// Process CLI arguments:
// tsx server/create-admin.ts [email] [password] [name] [role]
const args = process.argv.slice(2);
const emailArg = args[0] || process.env.ADMIN_EMAIL;
const passwordArg = args[1] || process.env.ADMIN_PASSWORD;
const nameArg = args[2] || 'Choir Administrator';
const roleArg = args[3] || 'super_admin';

function displayAdmins() {
  console.log('\n--- Current Administrative Users ---');
  const admins = db.prepare(`
    SELECT id, name, email, role, is_disabled, created_at
    FROM users
    WHERE role IN ('super_admin', 'admin', 'content_admin', 'moderator')
    ORDER BY created_at ASC
  `).all() as any[];

  if (admins.length === 0) {
    console.log('No admin users found.');
  } else {
    for (const a of admins) {
      console.log(`- [${a.role.toUpperCase()}] ${a.name} <${a.email}> (Disabled: ${a.is_disabled ? 'YES' : 'NO'})`);
    }
  }
  console.log('------------------------------------\n');
}

if (!emailArg || !passwordArg) {
  console.log('Usage: npm run create:admin <email> <password> [name] [role]');
  console.log('Example: npm run create:admin admin@lalumierechoir.rw "LaLumiere@2026" "Super Admin" super_admin');
  displayAdmins();
  process.exit(0);
}

const cleanEmail = emailArg.trim().toLowerCase();
if (!cleanEmail.includes('@') || passwordArg.length < 6) {
  console.error('Error: A valid email and a password of at least 6 characters are required.');
  process.exit(1);
}

const validRoles = ['super_admin', 'admin', 'content_admin', 'moderator'];
const selectedRole = validRoles.includes(roleArg) ? roleArg : 'super_admin';

const hash = bcrypt.hashSync(passwordArg, 10);
const existingUser = db.prepare('SELECT id, name, email, role FROM users WHERE LOWER(TRIM(email)) = ?').get(cleanEmail) as any;

if (existingUser) {
  db.prepare(`
    UPDATE users
    SET password_hash = ?, role = ?, is_disabled = 0, name = COALESCE(?, name)
    WHERE id = ?
  `).run(hash, selectedRole, nameArg, existingUser.id);

  console.log(`[SUCCESS] Admin user updated successfully!`);
  console.log(`  Email: ${cleanEmail}`);
  console.log(`  Role:  ${selectedRole}`);
  console.log(`  ID:    ${existingUser.id}`);
} else {
  const newId = `usr_admin_${Date.now()}`;
  db.prepare(`
    INSERT INTO users (id, name, email, password_hash, role, phone, is_disabled)
    VALUES (?, ?, ?, ?, ?, '', 0)
  `).run(newId, nameArg, cleanEmail, hash, selectedRole);

  console.log(`[SUCCESS] New Admin user created successfully!`);
  console.log(`  Email: ${cleanEmail}`);
  console.log(`  Role:  ${selectedRole}`);
  console.log(`  ID:    ${newId}`);
}

displayAdmins();
