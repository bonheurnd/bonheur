import path from 'path';
import fs from 'fs';
import { DatabaseSync } from 'node:sqlite';
import bcrypt from 'bcryptjs';

const DB_DIR = path.join(process.cwd(), 'data');
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const dbPath = path.join(DB_DIR, 'lalumiere.db');

export interface StatementWrapper {
  all(...args: any[]): any[];
  get(...args: any[]): any;
  run(...args: any[]): { changes: number | bigint; lastInsertRowid: number | bigint };
}

export interface DbWrapper {
  exec(sql: string): void;
  pragma(sql: string): void;
  prepare(sql: string): StatementWrapper;
}

const rawDbInstance = new DatabaseSync(dbPath);
rawDbInstance.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;');

export const db: DbWrapper = {
  exec(sql: string) {
    return rawDbInstance.exec(sql);
  },
  pragma(sql: string) {
    if (typeof (rawDbInstance as any).pragma === 'function') {
      return (rawDbInstance as any).pragma(sql);
    }
    return rawDbInstance.exec(`PRAGMA ${sql};`);
  },
  prepare(sql: string): StatementWrapper {
    const stmt = rawDbInstance.prepare(sql);
    return {
      all(...args: any[]) {
        return stmt.all(...args);
      },
      get(...args: any[]) {
        return stmt.get(...args);
      },
      run(...args: any[]) {
        return stmt.run(...args);
      }
    };
  }
};

export function initDatabase() {
  db.exec(`
    -- 1. Roles
    CREATE TABLE IF NOT EXISTS roles (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      description TEXT
    );

    -- 2. Users
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      phone TEXT,
      role TEXT NOT NULL DEFAULT 'supporter',
      avatar_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (role) REFERENCES roles(id)
    );

    -- 3. Song Categories
    CREATE TABLE IF NOT EXISTS song_categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      slug TEXT NOT NULL UNIQUE,
      description TEXT,
      display_order INTEGER DEFAULT 0
    );

    -- 4. Songs
    CREATE TABLE IF NOT EXISTS songs (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      song_number TEXT,
      composer TEXT,
      category_id TEXT,
      release_status TEXT NOT NULL DEFAULT 'released', -- 'released', 'unreleased'
      release_date TEXT,
      description TEXT,
      cover_image_url TEXT,
      access_password_hash TEXT, -- Hashed password for unreleased protected songs
      views_count INTEGER DEFAULT 0,
      shares_count INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES song_categories(id) ON DELETE SET NULL
    );

    -- 5. Lyrics
    CREATE TABLE IF NOT EXISTS lyrics (
      id TEXT PRIMARY KEY,
      song_id TEXT NOT NULL UNIQUE,
      content TEXT NOT NULL,
      language TEXT DEFAULT 'rw', -- 'rw' (Kinyarwanda), 'fr', 'en'
      solfa_notation TEXT, -- Tonic Sol-fa notation if available
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (song_id) REFERENCES songs(id) ON DELETE CASCADE
    );

    -- 6. Audio Tracks
    CREATE TABLE IF NOT EXISTS audio_tracks (
      id TEXT PRIMARY KEY,
      song_id TEXT NOT NULL,
      title TEXT NOT NULL,
      track_type TEXT NOT NULL DEFAULT 'full_song', -- 'full_song', 'melody', 'instrumental', 'vocal_guide', 'practice_track'
      audio_url TEXT NOT NULL,
      duration_seconds INTEGER DEFAULT 0,
      file_size_bytes INTEGER DEFAULT 0,
      plays_count INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (song_id) REFERENCES songs(id) ON DELETE CASCADE
    );

    -- 7. Favorites
    CREATE TABLE IF NOT EXISTS favorites (
      user_id TEXT NOT NULL,
      song_id TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id, song_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (song_id) REFERENCES songs(id) ON DELETE CASCADE
    );

    -- 8. Comments
    CREATE TABLE IF NOT EXISTS comments (
      id TEXT PRIMARY KEY,
      song_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      parent_id TEXT,
      content TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'visible', -- 'visible', 'hidden', 'flagged'
      likes_count INTEGER DEFAULT 0,
      reports_count INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (song_id) REFERENCES songs(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE
    );

    -- 9. Comment Likes & Reports
    CREATE TABLE IF NOT EXISTS comment_reactions (
      user_id TEXT NOT NULL,
      comment_id TEXT NOT NULL,
      reaction_type TEXT NOT NULL, -- 'like', 'report'
      reason TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id, comment_id, reaction_type),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE
    );

    -- 10. Payment Providers
    CREATE TABLE IF NOT EXISTS payment_providers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL, -- 'MTN Mobile Money', 'Airtel Money'
      slug TEXT NOT NULL UNIQUE,
      is_enabled INTEGER DEFAULT 1,
      environment TEXT DEFAULT 'sandbox', -- 'sandbox', 'production'
      api_endpoint TEXT,
      merchant_account_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- 11. Payment Transactions & Donations
    CREATE TABLE IF NOT EXISTS payment_transactions (
      id TEXT PRIMARY KEY,
      internal_reference TEXT UNIQUE NOT NULL,
      provider_reference TEXT,
      user_id TEXT,
      donor_name TEXT,
      donor_phone TEXT NOT NULL,
      amount REAL NOT NULL,
      currency TEXT NOT NULL DEFAULT 'RWF',
      provider_slug TEXT NOT NULL,
      donation_purpose TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'successful', 'failed', 'cancelled'
      failure_reason TEXT,
      is_anonymous INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY (provider_slug) REFERENCES payment_providers(slug)
    );

    -- 12. Announcements
    CREATE TABLE IF NOT EXISTS announcements (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      category TEXT DEFAULT 'general', -- 'rehearsal', 'event', 'worship', 'general'
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- 13. Notifications
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      type TEXT NOT NULL, -- 'song_release', 'announcement', 'donation_receipt', 'community'
      link TEXT,
      is_read INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- 14. Protected Content Access Grants (Logs of who unlocked unreleased songs)
    CREATE TABLE IF NOT EXISTS protected_content_access (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      song_id TEXT NOT NULL,
      unlocked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY (song_id) REFERENCES songs(id) ON DELETE CASCADE
    );

    -- 15. Branding Settings
    CREATE TABLE IF NOT EXISTS branding_settings (
      id TEXT PRIMARY KEY,
      main_logo_url TEXT,
      app_icon_url TEXT,
      splash_logo_url TEXT,
      light_logo_url TEXT,
      dark_logo_url TEXT,
      banner_image_url TEXT,
      primary_color TEXT DEFAULT '#1e3a8a', -- Deep royal choir blue
      secondary_color TEXT DEFAULT '#d97706', -- Warm gold
      accent_color TEXT DEFAULT '#2563eb', -- Vibrant worship blue
      background_color TEXT DEFAULT '#f8fafc',
      text_color TEXT DEFAULT '#0f172a',
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- 16. App Settings
    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      description TEXT
    );

    -- 16b. Choir Leadership & Contact Information
    CREATE TABLE IF NOT EXISTS leadership_contacts (
      id TEXT PRIMARY KEY,
      leader_name TEXT NOT NULL,
      leader_phone TEXT NOT NULL,
      leader_whatsapp TEXT NOT NULL,
      leader_title_rw TEXT DEFAULT 'Umuyobozi wa Korali',
      leader_title_en TEXT DEFAULT 'Choir Leader / President',
      secretary_name TEXT NOT NULL,
      secretary_phone TEXT NOT NULL,
      secretary_whatsapp TEXT NOT NULL,
      secretary_title_rw TEXT DEFAULT 'Umunyamabanga wa Korali',
      secretary_title_en TEXT DEFAULT 'Choir Secretary',
      general_phone TEXT NOT NULL,
      general_whatsapp TEXT NOT NULL,
      general_email TEXT NOT NULL,
      address TEXT NOT NULL,
      city TEXT NOT NULL DEFAULT 'Kigali',
      country TEXT NOT NULL DEFAULT 'Rwanda',
      weekday_range TEXT DEFAULT 'Kuwa Mbere – Kuwa Gatanu (Monday–Friday)',
      weekday_hours TEXT NOT NULL,
      weekend_range TEXT DEFAULT 'Kuwa Gatandatu – Ku Cyumweru (Saturday–Sunday)',
      weekend_hours TEXT NOT NULL,
      contact_description_rw TEXT,
      contact_description_en TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_by TEXT
    );

    -- 17. Audit Logs
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      action TEXT NOT NULL,
      resource TEXT NOT NULL,
      details TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- 18. Images & Media Library
    CREATE TABLE IF NOT EXISTS images (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'general', -- 'song_cover', 'choir_photo', 'event_image', 'logo', 'general'
      file_url TEXT NOT NULL,
      file_size_bytes INTEGER DEFAULT 0,
      mime_type TEXT,
      original_filename TEXT,
      width INTEGER,
      height INTEGER,
      created_by TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      is_deleted INTEGER DEFAULT 0
    );

    -- 19. Events
    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      event_date TEXT NOT NULL,
      location TEXT,
      image_url TEXT,
      status TEXT NOT NULL DEFAULT 'published', -- 'draft', 'published'
      created_by TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      is_deleted INTEGER DEFAULT 0
    );

    -- 20. Documents & PDFs
    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      file_url TEXT NOT NULL,
      file_size_bytes INTEGER DEFAULT 0,
      category TEXT DEFAULT 'sheet_music', -- 'sheet_music', 'rehearsal_guide', 'program', 'bulletin'
      status TEXT NOT NULL DEFAULT 'published', -- 'draft', 'published'
      created_by TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      is_deleted INTEGER DEFAULT 0
    );

    -- 21. Content Articles (Choir news, devotional messages, videos, important notices)
    CREATE TABLE IF NOT EXISTS content_articles (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL, -- 'choir_news', 'devotional', 'video', 'notice'
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      media_url TEXT,
      published_date TEXT,
      status TEXT NOT NULL DEFAULT 'published', -- 'draft', 'published'
      created_by TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      is_deleted INTEGER DEFAULT 0
    );

    -- 22. Activity Logs
    CREATE TABLE IF NOT EXISTS activity_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      user_name TEXT,
      user_role TEXT,
      action TEXT NOT NULL,
      resource TEXT NOT NULL,
      resource_id TEXT,
      details TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Indexes for high performance
    CREATE INDEX IF NOT EXISTS idx_songs_status ON songs(release_status);
    CREATE INDEX IF NOT EXISTS idx_songs_category ON songs(category_id);
    CREATE INDEX IF NOT EXISTS idx_audio_song ON audio_tracks(song_id);
    CREATE INDEX IF NOT EXISTS idx_comments_song ON comments(song_id);
    CREATE INDEX IF NOT EXISTS idx_transactions_status ON payment_transactions(status);
    CREATE INDEX IF NOT EXISTS idx_transactions_user ON payment_transactions(user_id);
  `);

  // Safe migrations for table alterations
  function safeAddColumn(table: string, columnDef: string) {
    try {
      db.prepare(`ALTER TABLE ${table} ADD COLUMN ${columnDef}`).run();
    } catch (e) {
      // Column exists
    }
  }

  safeAddColumn('users', 'is_disabled INTEGER DEFAULT 0');
  safeAddColumn('users', 'choir_voice TEXT'); // 'Soprano', 'Alto', 'Tenor', 'Bass', 'Musician', 'Director'
  safeAddColumn('users', 'choir_role TEXT'); // 'Member', 'Voice Leader', 'Pianist', 'Conductor', etc.
  safeAddColumn('users', 'bio TEXT');
  safeAddColumn('users', 'share_directory INTEGER DEFAULT 1'); // 1 = opted-in to member directory, 0 = opted-out
  safeAddColumn('users', 'share_phone INTEGER DEFAULT 1'); // 1 = share phone with members, 0 = hide phone
  safeAddColumn('users', 'share_email INTEGER DEFAULT 1'); // 1 = share email with members, 0 = hide email
  safeAddColumn('users', 'share_whatsapp INTEGER DEFAULT 1'); // 1 = share whatsapp with members, 0 = hide whatsapp
  safeAddColumn('songs', "status TEXT DEFAULT 'published'");
  safeAddColumn('songs', 'is_deleted INTEGER DEFAULT 0');
  safeAddColumn('songs', 'deleted_at DATETIME');
  safeAddColumn('songs', 'created_by TEXT');
  safeAddColumn('audio_tracks', 'file_size_bytes INTEGER DEFAULT 0');
  safeAddColumn('audio_tracks', 'mime_type TEXT');
  safeAddColumn('audio_tracks', 'original_filename TEXT');
  safeAddColumn('audio_tracks', 'created_by TEXT');
  safeAddColumn('audio_tracks', 'is_deleted INTEGER DEFAULT 0');
  safeAddColumn('announcements', 'image_url TEXT');
  safeAddColumn('announcements', "status TEXT DEFAULT 'published'");
  safeAddColumn('announcements', 'created_by TEXT');
  safeAddColumn('announcements', 'updated_at DATETIME DEFAULT CURRENT_TIMESTAMP');
  safeAddColumn('announcements', 'is_deleted INTEGER DEFAULT 0');
  safeAddColumn('comments', 'is_deleted INTEGER DEFAULT 0');
  safeAddColumn('documents', 'song_id TEXT');
  safeAddColumn('documents', "doc_type TEXT DEFAULT 'sheet_music'");
  safeAddColumn('content_articles', "type TEXT DEFAULT 'article'");
  safeAddColumn('content_articles', 'published_at DATETIME DEFAULT CURRENT_TIMESTAMP');

  try {
    db.prepare("UPDATE content_articles SET published_at = COALESCE(published_at, published_date, created_at) WHERE published_at IS NULL").run();
  } catch (e) {
    // Ignore migration catch
  }

  // Seed default roles
  const insertRole = db.prepare(`
    INSERT OR IGNORE INTO roles (id, name, description)
    VALUES (?, ?, ?)
  `);
  insertRole.run('super_admin', 'Super Admin', 'Full administrative control over songs, media, branding, payments, users, and roles');
  insertRole.run('content_admin', 'Content Admin', 'Can add/edit songs, upload audio/images, and manage events, announcements and documents');
  insertRole.run('moderator', 'Moderator', 'Can view, approve, hide, and delete user comments and report abusive users');
  insertRole.run('normal_user', 'Normal User', 'Standard registered worshipper and listener');
  insertRole.run('admin', 'Administrator', 'Full administrative control');
  insertRole.run('choir_member', 'Choir Member', 'La Lumiere Choir official member with access to rehearsal materials');
  insertRole.run('supporter', 'Supporter', 'Congregant, worshipper, and supporter');

  // Synchronize official Administrator accounts & credentials
  const envAdminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const envAdminPassword = process.env.ADMIN_PASSWORD?.trim();
  const primaryAdminPassword = envAdminPassword || 'Amasezerano1';
  const primaryAdminHash = bcrypt.hashSync(primaryAdminPassword, 10);

  const adminTargetAccounts = [
    { email: 'lalumierechoir@gmail.com', name: 'La Lumiere Choir Admin', phone: '+250788000000' },
    { email: 'nd.bonheur1@gmail.com', name: 'Bonheur Admin', phone: '+250788000000' },
    { email: 'admin@lalumierechoir.rw', name: 'Choir Super Admin', phone: '+250788000000' },
  ];

  if (envAdminEmail && !adminTargetAccounts.some(a => a.email === envAdminEmail)) {
    adminTargetAccounts.push({
      email: envAdminEmail,
      name: 'Configured Administrator',
      phone: '+250788000000'
    });
  }

  for (const acc of adminTargetAccounts) {
    const existing = db.prepare('SELECT id, role FROM users WHERE LOWER(TRIM(email)) = ?').get(acc.email) as any;
    if (existing) {
      db.prepare(`
        UPDATE users
        SET role = 'super_admin', is_disabled = 0, password_hash = ?
        WHERE id = ?
      `).run(primaryAdminHash, existing.id);
    } else {
      const customId = `usr_admin_${acc.email.replace(/[^a-zA-Z0-9]/g, '_')}`;
      db.prepare(`
        INSERT INTO users (id, name, email, password_hash, phone, role, is_disabled)
        VALUES (?, ?, ?, ?, ?, 'super_admin', 0)
      `).run(customId, acc.name, acc.email, primaryAdminHash, acc.phone);
    }
  }

  // Seed initial Content Admin for testing
  const existingContentAdmin = db.prepare('SELECT id FROM users WHERE email = ?').get('content@lalumierechoir.rw');
  if (!existingContentAdmin) {
    const defaultContentHash = bcrypt.hashSync('Content@2026', 10);
    db.prepare(`
      INSERT INTO users (id, name, email, password_hash, phone, role)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      'usr_content_admin',
      'Media Content Lead',
      'content@lalumierechoir.rw',
      defaultContentHash,
      '+250788223344',
      'content_admin'
    );
  }

  // Seed initial Moderator for testing
  const existingModerator = db.prepare('SELECT id FROM users WHERE email = ?').get('moderator@lalumierechoir.rw');
  if (!existingModerator) {
    const defaultModHash = bcrypt.hashSync('Moderator@2026', 10);
    db.prepare(`
      INSERT INTO users (id, name, email, password_hash, phone, role)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      'usr_moderator',
      'Choir Moderator',
      'moderator@lalumierechoir.rw',
      defaultModHash,
      '+250788334455',
      'moderator'
    );
  }

  // Seed initial Normal User for testing
  const existingNormalUser = db.prepare('SELECT id FROM users WHERE email = ?').get('user@lalumierechoir.rw');
  if (!existingNormalUser) {
    const defaultUserHash = bcrypt.hashSync('User@2026', 10);
    db.prepare(`
      INSERT INTO users (id, name, email, password_hash, phone, role)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      'usr_normal_user',
      'Grace Mutoni',
      'user@lalumierechoir.rw',
      defaultUserHash,
      '+250788556677',
      'normal_user'
    );
  }

  // Seed initial Member users for testing the secure directory
  const choirSeedMembers = [
    {
      id: 'usr_member_epiphani',
      name: 'HAGENAYO Epiphani',
      email: 'epiphani@lalumierechoir.rw',
      phone: '+250783484524',
      role: 'choir_member',
      choir_voice: 'Tenor',
      choir_role: 'Choir Leader / President',
      bio: 'Leading worship and choir operations with grace and devotion.',
      share_directory: 1,
      share_phone: 1,
      share_email: 1,
      share_whatsapp: 1,
    },
    {
      id: 'usr_member_david',
      name: 'David Niyonkuru',
      email: 'member@lalumierechoir.rw',
      phone: '+250788112233',
      role: 'choir_member',
      choir_voice: 'Bass',
      choir_role: 'Bass Section Lead',
      bio: 'Gospel worshipper and bass section leader since 2018.',
      share_directory: 1,
      share_phone: 1,
      share_email: 1,
      share_whatsapp: 1,
    },
    {
      id: 'usr_member_grace',
      name: 'Grace Mutoni',
      email: 'grace.mutoni@lalumierechoir.rw',
      phone: '+250788556677',
      role: 'choir_member',
      choir_voice: 'Soprano',
      choir_role: 'Soloist & Soprano',
      bio: 'Singing with joy to the Lord at ADEPR Nyanza.',
      share_directory: 1,
      share_phone: 1,
      share_email: 1,
      share_whatsapp: 1,
    },
    {
      id: 'usr_member_esther',
      name: 'Esther Uwase',
      email: 'esther.uwase@lalumierechoir.rw',
      phone: '+250788778899',
      role: 'choir_member',
      choir_voice: 'Alto',
      choir_role: 'Alto Section',
      bio: 'Passionate about worship harmonies and evangelism.',
      share_directory: 1,
      share_phone: 1,
      share_email: 1,
      share_whatsapp: 1,
    },
    {
      id: 'usr_member_samuel',
      name: 'Samuel Mugisha',
      email: 'samuel.pianist@lalumierechoir.rw',
      phone: '+250788445566',
      role: 'choir_member',
      choir_voice: 'Musician',
      choir_role: 'Keyboardist & Arranger',
      bio: 'Praise pianist and acoustic arrangements.',
      share_directory: 1,
      share_phone: 1,
      share_email: 1,
      share_whatsapp: 1,
    },
    {
      id: 'usr_member_private',
      name: 'Patrick Habimana',
      email: 'patrick.private@lalumierechoir.rw',
      phone: '+250788990011',
      role: 'choir_member',
      choir_voice: 'Tenor',
      choir_role: 'Choir Member',
      bio: 'Member wishing to keep contact details private.',
      share_directory: 0, // OPTED OUT of directory
      share_phone: 0,
      share_email: 0,
      share_whatsapp: 0,
    }
  ];

  const defaultMemberPassHash = bcrypt.hashSync('Worship@2026', 10);
  for (const m of choirSeedMembers) {
    const existing = db.prepare('SELECT id FROM users WHERE LOWER(TRIM(email)) = ?').get(m.email) as any;
    if (existing) {
      db.prepare(`
        UPDATE users
        SET choir_voice = COALESCE(choir_voice, ?),
            choir_role = COALESCE(choir_role, ?),
            bio = COALESCE(bio, ?),
            share_directory = COALESCE(share_directory, ?),
            share_phone = COALESCE(share_phone, ?),
            share_email = COALESCE(share_email, ?),
            share_whatsapp = COALESCE(share_whatsapp, ?),
            role = 'choir_member'
        WHERE id = ?
      `).run(m.choir_voice, m.choir_role, m.bio, m.share_directory, m.share_phone, m.share_email, m.share_whatsapp, existing.id);
    } else {
      db.prepare(`
        INSERT INTO users (id, name, email, password_hash, phone, role, choir_voice, choir_role, bio, share_directory, share_phone, share_email, share_whatsapp)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(m.id, m.name, m.email, defaultMemberPassHash, m.phone, m.role, m.choir_voice, m.choir_role, m.bio, m.share_directory, m.share_phone, m.share_email, m.share_whatsapp);
    }
  }

  // Security Hardening: Ensure all accounts in the database use valid bcrypt password hashes
  try {
    const rawPasswordUsers = db.prepare(`
      SELECT id, email, password_hash
      FROM users
      WHERE password_hash IS NOT NULL AND password_hash NOT LIKE '$2%'
    `).all() as any[];

    for (const u of rawPasswordUsers) {
      if (u.password_hash && typeof u.password_hash === 'string') {
        const upgradedHash = bcrypt.hashSync(u.password_hash, 10);
        db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(upgradedHash, u.id);
        console.log(`[Security] Automatically upgraded legacy password to bcrypt hash for user: ${u.email}`);
      }
    }
  } catch (err) {
    console.warn('[Security] Notice during password hash audit:', err);
  }

  // Seed default Song Categories
  const categories = [
    { id: 'cat_gushimisha', name: 'Gusingiza & Gushimira (Praise & Thanksgiving)', slug: 'praise-thanksgiving', order: 1 },
    { id: 'cat_kwizera', name: 'Kwizera & Ibyiringiro (Faith & Hope)', slug: 'faith-hope', order: 2 },
    { id: 'cat_umusalaba', name: 'Umusalaba & Agakiza (The Cross & Salvation)', slug: 'salvation-cross', order: 3 },
    { id: 'cat_umwuka', name: 'Umwuka Wera (Holy Spirit)', slug: 'holy-spirit', order: 4 },
    { id: 'cat_ivugabutumwa', name: 'Ivugabutumwa (Evangelism)', slug: 'evangelism', order: 5 },
    { id: 'cat_gusenga', name: 'Gusenga & Kwinginga (Prayer & Supplication)', slug: 'prayer', order: 6 },
  ];
  const insertCat = db.prepare('INSERT OR IGNORE INTO song_categories (id, name, slug, display_order) VALUES (?, ?, ?, ?)');
  categories.forEach(c => insertCat.run(c.id, c.name, c.slug, c.order));

  // Seed initial payment providers (MTN Mobile Money Rwanda and Airtel Money Rwanda)
  const insertProvider = db.prepare('INSERT OR IGNORE INTO payment_providers (id, name, slug, is_enabled, environment, api_endpoint) VALUES (?, ?, ?, ?, ?, ?)');
  insertProvider.run('prov_mtn_rw', 'MTN Mobile Money Rwanda', 'mtn-momo', 1, 'sandbox', 'https://sandbox.momodeveloper.mtn.com');
  insertProvider.run('prov_airtel_rw', 'Airtel Money Rwanda', 'airtel-money', 1, 'sandbox', 'https://openapiuat.airtel.africa');

  // Seed initial Branding Settings
  const existingBranding = db.prepare('SELECT id FROM branding_settings WHERE id = ?').get('default_branding');
  if (!existingBranding) {
    db.prepare(`
      INSERT INTO branding_settings (id, main_logo_url, app_icon_url, splash_logo_url, primary_color, secondary_color, accent_color)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      'default_branding',
      '', // Admin will be able to upload or replace official logo
      '',
      '',
      '#1e3a8a',
      '#d97706',
      '#2563eb'
    );
  }

  // Seed initial App Settings
  const defaultSettings = [
    { key: 'choir_name', value: 'La Lumiere Choir', description: 'Official choir name' },
    { key: 'church_affiliation', value: 'ADEPR Nyanza, Kicukiro District, Kigali, Rwanda', description: 'Church and district affiliation' },
    { key: 'welcome_message', value: 'Sing, worship, listen, and support our ministry.', description: 'Home welcome message' },
    { key: 'contact_phone', value: '+250 788 000 000', description: 'Contact phone number' },
    { key: 'contact_email', value: 'info@lalumierechoir.rw', description: 'Contact email' },
    { key: 'about_story', value: 'La Lumiere Choir is a renowned gospel choir based at ADEPR Nyanza in Kicukiro District, Kigali, Rwanda. Dedicated to spreading the Gospel of Jesus Christ through anointed worship, inspiring harmonies, and soul-stirring hymns in Kinyarwanda and other languages.', description: 'Choir story & background' },
    { key: 'mission_statement', value: 'To illuminate souls with the true Light of Christ through spiritual songs, evangelism, and selfless fellowship.', description: 'Mission statement' },
    { key: 'vision_statement', value: 'A generation transformed and anchored in genuine praise, worship, and devotion to God across Rwanda and the nations.', description: 'Vision statement' }
  ];
  const insertSetting = db.prepare('INSERT OR IGNORE INTO app_settings (key, value, description) VALUES (?, ?, ?)');
  defaultSettings.forEach(s => insertSetting.run(s.key, s.value, s.description));

  // Seed initial Leadership Contacts
  const existingContacts = db.prepare('SELECT id FROM leadership_contacts WHERE id = ?').get('default_contacts');
  if (!existingContacts) {
    db.prepare(`
      INSERT INTO leadership_contacts (
        id,
        leader_name, leader_phone, leader_whatsapp, leader_title_rw, leader_title_en,
        secretary_name, secretary_phone, secretary_whatsapp, secretary_title_rw, secretary_title_en,
        general_phone, general_whatsapp, general_email,
        address, city, country,
        weekday_range, weekday_hours, weekend_range, weekend_hours,
        contact_description_rw, contact_description_en
      ) VALUES (
        'default_contacts',
        '[INSERT NAME]', '[INSERT PHONE NUMBER]', '[INSERT WHATSAPP NUMBER]', 'Umuyobozi wa Korali', 'Choir Leader / President',
        '[INSERT NAME]', '[INSERT PHONE NUMBER]', '[INSERT WHATSAPP NUMBER]', 'Umunyamabanga wa Korali', 'Choir Secretary',
        '[INSERT PHONE NUMBER]', '[INSERT WHATSAPP NUMBER]', '[INSERT EMAIL ADDRESS]',
        '[INSERT CHOIR ADDRESS]', 'Kigali', 'Rwanda',
        'Kuwa Mbere – Kuwa Gatanu (Monday–Friday)', '[INSERT HOURS]',
        'Kuwa Gatandatu – Ku Cyumweru (Saturday–Sunday)', '[INSERT HOURS]',
        'Ufite ikibazo, igitekerezo, cyangwa ushaka kumenya byinshi kuri La Lumiere Choir? Twandikire cyangwa utuvugishe ukoresheje bumwe mu buryo bukurikira.',
        'Do you have questions, feedback, or need information about La Lumiere Choir? Get in touch with our leadership team using the options below.'
      )
    `).run();
  }

  // Seed the 4 official categories and 92 authentic songs from LA_LUMIERE_CHORALE_SONGS_APP_READY.json
  seedOfficialSongs();
}

function seedOfficialSongs() {
  // Ensure songs table has display_order column if not present
  try {
    db.prepare('ALTER TABLE songs ADD COLUMN display_order INTEGER DEFAULT 0').run();
  } catch (e) {
    // Already exists
  }

  // 1. Ensure exactly the 4 official categories exist with their exact names
  const officialCategories = [
    { id: 'cat_agakiza', name: 'AGAKIZA', slug: 'agakiza', order: 1, description: "Indirimbo z'Agakiza n'Urukundo rwa Yesu" },
    { id: 'cat_ijuru', name: 'IJURU', slug: 'ijuru', order: 2, description: "Indirimbo z'Ijuru, Ubugingo bw'iteka n'Amasezerano" },
    { id: 'cat_gushima', name: 'GUSHIMA', slug: 'gushima', order: 3, description: "Indirimbo zo Gushima no Guhimbaza Imana" },
    { id: 'cat_kwizera', name: 'KWIZERA', slug: 'kwizera', order: 4, description: "Indirimbo zo Kwizera n'Ubutwari mu Mwami" },
  ];

  const upsertCat = db.prepare(`
    INSERT INTO song_categories (id, name, slug, description, display_order)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      slug = excluded.slug,
      description = excluded.description,
      display_order = excluded.display_order
  `);

  officialCategories.forEach(c => upsertCat.run(c.id, c.name, c.slug, c.description, c.order));

  // Remove any obsolete placeholder categories
  db.prepare(`
    DELETE FROM song_categories
    WHERE id NOT IN ('cat_agakiza', 'cat_ijuru', 'cat_gushima', 'cat_kwizera')
  `).run();

  // 2. Check current songs
  const countRow = db.prepare('SELECT COUNT(*) as count FROM songs').get() as { count: number };
  const hasLegacyPlaceholder = db.prepare("SELECT 1 FROM songs WHERE id = 'song_1' AND title LIKE '%The Love of Jesus%'").get();

  if (countRow.count !== 92 || hasLegacyPlaceholder) {
    console.log('[Songbook] Importing official 92 songs from LA_LUMIERE_CHORALE_SONGS_APP_READY.json...');

    // Clear previous songs and associated tables
    db.prepare('DELETE FROM lyrics').run();
    db.prepare('DELETE FROM audio_tracks').run();
    db.prepare('DELETE FROM favorites').run();
    db.prepare('DELETE FROM comments').run();
    db.prepare('DELETE FROM songs').run();

    let jsonPath = path.join(process.cwd(), 'LA_LUMIERE_CHORALE_SONGS_APP_READY.json');
    if (!fs.existsSync(jsonPath)) {
      jsonPath = path.join(process.cwd(), 'src', 'data', 'LA_LUMIERE_CHORALE_SONGS_APP_READY.json');
    }

    if (fs.existsSync(jsonPath)) {
      const rawSongs = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

      const insertSong = db.prepare(`
        INSERT INTO songs (id, title, song_number, composer, category_id, release_status, release_date, description, display_order)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const insertLyrics = db.prepare(`
        INSERT INTO lyrics (id, song_id, content, language)
        VALUES (?, ?, ?, ?)
      `);

      for (const s of rawSongs) {
        insertSong.run(
          s.id,
          s.title,
          String(s.song_number),
          'La Lumiere Choir',
          s.category_id,
          'released',
          '2016-03-08',
          `Indirimbo ya ${s.song_number} muri ${s.category_name} - Chorale La Lumiere`,
          s.global_number || 0
        );
        insertLyrics.run(`lyr_${s.id}`, s.id, s.lyrics, 'rw');
      }

      console.log(`[Songbook] Successfully imported ${rawSongs.length} official songs into database!`);
    } else {
      console.error('[Songbook] Error: LA_LUMIERE_CHORALE_SONGS_APP_READY.json file not found!');
    }
  }

  // Seed sample announcements
  const insertAnn = db.prepare('INSERT OR IGNORE INTO announcements (id, title, content, category) VALUES (?, ?, ?, ?)');
  insertAnn.run(
    'ann_1',
    'Amateraniro yo Gushima Imana & Ikoraniro ry\'Indirimbo',
    'La Lumiere Choir iramenyesha abakunzi bose b\'indirimbo zo guhimbaza Imana ko hazaba igiterane kidasanzwe kuri ADEPR Nyanza, Kicukiro District. Murahawe ikaze!',
    'event'
  );
  insertAnn.run(
    'ann_2',
    'Imyiteguro y\'Album Nshya ya 2026',
    'Imirimo yo gufata amajwi n\'amashusho y\'album nshya irakomeje muri studio. Turashimira abaterankunga bose bakomeje gushyigikira uyu murimo.',
    'rehearsal'
  );

  // Seed sample comments
  const insertComm = db.prepare('INSERT OR IGNORE INTO comments (id, song_id, user_id, content, likes_count) VALUES (?, ?, ?, ?, ?)');
  insertComm.run(
    'comm_1',
    'song_agakiza_01',
    'usr_member_default',
    'Iyi ndirimbo \'URUKUNDO\' iranyura cyane! Imana ikomeze guha umugisha La Lumiere Choir!',
    12
  );

  // Seed sample events if empty
  const eventsCount = db.prepare('SELECT COUNT(*) as count FROM events').get() as { count: number };
  if (eventsCount.count === 0) {
    const insertEvent = db.prepare(`
      INSERT INTO events (id, title, description, event_date, location, image_url, status, created_by)
      VALUES (?, ?, ?, ?, ?, ?, 'published', 'usr_admin_default')
    `);
    insertEvent.run(
      'evt_1',
      'Igiterane cyo kuramya no guhimbaza (Praise & Worship Night)',
      'Ijoro ridasanzwe ryo kuramya Imana no guhimbaza hamwe na La Lumiere Choir n\'andi matsinda y\'indirimbo ku rusengero rwa ADEPR Nyanza.',
      '2026-10-15 17:00:00',
      'ADEPR Nyanza Sanctuary, Kicukiro',
      'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&auto=format&fit=crop&q=80'
    );
    insertEvent.run(
      'evt_2',
      'Imyitozo rusange yo Kwitegura Pasika (Easter Rehearsal)',
      'Imyitozo y\'abaririmbyi bose ba La Lumiere Choir yo gutunganya indirimbo nshya zizakoreshwa mu minsi mikuru.',
      '2026-09-30 14:00:00',
      'La Lumiere Music Room, ADEPR Nyanza',
      'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&auto=format&fit=crop&q=80'
    );
  }

  // Seed sample documents if empty
  const docsCount = db.prepare('SELECT COUNT(*) as count FROM documents').get() as { count: number };
  if (docsCount.count === 0) {
    const insertDoc = db.prepare(`
      INSERT INTO documents (id, title, description, file_url, file_size_bytes, category, status, created_by)
      VALUES (?, ?, ?, ?, ?, ?, 'published', 'usr_admin_default')
    `);
    insertDoc.run(
      'doc_1',
      'Amanota y\'Indirimbo: Urukundo rwa Yesu (Sol-fa Sheet Music)',
      'Amanota nyakuri y\'ijwi rya mbere, irya kabiri, irya gatatu n\'irya kane (SATB) y\'indirimbo Urukundo rwa Yesu.',
      'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      245000,
      'sheet_music'
    );
    insertDoc.run(
      'doc_2',
      'Amabwiriza y\'Abaririmbyi ba La Lumiere (Choir Ministry Code of Conduct)',
      'Igitabo gikubiyemo amahame, imyitwarire n\'inshingano z\'umuririmbyi wa La Lumiere Choir ADEPR Nyanza.',
      'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      512000,
      'rehearsal_guide'
    );
  }

  // Seed sample content articles (news, devotional, video, notice)
  const articlesCount = db.prepare('SELECT COUNT(*) as count FROM content_articles').get() as { count: number };
  if (articlesCount.count === 0) {
    const insertArt = db.prepare(`
      INSERT INTO content_articles (id, type, title, content, media_url, published_date, status, created_by)
      VALUES (?, ?, ?, ?, ?, ?, 'published', 'usr_admin_default')
    `);
    insertArt.run(
      'art_1',
      'choir_news',
      'La Lumiere Choir irashimira Imana ku myaka 15 y\'umurimo w\'ivugabutumwa',
      'Urugendo rw\'uburirimbyi bwa La Lumiere Choir rwatangiye kera kuri ADEPR Nyanza. Uyu munsi turashima Imana ku mirimo ikomeye yakoreye mu mitima y\'abantu binyuze mu ndirimbo z\'umwuka.',
      'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&auto=format&fit=crop&q=80',
      '2026-09-10'
    );
    insertArt.run(
      'art_2',
      'devotional',
      'Guhimbaza Imana mu mwuka no mu kuri - Ijambo ry\'Umunsi',
      'Yohana 4:24 - Imana ni Umwuka, n\'abayisenga bakwiriye kuyisengera mu mwuka no mu kuri. Indirimbo y\'umunyamwuka iratandukana n\'umuziki usanzwe kuko ifite imbaraga zo kubohora imitima.',
      '',
      '2026-09-18'
    );
    insertArt.run(
      'art_3',
      'video',
      'Videwo: Amashusho y\'indirimbo \'Urukundo rwa Yesu\' (Official Video)',
      'Reba amashusho yose y\'indirimbo yashyizwe hanze ku rubuga rwa YouTube rwa La Lumiere Choir Rwanda.',
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      '2026-09-01'
    );
    insertArt.run(
      'art_4',
      'notice',
      'Icyitonderwa ku bagize korali: Isaha yo kugera ku rusengero ku cyumweru',
      'Abaririmbyi bose basabwe kugera kuri ADEPR Nyanza bitarenze saa mbili n\'igice (08:30 AM) zo mu gitondo kugira ngo basengere hamwe mbere y\'amateraniro.',
      '',
      '2026-09-19'
    );
  }

  // Seed sample images if empty
  const imagesCount = db.prepare('SELECT COUNT(*) as count FROM images').get() as { count: number };
  if (imagesCount.count === 0) {
    const insertImg = db.prepare(`
      INSERT INTO images (id, title, category, file_url, file_size_bytes, mime_type, created_by)
      VALUES (?, ?, ?, ?, ?, ?, 'usr_admin_default')
    `);
    insertImg.run(
      'img_1',
      'Choir Ministry Banner',
      'choir_photo',
      'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&auto=format&fit=crop&q=80',
      420000,
      'image/jpeg'
    );
    insertImg.run(
      'img_2',
      'Sanctuary Worship Event Cover',
      'event_image',
      'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&auto=format&fit=crop&q=80',
      380000,
      'image/jpeg'
    );
  }
}

// Activity Logging helper
export function logActivity(
  userId: string | undefined,
  userName: string | undefined,
  userRole: string | undefined,
  action: string,
  resource: string,
  resourceId?: string,
  details?: string
) {
  try {
    const id = 'act_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    db.prepare(`
      INSERT INTO activity_logs (id, user_id, user_name, user_role, action, resource, resource_id, details)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      userId || 'system',
      userName || 'System Admin',
      userRole || 'super_admin',
      action,
      resource,
      resourceId || null,
      details || null
    );
  } catch (err) {
    console.error('Failed to log activity:', err);
  }
}

// Setup function to initialize the first admin account hash if it does not already exist
export function setupFirstAdminAccount(options: {
  email?: string;
  password?: string;
  name?: string;
  phone?: string;
  role?: string;
  forceUpdate?: boolean;
} = {}) {
  const configuredEmail = (options.email || process.env.ADMIN_EMAIL || 'admin@lalumierechoir.rw').trim().toLowerCase();
  const rawPassword = options.password || process.env.ADMIN_PASSWORD || 'Amasezerano1';
  const adminName = (options.name || 'Choir Super Admin').trim();
  const adminPhone = (options.phone || '+250788000000').trim();
  const adminRole = options.role || 'super_admin';

  const existingTarget = db
    .prepare('SELECT id, name, email, password_hash, role, is_disabled FROM users WHERE LOWER(TRIM(email)) = ?')
    .get(configuredEmail) as any;

  if (existingTarget) {
    const isBcrypt =
      existingTarget.password_hash &&
      (existingTarget.password_hash.startsWith('$2a$') ||
        existingTarget.password_hash.startsWith('$2b$') ||
        existingTarget.password_hash.startsWith('$2y$')) &&
      existingTarget.password_hash.length === 60;

    if (!isBcrypt || options.forceUpdate) {
      const bcryptHash = bcrypt.hashSync(rawPassword, 10);
      db.prepare(`
        UPDATE users
        SET password_hash = ?, role = ?, is_disabled = 0, name = COALESCE(?, name)
        WHERE id = ?
      `).run(bcryptHash, adminRole, adminName, existingTarget.id);

      console.log(`[Admin Setup] Initialized / upgraded bcrypt hash for admin "${configuredEmail}".`);
      return {
        initialized: true,
        action: 'updated',
        user: { id: existingTarget.id, email: configuredEmail, role: adminRole, name: adminName || existingTarget.name },
        message: `Admin account "${configuredEmail}" password hash successfully updated to bcrypt.`
      };
    }

    return {
      initialized: false,
      action: 'already_exists',
      user: { id: existingTarget.id, email: configuredEmail, role: existingTarget.role, name: existingTarget.name },
      message: `Admin account "${configuredEmail}" already exists with a verified bcrypt hash.`
    };
  }

  const bcryptHash = bcrypt.hashSync(rawPassword, 10);
  const newAdminId = `usr_admin_${Date.now()}`;

  db.prepare(`
    INSERT INTO users (id, name, email, password_hash, phone, role, is_disabled)
    VALUES (?, ?, ?, ?, ?, ?, 0)
  `).run(newAdminId, adminName, configuredEmail, bcryptHash, adminPhone, adminRole);

  console.log(`[Admin Setup] Successfully created first admin account "${configuredEmail}" (${adminRole}) with bcrypt hash.`);

  return {
    initialized: true,
    action: 'created',
    user: { id: newAdminId, email: configuredEmail, role: adminRole, name: adminName },
    message: `First admin account "${configuredEmail}" initialized with secure bcrypt hash.`
  };
}

export const initializeFirstAdminAccount = setupFirstAdminAccount;

// Call database initializer
initDatabase();
