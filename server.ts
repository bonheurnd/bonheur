// Ensure tsx runtime __dirname='.' polyfill does not interfere with Vite/Rolldown config loaders and plugins
if (typeof (globalThis as any).__dirname !== 'undefined' && (globalThis as any).__dirname === '.') {
  delete (globalThis as any).__dirname;
}

import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import multer from 'multer';
import { db, initDatabase, logActivity } from './server/db.js';
import {
  generateToken,
  generatePasswordResetToken,
  verifyPasswordResetToken,
  verifyToken,
  requireAuth,
  requireAdmin,
  requireSuperAdmin,
  requireContentAdmin,
  requireModerator,
  optionalAuth,
  isUserAdmin,
  hashPassword,
  comparePassword,
  comparePasswordSync,
  verifyAdminCredentials,
  setupFirstAdminAccount,
  initializeFirstAdminAccount,
  logAuthDiagnostic,
  authDiagnosticMiddleware,
  AuthRequest
} from './server/auth.js';
import { initiateRwandaPayment, verifyPaymentTransaction, validateRwandaPhoneNumber } from './server/momo.js';
import { sendPasswordResetEmail, isEmailServiceConfigured, getEmailConfig } from './server/email.js';

// Initialize DB schema & seeds
initDatabase();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Set global security & CORS headers exposing Content-Type for all API endpoints
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, X-Requested-With, X-Client-Timestamp');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Type, Content-Length, Authorization, X-Requested-With');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Ensure upload directory exists
const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Multer for media uploads (logos, song covers, audio files, documents)
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const sanitizedBase = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 40);
    const uniqueName = `${sanitizedBase}-${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`;
    cb(null, uniqueName);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max
});

// Serve uploaded files statically
app.use('/uploads', express.static(UPLOAD_DIR));

// -------------------------------------------------------------
// REAL-TIME EVENT STREAMING (Server-Sent Events / SSE)
// -------------------------------------------------------------
const eventStreamClients = new Set<express.Response>();

export function broadcastRealtimeEvent(eventType: string, payload: any) {
  const message = `event: ${eventType}\ndata: ${JSON.stringify({
    type: eventType,
    data: payload,
    timestamp: new Date().toISOString()
  })}\n\n`;

  for (const client of eventStreamClients) {
    try {
      client.write(message);
    } catch {
      eventStreamClients.delete(client);
    }
  }
}

app.get('/api/events/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  // Send initial connection handshake
  res.write(`event: connected\ndata: ${JSON.stringify({ status: 'connected', time: new Date().toISOString() })}\n\n`);
  eventStreamClients.add(res);

  // Keep-alive heartbeat every 20 seconds
  const timer = setInterval(() => {
    try {
      res.write(': heartbeat\n\n');
    } catch {
      clearInterval(timer);
      eventStreamClients.delete(res);
    }
  }, 20000);

  req.on('close', () => {
    clearInterval(timer);
    eventStreamClients.delete(res);
  });
});

// -------------------------------------------------------------
// PUBLIC BRANDING & SETTINGS API
// -------------------------------------------------------------
app.get('/api/branding', (req, res) => {
  try {
    const branding = db.prepare('SELECT * FROM branding_settings WHERE id = ?').get('default_branding') as any;
    const settingsRows = db.prepare('SELECT key, value FROM app_settings').all() as any[];
    const settings: Record<string, string> = {};
    settingsRows.forEach(r => { settings[r.key] = r.value; });

    res.json({
      branding: branding || {},
      settings
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch branding settings' });
  }
});

// -------------------------------------------------------------
// PUBLIC CHOIR LEADERSHIP CONTACT INFORMATION API
// -------------------------------------------------------------
app.get('/api/contacts', (req, res) => {
  try {
    let contacts = db.prepare('SELECT * FROM leadership_contacts WHERE id = ?').get('default_contacts') as any;
    if (!contacts) {
      contacts = {
        id: 'default_contacts',
        leader_name: '[INSERT NAME]',
        leader_phone: '[INSERT PHONE NUMBER]',
        leader_whatsapp: '[INSERT WHATSAPP NUMBER]',
        leader_title_rw: 'Umuyobozi wa Korali',
        leader_title_en: 'Choir Leader / President',
        secretary_name: '[INSERT NAME]',
        secretary_phone: '[INSERT PHONE NUMBER]',
        secretary_whatsapp: '[INSERT WHATSAPP NUMBER]',
        secretary_title_rw: 'Umunyamabanga wa Korali',
        secretary_title_en: 'Choir Secretary',
        general_phone: '[INSERT PHONE NUMBER]',
        general_whatsapp: '[INSERT WHATSAPP NUMBER]',
        general_email: '[INSERT EMAIL ADDRESS]',
        address: '[INSERT CHOIR ADDRESS]',
        city: 'Kigali',
        country: 'Rwanda',
        weekday_range: 'Kuwa Mbere – Kuwa Gatanu (Monday–Friday)',
        weekday_hours: '[INSERT HOURS]',
        weekend_range: 'Kuwa Gatandatu – Ku Cyumweru (Saturday–Sunday)',
        weekend_hours: '[INSERT HOURS]',
        contact_description_rw: 'Ufite ikibazo, igitekerezo, cyangwa ushaka kumenya byinshi kuri La Lumiere Choir? Twandikire cyangwa utuvugishe ukoresheje bumwe mu buryo bukurikira.',
        contact_description_en: 'Do you have questions, feedback, or need information about La Lumiere Choir? Get in touch with our leadership team using the options below.',
      };
    }

    res.json(contacts);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch choir leadership contact details' });
  }
});

// -------------------------------------------------------------
// HEALTH CHECK
// -------------------------------------------------------------
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'La Lumiere Choir API',
    uptime: process.uptime(),
  });
});

// -------------------------------------------------------------
// SECURE CHOIR MEMBER DIRECTORY API
// -------------------------------------------------------------
app.get('/api/members', requireAuth, (req: AuthRequest, res) => {
  try {
    const { voice, search } = req.query;
    const currentUserId = req.user!.id;
    const isAdminUser = isUserAdmin(req.user?.role);

    let query = `
      SELECT id, name, email, phone, role, avatar_url, choir_voice, choir_role, bio,
             share_directory, share_phone, share_email, share_whatsapp, created_at
      FROM users
      WHERE (is_disabled = 0 OR is_disabled IS NULL)
    `;
    const params: any[] = [];

    if (!isAdminUser) {
      query += ` AND (share_directory = 1 OR id = ?)`;
      params.push(currentUserId);
    }

    if (voice && typeof voice === 'string' && voice !== 'all') {
      query += ` AND LOWER(choir_voice) = LOWER(?)`;
      params.push(voice);
    }

    if (search && typeof search === 'string' && search.trim()) {
      const term = `%${search.trim()}%`;
      query += ` AND (name LIKE ? OR choir_voice LIKE ? OR choir_role LIKE ? OR bio LIKE ?)`;
      params.push(term, term, term, term);
    }

    query += ` ORDER BY CASE WHEN id = ? THEN 0 ELSE 1 END, name ASC`;
    params.push(currentUserId);

    const rawMembers = db.prepare(query).all(...params) as any[];

    const members = rawMembers.map(m => {
      const isSelf = m.id === currentUserId;
      const canViewFull = isSelf || isAdminUser;

      return {
        id: m.id,
        name: m.name,
        role: m.role,
        avatar_url: m.avatar_url || '',
        choir_voice: m.choir_voice || 'Choir Member',
        choir_role: m.choir_role || (m.role === 'super_admin' || m.role === 'admin' ? 'Choir Leadership' : 'Member'),
        bio: m.bio || '',
        created_at: m.created_at,
        share_directory: Boolean(m.share_directory ?? 1),
        share_phone: Boolean(m.share_phone ?? 1),
        share_email: Boolean(m.share_email ?? 1),
        share_whatsapp: Boolean(m.share_whatsapp ?? 1),
        phone: (canViewFull || m.share_phone) ? (m.phone || '') : '',
        email: (canViewFull || m.share_email) ? m.email : '',
        whatsapp: (canViewFull || m.share_whatsapp) ? (m.phone || '') : '',
        has_phone: Boolean(m.phone && (canViewFull || m.share_phone)),
        has_email: Boolean(m.email && (canViewFull || m.share_email)),
        has_whatsapp: Boolean(m.phone && (canViewFull || m.share_whatsapp)),
        is_self: isSelf
      };
    });

    res.json({
      members,
      total: members.length,
      current_user: {
        id: currentUserId,
        is_admin: isAdminUser
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch member directory' });
  }
});

app.put('/api/members/privacy', requireAuth, (req: AuthRequest, res) => {
  try {
    const { share_directory, share_phone, share_email, share_whatsapp } = req.body;
    db.prepare(`
      UPDATE users
      SET share_directory = CASE WHEN ? IS NOT NULL THEN ? ELSE share_directory END,
          share_phone = CASE WHEN ? IS NOT NULL THEN ? ELSE share_phone END,
          share_email = CASE WHEN ? IS NOT NULL THEN ? ELSE share_email END,
          share_whatsapp = CASE WHEN ? IS NOT NULL THEN ? ELSE share_whatsapp END,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      share_directory !== undefined ? (share_directory ? 1 : 0) : null,
      share_directory !== undefined ? (share_directory ? 1 : 0) : null,
      share_phone !== undefined ? (share_phone ? 1 : 0) : null,
      share_phone !== undefined ? (share_phone ? 1 : 0) : null,
      share_email !== undefined ? (share_email ? 1 : 0) : null,
      share_email !== undefined ? (share_email ? 1 : 0) : null,
      share_whatsapp !== undefined ? (share_whatsapp ? 1 : 0) : null,
      share_whatsapp !== undefined ? (share_whatsapp ? 1 : 0) : null,
      req.user!.id
    );

    const updated = db.prepare(`
      SELECT id, name, email, phone, choir_voice, choir_role,
             share_directory, share_phone, share_email, share_whatsapp
      FROM users WHERE id = ?
    `).get(req.user!.id) as any;

    res.json({
      message: 'Igenzura ry\'umutekano n\'ibanga ryavuguruwe (Privacy settings updated)',
      privacy: {
        share_directory: Boolean(updated.share_directory),
        share_phone: Boolean(updated.share_phone),
        share_email: Boolean(updated.share_email),
        share_whatsapp: Boolean(updated.share_whatsapp)
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update privacy settings' });
  }
});

// -------------------------------------------------------------
// OFFICIAL SOCIAL MEDIA LINKS API
// -------------------------------------------------------------

// Helper to validate and normalize URL
function validateAndNormalizeUrl(rawUrl: string): { valid: boolean; normalized?: string; error?: string } {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { valid: false, error: 'URL is required' };
  }
  const trimmed = rawUrl.trim();
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { valid: false, error: 'Please enter a valid HTTP or HTTPS URL (Ugomba gukoresha https:// cyangwa http://)' };
    }
    return { valid: true, normalized: parsed.toString() };
  } catch (e) {
    return { valid: false, error: 'Please enter a valid social media URL (Uru rubuga si rwo, reba neza https://...)' };
  }
}

// Public: Get all enabled social media links ordered by display_order
app.get('/api/social-media', (_req, res) => {
  try {
    const links = db.prepare(`
      SELECT id, platform, display_name, url, icon, is_enabled, display_order, description
      FROM social_media_links
      WHERE is_enabled = 1
      ORDER BY display_order ASC, created_at ASC
    `).all();
    res.json(links);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to load social media links' });
  }
});

// Admin: Get all social media links (including disabled ones)
app.get('/api/admin/social-media', requireAdmin, (_req, res) => {
  try {
    const links = db.prepare(`
      SELECT id, platform, display_name, url, icon, is_enabled, display_order, description, created_at, updated_at
      FROM social_media_links
      ORDER BY display_order ASC, created_at ASC
    `).all();
    res.json(links);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to load admin social media links' });
  }
});

// Admin: Create new social media link
app.post('/api/admin/social-media', requireAdmin, (req: AuthRequest, res) => {
  try {
    const { platform, display_name, url, icon, is_enabled, display_order, description } = req.body;
    if (!platform || !display_name || !url) {
      return res.status(400).json({ error: 'Platform, display name, and URL are required' });
    }

    const valResult = validateAndNormalizeUrl(url);
    if (!valResult.valid) {
      return res.status(400).json({ error: valResult.error });
    }

    const id = 'soc_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const order = typeof display_order === 'number' ? display_order : 0;
    const enabled = is_enabled !== undefined ? (is_enabled ? 1 : 0) : 1;
    const platformClean = String(platform).trim().toLowerCase();
    const iconClean = icon ? String(icon).trim() : platformClean;

    db.prepare(`
      INSERT INTO social_media_links (id, platform, display_name, url, icon, is_enabled, display_order, description, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).run(id, platformClean, display_name.trim(), valResult.normalized, iconClean, enabled, order, description ? description.trim() : null);

    const created = db.prepare('SELECT * FROM social_media_links WHERE id = ?').get(id);
    res.status(201).json(created);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to create social media link' });
  }
});

// Admin: Update existing social media link
app.put('/api/admin/social-media/:id', requireAdmin, (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { platform, display_name, url, icon, is_enabled, display_order, description } = req.body;

    const existing = db.prepare('SELECT id FROM social_media_links WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Social media link not found' });
    }

    let normalizedUrl: string | undefined;
    if (url !== undefined) {
      const valResult = validateAndNormalizeUrl(url);
      if (!valResult.valid) {
        return res.status(400).json({ error: valResult.error });
      }
      normalizedUrl = valResult.normalized;
    }

    db.prepare(`
      UPDATE social_media_links
      SET platform = COALESCE(?, platform),
          display_name = COALESCE(?, display_name),
          url = COALESCE(?, url),
          icon = COALESCE(?, icon),
          is_enabled = CASE WHEN ? IS NOT NULL THEN ? ELSE is_enabled END,
          display_order = COALESCE(?, display_order),
          description = CASE WHEN ? IS NOT NULL THEN ? ELSE description END,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      platform !== undefined ? String(platform).trim().toLowerCase() : null,
      display_name !== undefined ? String(display_name).trim() : null,
      normalizedUrl ?? null,
      icon !== undefined ? String(icon).trim() : null,
      is_enabled !== undefined ? (is_enabled ? 1 : 0) : null,
      is_enabled !== undefined ? (is_enabled ? 1 : 0) : null,
      typeof display_order === 'number' ? display_order : null,
      description !== undefined ? description : null,
      description !== undefined ? description : null,
      id
    );

    const updated = db.prepare('SELECT * FROM social_media_links WHERE id = ?').get(id);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update social media link' });
  }
});

// Admin: Delete social media link
app.delete('/api/admin/social-media/:id', requireAdmin, (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const info = db.prepare('DELETE FROM social_media_links WHERE id = ?').run(id);
    if (info.changes === 0) {
      return res.status(404).json({ error: 'Social media link not found' });
    }
    res.json({ message: 'Social media link deleted successfully', id });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to delete social media link' });
  }
});

// Admin: Bulk Reorder social media links
app.post('/api/admin/social-media/reorder', requireAdmin, (req: AuthRequest, res) => {
  try {
    const { items } = req.body; // array of { id: string, display_order: number }
    if (!Array.isArray(items)) {
      return res.status(400).json({ error: 'Items array is required' });
    }

    db.exec('BEGIN TRANSACTION;');
    try {
      const updateStmt = db.prepare('UPDATE social_media_links SET display_order = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
      for (const item of items) {
        if (item.id && typeof item.display_order === 'number') {
          updateStmt.run(item.display_order, item.id);
        }
      }
      db.exec('COMMIT;');
    } catch (txErr) {
      db.exec('ROLLBACK;');
      throw txErr;
    }

    const updatedList = db.prepare(`
      SELECT id, platform, display_name, url, icon, is_enabled, display_order, description, created_at, updated_at
      FROM social_media_links
      ORDER BY display_order ASC, created_at ASC
    `).all();

    res.json({ success: true, links: updatedList });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to reorder social media links' });
  }
});


// -------------------------------------------------------------
// AUTHENTICATION ROUTES
// -------------------------------------------------------------
app.post('/api/auth/register', (req, res) => {
  try {
    const { name, email, password, phone } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Amazina, imeli n\'ijambo ry\'ibanga birakenewe (Name, email, and password required)' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Ijambo ry\'ibanga rigomba kugira byibuze inyuguti 6 (Password must be at least 6 characters)' });
    }

    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.trim().toLowerCase());
    if (existing) {
      return res.status(400).json({ error: 'Iyi imeli isanzwe ikoreshwa (Email already registered)' });
    }

    const userId = 'usr_' + Date.now();
    const hash = hashPassword(password);
    const userRole = 'supporter';

    db.prepare(`
      INSERT INTO users (id, name, email, password_hash, phone, role)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(userId, name.trim(), email.trim().toLowerCase(), hash, phone || '', userRole);

    const token = generateToken({ id: userId, email: email.trim().toLowerCase(), role: userRole, name: name.trim() });

    // Send welcome notification
    db.prepare(`
      INSERT INTO notifications (id, user_id, title, body, type, link)
      VALUES (?, ?, ?, ?, 'community', ?)
    `).run(
      'notif_' + Date.now(),
      userId,
      'Murakaza neza muri La Lumiere Choir!',
      'Urakoze kwiyandikisha. Ikaze mu muryango w\'abakunzi b\'indirimbo za La Lumiere Choir, ADEPR Nyanza.',
      '/songs'
    );

    res.status(201).json({
      message: 'Konte yafunguwe neza (Account created successfully)',
      token,
      user: { id: userId, name: name.trim(), email: email.trim().toLowerCase(), role: userRole, phone }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Habaye ikosa mu kwiyandikisha' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    logAuthDiagnostic(req, 'User Login');
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Imeli n\'ijambo ry\'ibanga birakenewe' });
    }

    const user = db.prepare('SELECT * FROM users WHERE LOWER(TRIM(email)) = ?').get(email.trim().toLowerCase()) as any;
    if (!user) {
      return res.status(401).json({ error: 'Imeli cyangwa ijambo ry\'ibanga si byo (Invalid email or password)' });
    }

    // Secure bcrypt hash comparison using bcrypt.compare()
    const { isMatch, needsRehash } = await comparePassword(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Imeli cyangwa ijambo ry\'ibanga si byo (Invalid email or password)' });
    }

    // Auto-upgrade legacy unhashed passwords to bcrypt
    if (needsRehash) {
      const upgradedHash = hashPassword(password);
      db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(upgradedHash, user.id);
    }

    const token = generateToken({ id: user.id, email: user.email, role: user.role, name: user.name });

    logActivity(user.id, user.name, user.role, 'USER_LOGIN', 'auth', user.id, `User ${user.email} logged in successfully`);

    res.json({
      message: 'Mwinjiye neza (Logged in successfully)',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        avatar_url: user.avatar_url
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Habaye ikosa mu kwinjira' });
  }
});

// Dedicated secure Admin Login endpoint
app.all('/api/admin/login', (req, res, next) => {
  if (req.method !== 'POST') {
    res.setHeader('Content-Type', 'application/json');
    return res.status(405).json({
      success: false,
      message: 'Uburyo bwo gusaba butemewe (Method Not Allowed). Please send a POST request with admin credentials.',
      error: 'Method Not Allowed'
    });
  }
  next();
});

app.post('/api/admin/login', async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  try {
    const diag = logAuthDiagnostic(req, 'Admin Login');
    const { email, password } = req.body || {};
    const clientTimestamp = req.headers['x-client-timestamp'] || new Date().toISOString();

    console.log(`[Admin Login Diagnostic] Received request at ${clientTimestamp}`);
    console.log(`[Admin Login Diagnostic] Headers: Content-Type="${req.headers['content-type']}", Accept="${req.headers['accept']}"`);

    if (!email || typeof email !== 'string' || !password) {
      console.warn('[Admin Login Diagnostic] Rejected: Missing email or password in request body.');
      return res.status(400).json({
        success: false,
        message: 'Imeli n\'ijambo ry\'ibanga birakenewe (Email and password required)',
        error: 'Imeli n\'ijambo ry\'ibanga birakenewe (Email and password required)',
        diagnostic: {
          code: 'MISSING_FIELDS',
          reason: 'Email or password missing from request body',
          hasEmail: Boolean(email),
          hasPassword: Boolean(password)
        }
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = db.prepare('SELECT * FROM users WHERE LOWER(TRIM(email)) = ?').get(cleanEmail) as any;

    if (!user) {
      console.warn(`[Admin Login Diagnostic] Rejected 401: Email "${cleanEmail}" does not exist in database.`);
      return res.status(401).json({
        success: false,
        message: 'Imeli cyangwa ijambo ry\'ibanga si byo (Invalid admin credentials)',
        error: 'Imeli cyangwa ijambo ry\'ibanga si byo (Invalid admin credentials)',
        diagnostic: {
          code: 'USER_NOT_FOUND',
          reason: 'Email is not registered in the system',
          emailSearched: cleanEmail,
          matchesEnvAdminEmail: diag.emailAnalysis.envMatch?.matchesEnvAdminEmail,
          configuredEnvEmail: diag.emailAnalysis.envMatch?.configuredEnvEmail,
          anomaliesDetected: {
            leadingSpace: diag.emailAnalysis.hasLeadingSpace,
            trailingSpace: diag.emailAnalysis.hasTrailingSpace,
            invisibleChars: diag.emailAnalysis.hasInvisibleChars
          }
        }
      });
    }

    // Ensure the stored Admin password is compared using bcrypt.compare()
    let isMatch = false;
    let needsRehash = false;

    if (user.password_hash) {
      const isBcrypt =
        (user.password_hash.startsWith('$2a$') || user.password_hash.startsWith('$2b$') || user.password_hash.startsWith('$2y$')) &&
        user.password_hash.length === 60;

      if (isBcrypt) {
        // Direct comparison using bcrypt.compare()
        isMatch = await bcrypt.compare(password, user.password_hash);
      } else {
        const comp = await comparePassword(password, user.password_hash);
        isMatch = comp.isMatch;
        needsRehash = comp.needsRehash;
      }
    }

    if (!isMatch) {
      console.warn(`[Admin Login Diagnostic] Rejected 401: Bcrypt password hash mismatch for "${cleanEmail}" (Role: ${user.role}).`);
      return res.status(401).json({
        success: false,
        message: 'Imeli cyangwa ijambo ry\'ibanga si byo (Invalid admin credentials)',
        error: 'Imeli cyangwa ijambo ry\'ibanga si byo (Invalid admin credentials)',
        diagnostic: {
          code: 'PASSWORD_MISMATCH',
          reason: 'Password does not match bcrypt hash in database',
          emailSearched: cleanEmail,
          accountRole: user.role,
          matchesEnvAdminEmail: diag.emailAnalysis.envMatch?.matchesEnvAdminEmail,
          configuredEnvEmail: diag.emailAnalysis.envMatch?.configuredEnvEmail
        }
      });
    }

    // Seamlessly upgrade legacy unhashed credentials to bcrypt hash
    if (needsRehash) {
      const upgradedHash = hashPassword(password);
      db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(upgradedHash, user.id);
      console.log(`[Admin Login Diagnostic] Automatically upgraded unhashed password to bcrypt hash for "${cleanEmail}".`);
    }

    if (user.is_disabled) {
      console.warn(`[Admin Login Diagnostic] Rejected 403: Account "${cleanEmail}" is disabled (is_disabled = 1).`);
      return res.status(403).json({
        success: false,
        message: 'Konti yawe yahagaritswe n\'ubuyobozi (Account has been disabled by administrator)',
        error: 'Konti yawe yahagaritswe n\'ubuyobozi (Account has been disabled by administrator)',
        diagnostic: {
          code: 'ACCOUNT_DISABLED',
          reason: 'User account has been disabled in database',
          emailSearched: cleanEmail,
          accountRole: user.role
        }
      });
    }

    if (!isUserAdmin(user.role)) {
      console.warn(`[Admin Login Diagnostic] Rejected 403: User "${cleanEmail}" has non-admin role "${user.role}".`);
      return res.status(403).json({
        success: false,
        message: 'Konti yawe ntabwo ifite uburenganzira bwa Admin (Access denied: Admin privileges required)',
        error: 'Konti yawe ntabwo ifite uburenganzira bwa Admin (Access denied: Admin privileges required)',
        diagnostic: {
          code: 'INSUFFICIENT_PERMISSIONS',
          reason: `Account has role '${user.role}' which does not grant admin access`,
          emailSearched: cleanEmail,
          currentRole: user.role,
          requiredRoles: ['super_admin', 'admin', 'content_admin', 'moderator']
        }
      });
    }

    const token = generateToken({ id: user.id, email: user.email, role: user.role, name: user.name });

    console.log(`[Admin Login Diagnostic] Approved 200: Successfully authenticated "${user.email}" (${user.role}) via bcrypt hash comparison.`);
    logActivity(user.id, user.name, user.role, 'ADMIN_LOGIN', 'auth', user.id, `Admin logged in with role ${user.role} (bcrypt verified)`);

    return res.status(200).json({
      success: true,
      message: 'Mwinjiye neza mu Buyobozi bwa La Lumiere Choir (Login successful)',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone || '',
        avatar_url: user.avatar_url || ''
      },
      diagnostic: {
        code: 'LOGIN_SUCCESS',
        email: user.email,
        role: user.role,
        hashType: 'bcrypt',
        verifiedAt: new Date().toISOString()
      }
    });
  } catch (err: any) {
    console.error('[Admin Login Diagnostic] Unhandled error during login:', err);
    return res.status(500).json({
      success: false,
      message: 'Habaye ikosa rya tekiniki muri seriveri mu kwinjira (Internal server error during login)',
      error: err.message || 'Internal server error',
      diagnostic: {
        code: 'INTERNAL_SERVER_ERROR',
        details: err.message || 'Unknown error'
      }
    });
  }
});

// -------------------------------------------------------------
// SECURE ADMIN ACCOUNT REGISTRATION & VERIFICATION ENDPOINTS
// -------------------------------------------------------------

/**
 * Admin Account Registration Endpoint
 * Securely hashes passwords using bcrypt before saving to the database.
 * Never stores raw password strings.
 */
app.post('/api/admin/register', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  try {
    logAuthDiagnostic(req, 'Admin Register');
    const { name, email, password, phone, role, setup_key } = req.body || {};

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Amazina yose y\'umuyobozi arakenewe (Administrator full name is required)'
      });
    }

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({
        success: false,
        error: 'Imeli yemewe y\'umuyobozi irakenewe (Valid admin email is required)'
      });
    }

    if (!password || typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'Ijambo ry\'ibanga ry\'umuyobozi rigomba kugira byibuze inyuguti 8 (Admin password must be at least 8 characters)'
      });
    }

    // Role assignment: restrict to recognized administrative roles
    const validAdminRoles = ['super_admin', 'admin', 'content_admin', 'moderator'];
    const assignedRole = role && validAdminRoles.includes(role) ? role : 'admin';

    // Authorization verification:
    // If ADMIN_SETUP_KEY or ADMIN_SECRET is configured, require either the setup key or a valid super_admin Bearer token
    const expectedSetupKey = process.env.ADMIN_SETUP_KEY || process.env.ADMIN_SECRET_KEY;
    const authHeader = req.headers.authorization;
    let isSuperAdminToken = false;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const decoded = verifyToken(authHeader.substring(7));
      if (decoded && (decoded.role === 'super_admin' || decoded.role === 'admin')) {
        isSuperAdminToken = true;
      }
    }

    if (expectedSetupKey && !isSuperAdminToken) {
      if (!setup_key || setup_key !== expectedSetupKey) {
        return res.status(403).json({
          success: false,
          error: 'Uruhushya rwo kwandika umuyobozi rwanze (Unauthorized: Admin setup key or Super Admin token required)'
        });
      }
    }

    const cleanEmail = email.trim().toLowerCase();
    const existing = db.prepare('SELECT id, email, role FROM users WHERE LOWER(TRIM(email)) = ?').get(cleanEmail) as any;
    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'Iyi imeli isanzwe ifite konti muri sisitemu (Email already registered)'
      });
    }

    // Bcrypt hashing: salt and hash password before storage
    const newAdminId = `usr_admin_${Date.now()}`;
    const passwordBcryptHash = hashPassword(password);

    db.prepare(`
      INSERT INTO users (id, name, email, password_hash, phone, role, is_disabled)
      VALUES (?, ?, ?, ?, ?, ?, 0)
    `).run(newAdminId, name.trim(), cleanEmail, passwordBcryptHash, phone?.trim() || '', assignedRole);

    const token = generateToken({
      id: newAdminId,
      email: cleanEmail,
      role: assignedRole,
      name: name.trim()
    });

    logActivity(
      newAdminId,
      name.trim(),
      assignedRole,
      'REGISTER_ADMIN',
      'users',
      newAdminId,
      `Registered new administrator "${cleanEmail}" (${assignedRole}) with bcrypt password hashing`
    );

    console.log(`[Admin Registration] Successfully registered administrator "${cleanEmail}" with role "${assignedRole}" (bcrypt hashed).`);

    return res.status(201).json({
      success: true,
      message: 'Konti y\'ubuyobozi yafunguwe neza (Admin account registered successfully with bcrypt security)',
      token,
      user: {
        id: newAdminId,
        name: name.trim(),
        email: cleanEmail,
        role: assignedRole,
        phone: phone?.trim() || ''
      }
    });
  } catch (err: any) {
    console.error('[Admin Registration Error]:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Habaye ikosa mu kwandika umuyobozi'
    });
  }
});

// -------------------------------------------------------------
// FIRST ADMIN ACCOUNT INITIALIZATION & SETUP ENDPOINTS
// -------------------------------------------------------------

/**
 * Setup function endpoint: inspects current Admin account hash state in database
 */
app.get('/api/admin/setup/status', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  try {
    const adminCount = (db.prepare("SELECT COUNT(*) as count FROM users WHERE role IN ('super_admin', 'admin')").get() as any)?.count || 0;
    const configuredAdminEmail = (process.env.ADMIN_EMAIL || 'admin@lalumierechoir.rw').trim().toLowerCase();
    const targetAdmin = db.prepare('SELECT id, email, role, is_disabled, password_hash FROM users WHERE LOWER(TRIM(email)) = ?').get(configuredAdminEmail) as any;

    const hasBcrypt = Boolean(
      targetAdmin?.password_hash &&
      (targetAdmin.password_hash.startsWith('$2a$') || targetAdmin.password_hash.startsWith('$2b$') || targetAdmin.password_hash.startsWith('$2y$')) &&
      targetAdmin.password_hash.length === 60
    );

    res.json({
      success: true,
      adminAccountsCount: adminCount,
      hasAdminAccounts: adminCount > 0,
      targetAdminExists: Boolean(targetAdmin),
      targetAdminEmail: configuredAdminEmail,
      hasBcryptHash: hasBcrypt
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to inspect admin setup status' });
  }
});

/**
 * Setup function endpoint: initializes the first admin account hash if it does not already exist
 */
app.post('/api/admin/setup', async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  try {
    logAuthDiagnostic(req, 'Admin Setup');
    const { email, password, name, phone, role, setup_key, forceUpdate } = req.body || {};

    const adminCount = (db.prepare("SELECT COUNT(*) as count FROM users WHERE role IN ('super_admin', 'admin')").get() as any)?.count || 0;

    // If an admin already exists, verify authorization via setup_key or super_admin token
    if (adminCount > 0 && !forceUpdate) {
      const expectedKey = process.env.ADMIN_SETUP_KEY || process.env.ADMIN_SECRET_KEY || 'lalumiere-setup-2026';
      const authHeader = req.headers.authorization;
      let authorized = false;

      if (setup_key && setup_key === expectedKey) {
        authorized = true;
      }
      if (authHeader?.startsWith('Bearer ')) {
        const decoded = verifyToken(authHeader.substring(7));
        if (decoded && (decoded.role === 'super_admin' || decoded.role === 'admin')) {
          authorized = true;
        }
      }

      // If already initialized and not supplying key, return existing status
      if (!authorized) {
        const result = await setupFirstAdminAccount({
          email,
          password,
          name,
          phone,
          role,
          forceUpdate: false
        });

        return res.status(200).json({
          success: true,
          ...result
        });
      }
    }

    const result = await setupFirstAdminAccount({
      email,
      password,
      name,
      phone,
      role,
      forceUpdate: Boolean(forceUpdate)
    });

    res.status(result.action === 'created' ? 201 : 200).json({
      success: result.initialized || result.action === 'already_exists',
      ...result
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to execute admin setup' });
  }
});

/**
 * Admin Verification Endpoint
 * Validates admin status and credentials using bcrypt hash comparison.
 * Supports verifying credentials ({ email, password }) or verifying an existing Bearer token.
 */
app.post('/api/admin/verify', async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  try {
    logAuthDiagnostic(req, 'Admin Verify');
    const { email, password, token } = req.body || {};
    const authHeader = req.headers.authorization;
    const providedToken = token || (authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null);

    // 1. Token-based verification
    if (providedToken) {
      const decoded = verifyToken(providedToken);
      if (!decoded) {
        return res.status(401).json({
          valid: false,
          error: 'Umwirondoro w\'ubuyobozi (Token) warataye agaciro cyangwa si wo (Invalid or expired token)'
        });
      }

      const user = db.prepare('SELECT id, name, email, role, phone, avatar_url, is_disabled FROM users WHERE id = ?').get(decoded.id) as any;
      if (!user) {
        return res.status(401).json({ valid: false, error: 'Umukoresha ntakiboneka muri sisitemu' });
      }

      if (user.is_disabled) {
        return res.status(403).json({ valid: false, error: 'Konti yahagaritswe n\'ubuyobozi (Account disabled)' });
      }

      if (!isUserAdmin(user.role)) {
        return res.status(403).json({ valid: false, error: 'Konti ntabwo ifite uburenganzira bwa Admin (Not an admin role)' });
      }

      return res.json({
        valid: true,
        method: 'token',
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone || '',
          avatar_url: user.avatar_url || ''
        }
      });
    }

    // 2. Credential-based verification using bcrypt hash comparison
    if (!email || !password) {
      return res.status(400).json({
        valid: false,
        error: 'Imeli n\'ijambo ry\'ibanga birakenewe kugira ngo hemezwe ubuyobozi'
      });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const user = db.prepare('SELECT * FROM users WHERE LOWER(TRIM(email)) = ?').get(cleanEmail) as any;
    if (!user) {
      return res.status(401).json({
        valid: false,
        error: 'Imeli ntabwo ibarizwa mu bayobozi (Admin account not found)'
      });
    }

    // Ensure stored Admin password is compared using bcrypt.compare()
    let isMatch = false;
    let needsRehash = false;

    if (user.password_hash) {
      const isBcrypt =
        (user.password_hash.startsWith('$2a$') || user.password_hash.startsWith('$2b$') || user.password_hash.startsWith('$2y$')) &&
        user.password_hash.length === 60;

      if (isBcrypt) {
        // Direct bcrypt.compare()
        isMatch = await bcrypt.compare(String(password), user.password_hash);
      } else {
        const comp = await comparePassword(String(password), user.password_hash);
        isMatch = comp.isMatch;
        needsRehash = comp.needsRehash;
      }
    }

    if (!isMatch) {
      return res.status(401).json({
        valid: false,
        error: 'Ijambo ry\'ibanga si ryo (Incorrect admin password)'
      });
    }

    if (needsRehash) {
      const upgradedHash = hashPassword(String(password));
      db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(upgradedHash, user.id);
    }

    if (user.is_disabled) {
      return res.status(403).json({
        valid: false,
        error: 'Konti y\'uyu muyobozi yahagaritswe (Account disabled)'
      });
    }

    if (!isUserAdmin(user.role)) {
      return res.status(403).json({
        valid: false,
        error: 'Konti ntabwo ifite uburenganzira bwa Admin (Insufficient privileges)'
      });
    }

    return res.json({
      valid: true,
      method: 'bcrypt_credentials',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone || '',
        avatar_url: user.avatar_url || ''
      }
    });
  } catch (err: any) {
    return res.status(500).json({ valid: false, error: err.message || 'Verification failed' });
  }
});

app.get('/api/auth/me', requireAuth, (req: AuthRequest, res) => {
  try {
    const user = db.prepare(`
      SELECT id, name, email, phone, role, avatar_url, choir_voice, choir_role, bio,
             share_directory, share_phone, share_email, share_whatsapp, created_at
      FROM users
      WHERE id = ?
    `).get(req.user!.id) as any;
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const favoritesCount = db.prepare('SELECT COUNT(*) as count FROM favorites WHERE user_id = ?').get(req.user!.id) as any;
    const donationsCount = db.prepare("SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total FROM payment_transactions WHERE user_id = ? AND status = 'successful'").get(req.user!.id) as any;

    res.json({
      user,
      stats: {
        favoritesCount: favoritesCount?.count || 0,
        donationsCount: donationsCount?.count || 0,
        totalDonated: donationsCount?.total || 0
      }
    });
  } catch (err: any) {
    console.error('Error in /api/auth/me:', err);
    res.status(500).json({ error: 'Failed to fetch user profile', details: err?.message });
  }
});

app.put('/api/auth/profile', requireAuth, (req: AuthRequest, res) => {
  try {
    const {
      name,
      phone,
      avatar_url,
      choir_voice,
      choir_role,
      bio,
      share_directory,
      share_phone,
      share_email,
      share_whatsapp
    } = req.body;

    db.prepare(`
      UPDATE users
      SET name = COALESCE(?, name),
          phone = COALESCE(?, phone),
          avatar_url = COALESCE(?, avatar_url),
          choir_voice = COALESCE(?, choir_voice),
          choir_role = COALESCE(?, choir_role),
          bio = COALESCE(?, bio),
          share_directory = CASE WHEN ? IS NOT NULL THEN ? ELSE share_directory END,
          share_phone = CASE WHEN ? IS NOT NULL THEN ? ELSE share_phone END,
          share_email = CASE WHEN ? IS NOT NULL THEN ? ELSE share_email END,
          share_whatsapp = CASE WHEN ? IS NOT NULL THEN ? ELSE share_whatsapp END,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      name,
      phone,
      avatar_url,
      choir_voice,
      choir_role,
      bio,
      share_directory !== undefined ? (share_directory ? 1 : 0) : null,
      share_directory !== undefined ? (share_directory ? 1 : 0) : null,
      share_phone !== undefined ? (share_phone ? 1 : 0) : null,
      share_phone !== undefined ? (share_phone ? 1 : 0) : null,
      share_email !== undefined ? (share_email ? 1 : 0) : null,
      share_email !== undefined ? (share_email ? 1 : 0) : null,
      share_whatsapp !== undefined ? (share_whatsapp ? 1 : 0) : null,
      share_whatsapp !== undefined ? (share_whatsapp ? 1 : 0) : null,
      req.user!.id
    );

    const updated = db.prepare(`
      SELECT id, name, email, phone, role, avatar_url, choir_voice, choir_role, bio,
             share_directory, share_phone, share_email, share_whatsapp
      FROM users
      WHERE id = ?
    `).get(req.user!.id);

    res.json({ message: 'Umwirondoro n\'amahitamo byavuguruwe (Profile and privacy preferences updated)', user: updated });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

app.post('/api/auth/change-password', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'Ijambo ry\'ibanga rishya rigomba kugira byibuze inyuguti 6' });
    }

    const user = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(req.user!.id) as any;
    let isMatch = false;

    if (user?.password_hash) {
      const isBcrypt =
        (user.password_hash.startsWith('$2a$') || user.password_hash.startsWith('$2b$') || user.password_hash.startsWith('$2y$')) &&
        user.password_hash.length === 60;

      if (isBcrypt) {
        isMatch = await bcrypt.compare(currentPassword, user.password_hash);
      } else {
        const comp = await comparePassword(currentPassword, user.password_hash);
        isMatch = comp.isMatch;
      }
    }

    if (!isMatch) {
      return res.status(400).json({ error: 'Ijambo ry\'ibanga ry\'ubu si ryo' });
    }

    const newHash = hashPassword(newPassword);
    db.prepare('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(newHash, req.user!.id);

    res.json({ message: 'Ijambo ry\'ibanga ryahinduwe neza (Password changed successfully)' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// Account deletion (Required by Google Play & Apple App Store guidelines!)
app.delete('/api/auth/delete-account', requireAuth, (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    // Log audit
    db.prepare("INSERT INTO audit_logs (id, user_id, action, resource, details) VALUES (?, ?, 'ACCOUNT_DELETED', 'users', ?)")
      .run('log_' + Date.now(), userId, 'User requested account deletion');

    // Cascade deletion removes user, comments, favorites, notifications
    db.prepare('DELETE FROM users WHERE id = ?').run(userId);
    res.json({ message: 'Konti yawe yasibwe burundu (Account deleted permanently)' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

// -------------------------------------------------------------
// SECURE PASSWORD RECOVERY & ACCOUNT IDENTIFIER RECOVERY API
// -------------------------------------------------------------

// In-memory rate limiter for password reset requests to prevent abuse
const resetRateLimiter = new Map<string, { count: number; firstRequestTime: number }>();
function checkResetRateLimit(key: string, maxAttempts = 5, windowMs = 15 * 60 * 1000): boolean {
  const now = Date.now();
  const record = resetRateLimiter.get(key);
  if (!record) {
    resetRateLimiter.set(key, { count: 1, firstRequestTime: now });
    return true;
  }
  if (now - record.firstRequestTime > windowMs) {
    resetRateLimiter.set(key, { count: 1, firstRequestTime: now });
    return true;
  }
  if (record.count >= maxAttempts) {
    return false;
  }
  record.count += 1;
  return true;
}

/**
 * 1. Request Password Reset Link
 * - Time-limited, single-use cryptographically secure token
 * - Generic response prevents email enumeration attacks
 * - Rate-limited to prevent abuse
 */
app.post('/api/auth/forgot-password', async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  try {
    const { email } = req.body || {};
    const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown_ip';

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({
        success: false,
        error: 'Imeyili yemewe irakenewe (A valid email address is required)'
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const rateLimitKey = `${clientIp}_${cleanEmail}`;

    if (!checkResetRateLimit(rateLimitKey)) {
      return res.status(429).json({
        success: false,
        error: 'Mwagerageje kenshi cyane. Nyamuneka tegereza iminota 15 mbere yo kongera gusaba (Too many attempts. Please try again after 15 minutes)'
      });
    }

    // Generic response message - never reveals whether email exists in the system
    const genericSuccessMessage = "Niba iyi imeyili ifite konti muri sisitemu, amabwiriza yo gusubiramo ijambo ry'ibanga yoherejwe kuri imeyili yawe. Reba no muri spam. (If this email is registered, password reset instructions have been sent.)";

    // Query user record
    const user = db.prepare('SELECT id, name, email, role, is_disabled FROM users WHERE LOWER(TRIM(email)) = ?').get(cleanEmail) as any;

    if (!user || user.is_disabled) {
      // Artificial delay to prevent timing attack enumeration
      await new Promise(resolve => setTimeout(resolve, 250));
      return res.status(200).json({
        success: true,
        message: genericSuccessMessage
      });
    }

    // Invalidate previous unused reset tokens for this user
    db.prepare('UPDATE password_resets SET used = 1 WHERE user_id = ? AND used = 0').run(user.id);

    // Generate secure, time-limited JWT reset token (1 hour expiry)
    const jwtResetToken = generatePasswordResetToken({ id: user.id, email: cleanEmail });
    const tokenHash = crypto.createHash('sha256').update(jwtResetToken).digest('hex');
    const resetId = `rst_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // Set expiration to exactly 1 hour from now (in UTC ISO format for SQLite compatibility)
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    db.prepare(`
      INSERT INTO password_resets (id, user_id, email, token_hash, expires_at, used, ip_address, created_at)
      VALUES (?, ?, ?, ?, ?, 0, ?, CURRENT_TIMESTAMP)
    `).run(resetId, user.id, cleanEmail, tokenHash, expiresAt, clientIp);

    // Resolve base application URL for production on Render or local dev
    const configuredAppUrl = process.env.APP_URL || process.env.RENDER_EXTERNAL_URL;
    let baseUrl = configuredAppUrl;
    if (!baseUrl) {
      const proto = req.headers['x-forwarded-proto'] || req.protocol || 'http';
      const host = req.headers['x-forwarded-host'] || req.get('host') || 'localhost:3000';
      baseUrl = `${proto}://${host}`;
    }
    baseUrl = baseUrl.replace(/\/+$/, '');

    const resetUrl = `${baseUrl}/?reset_token=${jwtResetToken}&email=${encodeURIComponent(cleanEmail)}`;

    console.log(`[Password Reset] Generated secure JWT reset token for ${cleanEmail}. Link expires in 60 minutes.`);

    // Trigger email service (real SMTP or placeholder service)
    await sendPasswordResetEmail({
      toEmail: cleanEmail,
      recipientName: user.name,
      resetUrl,
      expiresInMinutes: 60
    });

    if (process.env.NODE_ENV !== 'production') {
      return res.status(200).json({
        success: true,
        message: genericSuccessMessage,
        devResetUrl: resetUrl,
        isDevFallback: !isEmailServiceConfigured()
      });
    }

    return res.status(200).json({
      success: true,
      message: genericSuccessMessage
    });
  } catch (err: any) {
    console.error('[Forgot Password Error]:', err);
    return res.status(500).json({
      success: false,
      error: 'Habaye ikosa mu gutunganya ubusabe bwawe. Ongera ugerageze mukanya.'
    });
  }
});

/**
 * 2. Verify Password Reset Token Validity
 */
app.post('/api/auth/verify-reset-token', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  try {
    const { token, email } = req.body || {};
    if (!token || typeof token !== 'string') {
      return res.status(400).json({ valid: false, error: 'Token irakenewe' });
    }

    const tokenHash = crypto.createHash('sha256').update(token.trim()).digest('hex');
    const record = db.prepare(`
      SELECT pr.*, u.name, u.email as user_email
      FROM password_resets pr
      JOIN users u ON pr.user_id = u.id
      WHERE pr.token_hash = ? AND pr.used = 0
    `).get(tokenHash) as any;

    if (!record) {
      return res.status(400).json({
        valid: false,
        error: 'Iyi link yo gusubiramo ijambo ry\'ibanga ntiyemewe cyangwa yarakoreshejwe (Invalid or already used token).'
      });
    }

    const expiresAt = new Date(record.expires_at).getTime();
    if (Date.now() > expiresAt) {
      return res.status(400).json({
        valid: false,
        error: 'Iyi link yarengeje igihe cyayo cy\'agaciro (Token has expired). Saba indi nshya.'
      });
    }

    return res.status(200).json({
      valid: true,
      message: 'Token iremewe (Valid token)',
      email: record.user_email,
      name: record.name
    });
  } catch (err: any) {
    return res.status(500).json({ valid: false, error: 'Failed to verify token' });
  }
});

/**
 * 3. Complete Password Reset
 * - Validates single-use token and expiration
 * - Hashes new password securely with bcrypt
 * - Invalidates token and all older pending tokens
 * - Old password can no longer be used
 */
app.post('/api/auth/reset-password', async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  try {
    const { token, newPassword } = req.body || {};

    if (!token || typeof token !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Token yo gusubiramo ijambo ry\'ibanga irakenewe (Reset token is required)'
      });
    }

    if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Ijambo ry\'ibanga rishya rigomba kugira byibuze inyuguti 6 (Password must be at least 6 characters)'
      });
    }

    const tokenHash = crypto.createHash('sha256').update(token.trim()).digest('hex');
    const record = db.prepare(`
      SELECT pr.*, u.id as user_id, u.name, u.email as user_email, u.role
      FROM password_resets pr
      JOIN users u ON pr.user_id = u.id
      WHERE pr.token_hash = ? AND pr.used = 0
    `).get(tokenHash) as any;

    if (!record) {
      return res.status(400).json({
        success: false,
        error: 'Iyi link yo gusubiramo ijambo ry\'ibanga ntiyemewe cyangwa yarakoreshejwe (Invalid or already used token). Nyamuneka saba indi nshya.'
      });
    }

    const expiresAt = new Date(record.expires_at).getTime();
    if (Date.now() > expiresAt) {
      return res.status(400).json({
        success: false,
        error: 'Iyi link yarengeje igihe cyayo (Token has expired). Nyamuneka saba indi nshya.'
      });
    }

    // Hash new password using bcrypt
    const newPasswordHash = hashPassword(newPassword);

    // Update user password and invalidate all tokens for this user in a transaction
    db.exec('BEGIN TRANSACTION;');
    try {
      db.prepare('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
        .run(newPasswordHash, record.user_id);

      db.prepare('UPDATE password_resets SET used = 1, used_at = CURRENT_TIMESTAMP WHERE id = ?')
        .run(record.id);

      // Invalidate any other pending tokens
      db.prepare('UPDATE password_resets SET used = 1 WHERE user_id = ? AND used = 0')
        .run(record.user_id);

      db.exec('COMMIT;');
    } catch (txErr) {
      db.exec('ROLLBACK;');
      throw txErr;
    }

    logActivity(
      record.user_id,
      record.name,
      record.role,
      'PASSWORD_RESET',
      'users',
      record.user_id,
      `User ${record.user_email} successfully reset password via secure single-use token`
    );

    console.log(`[Password Reset Complete] Successfully reset password for user ${record.user_email}. Single-use token invalidated.`);

    return res.status(200).json({
      success: true,
      message: 'Ijambo ry\'ibanga ryahinduwe neza! Ushobora kwinjira muri konti yawe noneho (Password successfully updated. You can now sign in).'
    });
  } catch (err: any) {
    console.error('[Reset Password Error]:', err);
    return res.status(500).json({
      success: false,
      error: 'Habaye ikosa mu guhindura ijambo ry\'ibanga. Ongera ugerageze mukanya.'
    });
  }
});

/**
 * 4. Forgotten Email or Username Recovery
 * - Helps users who forgot their email address using a registered phone number
 * - Never discloses complete registered email or details to an unauthenticated person
 * - Stronger protection for Admin accounts: directs them to Choir Leadership
 */
app.post('/api/auth/forgot-identifier', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  try {
    const { phone } = req.body || {};

    if (!phone || typeof phone !== 'string' || phone.trim().length < 8) {
      return res.status(400).json({
        success: false,
        error: 'Nimero ya terefone yemewe irakenewe (Valid phone number required)'
      });
    }

    const cleanPhone = phone.trim().replace(/\s+/g, '');
    const phoneCandidates = [
      cleanPhone,
      cleanPhone.startsWith('0') ? '+250' + cleanPhone.substring(1) : cleanPhone,
      cleanPhone.startsWith('+250') ? '0' + cleanPhone.substring(4) : cleanPhone,
      cleanPhone.startsWith('250') ? '0' + cleanPhone.substring(3) : cleanPhone
    ];

    let user: any = null;
    for (const p of phoneCandidates) {
      user = db.prepare('SELECT id, name, email, phone, role, is_disabled FROM users WHERE phone = ?').get(p) as any;
      if (user) break;
    }

    if (!user || user.is_disabled) {
      return res.status(200).json({
        success: false,
        message: 'Nta konti ibonetse ifitanye isano n\'iyi nimero ya terefone. Niba ufite ikibazo cyo kwibagirwa imeyili yawe, mwavugana n\'ubuyobozi bwa Korali kuri lalumierechoir@gmail.com cyangwa kuri telefone y\'itorero.'
      });
    }

    // Admin accounts receive stronger protection against unauthorized account recovery
    if (isUserAdmin(user.role)) {
      return res.status(200).json({
        success: true,
        isAdminAccount: true,
        message: 'Konti y\'ubuyobozi ifite umutekano wihariye kandi ntiyemererwa kugaragaza imeyili muri ubu buryo. Nyamuneka vugana n\'Umuyobozi Mukuru wa Korali cyangwa wandikire ubuyobozi kuri lalumierechoir@gmail.com kugira ngo bagufashe kwemeza umwirondoro wawe.'
      });
    }

    // Mask user's email so that the complete address is never disclosed
    const parts = user.email.split('@');
    const namePart = parts[0];
    const domainPart = parts[1] || 'gmail.com';
    let maskedName = '';
    if (namePart.length <= 2) {
      maskedName = `${namePart[0]}***`;
    } else {
      maskedName = `${namePart[0]}***${namePart[namePart.length - 1]}`;
    }
    const maskedEmail = `${maskedName}@${domainPart}`;

    return res.status(200).json({
      success: true,
      maskedEmail,
      message: `Konti yawe yarabonetse! Imeyili ikoreshwa ni: ${maskedEmail}. Koresha iyi meyili cyangwa ukande 'Gusubiramo Ijambo ry'Ibanga' niba wifuza irindi jambo ry'ibanga.`
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: 'Habaye ikosa mu kureba umwirondoro wawe.'
    });
  }
});

// -------------------------------------------------------------
// SONGS & DIGITAL SONGBOOK API
// -------------------------------------------------------------
app.get('/api/songs', optionalAuth, (req: AuthRequest, res) => {
  try {
    const { search, category, status, sort } = req.query;
    let query = `
      SELECT s.id, s.title, s.song_number, s.composer, s.category_id, s.release_status,
             s.release_date, s.description, s.cover_image_url, s.views_count, s.display_order,
             sc.name as category_name, sc.slug as category_slug,
             (SELECT COUNT(*) FROM audio_tracks at WHERE at.song_id = s.id) as audio_count,
             (SELECT COUNT(*) FROM comments c WHERE c.song_id = s.id AND c.status = 'visible') as comments_count
      FROM songs s
      LEFT JOIN song_categories sc ON s.category_id = sc.id
      WHERE (s.is_deleted = 0 OR s.is_deleted IS NULL)
        AND (s.status = 'published' OR s.status IS NULL)
    `;
    const params: any[] = [];

    if (category && category !== 'all') {
      query += ` AND (s.category_id = ? OR sc.slug = ?)`;
      params.push(category, category);
    }

    if (status && status !== 'all') {
      query += ` AND s.release_status = ?`;
      params.push(status);
    }

    if (search && typeof search === 'string' && search.trim()) {
      const term = `%${search.trim()}%`;
      query += ` AND (
        s.title LIKE ? OR
        s.composer LIKE ? OR
        s.song_number LIKE ? OR
        EXISTS (SELECT 1 FROM lyrics l WHERE l.song_id = s.id AND l.content LIKE ?)
      )`;
      params.push(term, term, term, term);
    }

    if (sort === 'popular') {
      query += ` ORDER BY s.views_count DESC, s.display_order ASC`;
    } else if (sort === 'number') {
      query += ` ORDER BY CAST(s.song_number AS INTEGER) ASC, s.song_number ASC`;
    } else if (sort === 'oldest') {
      query += ` ORDER BY s.display_order ASC`;
    } else {
      // Default: original book display order
      query += ` ORDER BY s.display_order ASC, s.id ASC`;
    }

    const songs = db.prepare(query).all(...params) as any[];

    // Include favorite status if user is logged in
    let favoriteSongIds = new Set<string>();
    if (req.user) {
      const userFavs = db.prepare('SELECT song_id FROM favorites WHERE user_id = ?').all(req.user.id) as any[];
      favoriteSongIds = new Set(userFavs.map(f => f.song_id));
    }

    const result = songs.map(s => ({
      ...s,
      is_favorite: favoriteSongIds.has(s.id),
      has_audio: Number(s.audio_count) > 0,
      is_unreleased: s.release_status === 'unreleased'
    }));

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to query songs' });
  }
});

app.get(['/api/songs/categories', '/api/categories'], (req, res) => {
  try {
    const categories = db.prepare(`
      SELECT sc.*, COUNT(s.id) as song_count
      FROM song_categories sc
      LEFT JOIN songs s ON sc.id = s.category_id
      GROUP BY sc.id
      ORDER BY sc.display_order ASC
    `).all();
    res.json(categories);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// Single song details with lyrics and audio tracks
app.get('/api/songs/:id', optionalAuth, (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const song = db.prepare(`
      SELECT s.*, sc.name as category_name
      FROM songs s
      LEFT JOIN song_categories sc ON s.category_id = sc.id
      WHERE s.id = ?
    `).get(id) as any;

    if (!song) {
      return res.status(404).json({ error: 'Indirimbo ntibonetse (Song not found)' });
    }

    const isAdmin = isUserAdmin(req.user?.role);

    // If song is draft or soft-deleted, only admins can view it
    if (!isAdmin && (song.is_deleted === 1 || song.status === 'draft')) {
      return res.status(404).json({ error: 'Indirimbo ntibonetse cyangwa ntiyemerewe kurebwa (Song not found or draft)' });
    }

    // Increment view count
    db.prepare('UPDATE songs SET views_count = views_count + 1 WHERE id = ?').run(id);

    if (req.user) {
      logActivity(req.user.id, req.user.name, req.user.role, 'SONG_ACCESS', 'songs', id, `Accessed hymn lyrics for "${song.title}"`);
    }

    const audioTracks = db.prepare('SELECT * FROM audio_tracks WHERE song_id = ? AND (is_deleted = 0 OR is_deleted IS NULL) ORDER BY created_at ASC').all(id) as any[];
    const lyricsRow = db.prepare('SELECT * FROM lyrics WHERE song_id = ?').get(id) as any;

    // Unreleased content protection
    let lyricsContent = lyricsRow?.content || '';
    let isLocked = false;

    if (song.release_status === 'unreleased') {
      // Check if unlocked in session or user has access grant
      let hasAccess = isAdmin;
      if (!hasAccess && req.user) {
        const grant = db.prepare('SELECT id FROM protected_content_access WHERE song_id = ? AND user_id = ?').get(id, req.user.id);
        if (grant) hasAccess = true;
      }

      if (!hasAccess) {
        isLocked = true;
        // Obscure lyrics completely for unreleased songs to unauthorized users
        lyricsContent = '';
      }
    }

    let isFavorite = false;
    if (req.user) {
      const fav = db.prepare('SELECT 1 FROM favorites WHERE user_id = ? AND song_id = ?').get(req.user.id, id);
      isFavorite = Boolean(fav);
    }

    res.json({
      ...song,
      access_password_hash: undefined, // Never expose password hash!
      is_locked: isLocked,
      is_favorite: isFavorite,
      lyrics: lyricsContent,
      solfa_notation: isLocked ? null : lyricsRow?.solfa_notation,
      language: lyricsRow?.language || 'rw',
      audio_tracks: isLocked ? [] : audioTracks, // Audio also protected if unreleased and locked
      available_track_count: audioTracks.length
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch song details' });
  }
});

// Unlock unreleased song with access password
app.post('/api/songs/:id/unlock', optionalAuth, (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ error: 'Ijambo ry\'ibanga rirakenewe (Password required)' });
    }

    const song = db.prepare('SELECT id, release_status, access_password_hash FROM songs WHERE id = ?').get(id) as any;
    if (!song) {
      return res.status(404).json({ error: 'Song not found' });
    }

    if (song.release_status !== 'unreleased') {
      return res.json({ message: 'Indirimbo irasohotse (Song is already public)' });
    }

    if (!song.access_password_hash || !bcrypt.compareSync(password, song.access_password_hash)) {
      return res.status(401).json({ error: 'Ijambo ry\'ibanga si ryo (Incorrect access password)' });
    }

    // Grant access log
    db.prepare('INSERT INTO protected_content_access (id, user_id, song_id) VALUES (?, ?, ?)')
      .run('grant_' + Date.now(), req.user?.id || null, id);

    const lyricsRow = db.prepare('SELECT * FROM lyrics WHERE song_id = ?').get(id) as any;
    const audioTracks = db.prepare('SELECT * FROM audio_tracks WHERE song_id = ?').all(id);

    res.json({
      success: true,
      message: 'Mwinjiye neza mu ndirimbo itarasohoka (Unlocked successfully)',
      lyrics: lyricsRow?.content || '',
      solfa_notation: lyricsRow?.solfa_notation,
      audio_tracks: audioTracks
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to verify password' });
  }
});

// -------------------------------------------------------------
// AUDIO LIBRARY API
// -------------------------------------------------------------
const handleAudioLibraryRequest = (req: any, res: any) => {
  try {
    const { track_type, type, search } = req.query;
    const filterType = track_type || type;
    let query = `
      SELECT at.*, s.title as song_title, s.song_number, s.composer, s.cover_image_url, s.release_status
      FROM audio_tracks at
      JOIN songs s ON at.song_id = s.id
      WHERE s.release_status = 'released'
    `;
    const params: any[] = [];

    if (filterType && filterType !== 'all') {
      query += ` AND at.track_type = ?`;
      params.push(filterType);
    }

    if (search && typeof search === 'string' && search.trim()) {
      query += ` AND (at.title LIKE ? OR s.title LIKE ? OR s.composer LIKE ?)`;
      const term = `%${search.trim()}%`;
      params.push(term, term, term);
    }

    query += ` ORDER BY at.plays_count DESC, at.created_at DESC`;
    const tracks = db.prepare(query).all(...params);
    res.json(tracks);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch audio tracks' });
  }
};

app.get('/api/audio-library', handleAudioLibraryRequest);
app.get('/api/audio-tracks', handleAudioLibraryRequest);

app.post('/api/audio-tracks/:id/play', (req, res) => {
  try {
    db.prepare('UPDATE audio_tracks SET plays_count = plays_count + 1 WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.json({ success: false });
  }
});

// -------------------------------------------------------------
// FAVORITES API
// -------------------------------------------------------------
app.get('/api/favorites', requireAuth, (req: AuthRequest, res) => {
  try {
    const songs = db.prepare(`
      SELECT s.*, sc.name as category_name, 1 as is_favorite
      FROM favorites f
      JOIN songs s ON f.song_id = s.id
      LEFT JOIN song_categories sc ON s.category_id = sc.id
      WHERE f.user_id = ?
      ORDER BY f.created_at DESC
    `).all(req.user!.id);
    res.json(songs);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch favorites' });
  }
});

app.post('/api/favorites/:songId', requireAuth, (req: AuthRequest, res) => {
  try {
    const { songId } = req.params;
    const userId = req.user!.id;

    const existing = db.prepare('SELECT 1 FROM favorites WHERE user_id = ? AND song_id = ?').get(userId, songId);
    if (existing) {
      db.prepare('DELETE FROM favorites WHERE user_id = ? AND song_id = ?').run(userId, songId);
      res.json({ is_favorite: false, message: 'Yakuwe mu ndirimbo ukunda (Removed from favorites)' });
    } else {
      db.prepare('INSERT INTO favorites (user_id, song_id) VALUES (?, ?)').run(userId, songId);
      res.json({ is_favorite: true, message: 'Yongewe mu ndirimbo ukunda (Added to favorites)' });
    }
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update favorites' });
  }
});

// -------------------------------------------------------------
// COMMENTS & COMMUNITY API
// -------------------------------------------------------------
app.get('/api/songs/:id/comments', (req, res) => {
  try {
    const { id } = req.params;
    const comments = db.prepare(`
      SELECT c.*, u.name as user_name, u.avatar_url, u.role as user_role
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.song_id = ? AND c.status = 'visible' AND c.parent_id IS NULL
      ORDER BY c.created_at DESC
    `).all(id) as any[];

    // Fetch replies for each comment
    const getReplies = db.prepare(`
      SELECT c.*, u.name as user_name, u.avatar_url, u.role as user_role
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.parent_id = ? AND c.status = 'visible'
      ORDER BY c.created_at ASC
    `);

    const result = comments.map(c => ({
      ...c,
      replies: getReplies.all(c.id)
    }));

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

app.post('/api/songs/:id/comments', requireAuth, (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { content, parent_id } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Ubutumwa ntibushobora kuba ubusa (Comment cannot be empty)' });
    }

    // Basic spam prevention: check recent comments in last 10 seconds
    const recent = db.prepare(`
      SELECT COUNT(*) as count FROM comments
      WHERE user_id = ? AND created_at >= datetime('now', '-10 seconds')
    `).get(req.user!.id) as any;

    if (recent && recent.count >= 2) {
      return res.status(429).json({ error: 'Tegereza akanya gato mbere yo kongera kwandika igitekerezo (Please wait a moment)' });
    }

    const commentId = 'comm_' + Date.now();
    db.prepare(`
      INSERT INTO comments (id, song_id, user_id, parent_id, content, status)
      VALUES (?, ?, ?, ?, ?, 'visible')
    `).run(commentId, id, req.user!.id, parent_id || null, content.trim());

    const created = db.prepare(`
      SELECT c.*, u.name as user_name, u.avatar_url, u.role as user_role
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.id = ?
    `).get(commentId);

    res.status(201).json({ message: 'Igitekerezo cyakiriwe (Comment posted)', comment: created });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to post comment' });
  }
});

app.post('/api/comments/:id/like', requireAuth, (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const existing = db.prepare("SELECT 1 FROM comment_reactions WHERE user_id = ? AND comment_id = ? AND reaction_type = 'like'").get(userId, id);
    if (existing) {
      db.prepare("DELETE FROM comment_reactions WHERE user_id = ? AND comment_id = ? AND reaction_type = 'like'").run(userId, id);
      db.prepare('UPDATE comments SET likes_count = MAX(0, likes_count - 1) WHERE id = ?').run(id);
      return res.json({ liked: false });
    } else {
      db.prepare("INSERT INTO comment_reactions (user_id, comment_id, reaction_type) VALUES (?, ?, 'like')").run(userId, id);
      db.prepare('UPDATE comments SET likes_count = likes_count + 1 WHERE id = ?').run(id);
      return res.json({ liked: true });
    }
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to react to comment' });
  }
});

app.post('/api/comments/:id/report', requireAuth, (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const userId = req.user!.id;

    db.prepare(`
      INSERT OR IGNORE INTO comment_reactions (user_id, comment_id, reaction_type, reason)
      VALUES (?, ?, 'report', ?)
    `).run(userId, id, reason || 'Inappropriate content');

    db.prepare('UPDATE comments SET reports_count = reports_count + 1 WHERE id = ?').run(id);

    // If reported 3 or more times, auto-flag for moderation
    const c = db.prepare('SELECT reports_count FROM comments WHERE id = ?').get(id) as any;
    if (c && c.reports_count >= 3) {
      db.prepare("UPDATE comments SET status = 'flagged' WHERE id = ?").run(id);
    }

    res.json({ message: 'Icyegeranyo cyakiriwe, ubuyobozi buragisuzuma (Report submitted)' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to submit report' });
  }
});

// -------------------------------------------------------------
// RWANDA MOBILE MONEY DONATIONS & PAYMENTS API
// -------------------------------------------------------------
app.get('/api/payment-providers', (req, res) => {
  try {
    const providers = db.prepare('SELECT id, name, slug, is_enabled, environment, merchant_account_id FROM payment_providers WHERE is_enabled = 1').all();
    res.json(providers);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch payment providers' });
  }
});

app.post('/api/donations/validate-phone', (req, res) => {
  const { phone } = req.body;
  const result = validateRwandaPhoneNumber(phone);
  res.json(result);
});

app.post('/api/donations/initiate', optionalAuth, async (req: AuthRequest, res) => {
  try {
    const {
      amount,
      phone,
      phone_number,
      paymentMethod,
      provider_slug,
      donationPurpose,
      donation_purpose,
      donorName,
      donor_name,
      isAnonymous,
      is_anonymous
    } = req.body;

    const phoneNumber = phone || phone_number;
    const provider = provider_slug || paymentMethod;
    const purpose = donationPurpose || donation_purpose;
    const name = donorName || donor_name;
    const anonymous = isAnonymous !== undefined ? isAnonymous : is_anonymous;

    const response = await initiateRwandaPayment({
      userId: req.user?.id,
      donorName: name || req.user?.name,
      donorPhone: phoneNumber,
      amount: Number(amount),
      currency: 'RWF',
      paymentMethod: provider === 'airtel-money' ? 'airtel-money' : 'mtn-momo',
      donationPurpose: purpose || 'General Choir Ministry & Production',
      isAnonymous: Boolean(anonymous)
    });

    const transaction = db.prepare('SELECT * FROM payment_transactions WHERE internal_reference = ?').get(response.internalReference);

    res.json({
      ...response,
      transaction: transaction || {
        internal_reference: response.internalReference,
        provider_slug: provider === 'airtel-money' ? 'airtel-money' : 'mtn-momo',
        amount: Number(amount),
        currency: 'RWF',
        status: response.status,
        donor_phone: phoneNumber,
        donor_name: name || 'Supporter',
        donation_purpose: purpose,
        prompt_instructions: response.promptInstructions,
        created_at: new Date().toISOString()
      }
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Ntibyakunze gutangiza ubwishyu' });
  }
});

const handleVerifyDonation = (req: any, res: any) => {
  try {
    const transaction = verifyPaymentTransaction(req.params.id || req.params.reference);
    res.json(transaction);
  } catch (err: any) {
    res.status(404).json({ error: err.message || 'Transaction not found' });
  }
};

app.get('/api/donations/verify/:id', handleVerifyDonation);
app.get('/api/donations/status/:reference', handleVerifyDonation);

app.get('/api/donations/history', requireAuth, (req: AuthRequest, res) => {
  try {
    const donations = db.prepare(`
      SELECT id, internal_reference, provider_reference, amount, currency,
             provider_slug, donation_purpose, status, created_at, completed_at
      FROM payment_transactions
      WHERE user_id = ?
      ORDER BY created_at DESC
    `).all(req.user!.id);
    res.json(donations);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch donations history' });
  }
});

// Webhook callback endpoint for telco callbacks (MTN / Airtel)
app.post('/api/donations/callback', (req, res) => {
  try {
    const { referenceId, status, providerReference } = req.body;
    if (referenceId) {
      const normalizedStatus = status === 'SUCCESSFUL' ? 'successful' : (status === 'FAILED' ? 'failed' : 'pending');
      db.prepare(`
        UPDATE payment_transactions
        SET status = ?, provider_reference = COALESCE(?, provider_reference), completed_at = CURRENT_TIMESTAMP
        WHERE internal_reference = ? OR id = ?
      `).run(normalizedStatus, providerReference, referenceId, referenceId);
    }
    res.status(200).json({ status: 'ok' });
  } catch (err) {
    res.status(500).json({ error: 'Callback processing error' });
  }
});

// -------------------------------------------------------------
// ANNOUNCEMENTS & NOTIFICATIONS
// -------------------------------------------------------------
app.get('/api/announcements', (req, res) => {
  try {
    const announcements = db.prepare('SELECT * FROM announcements WHERE is_active = 1 ORDER BY created_at DESC').all();
    res.json(announcements);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch announcements' });
  }
});

app.get('/api/notifications', requireAuth, (req: AuthRequest, res) => {
  try {
    const notifications = db.prepare(`
      SELECT * FROM notifications
      WHERE user_id = ? OR user_id IS NULL
      ORDER BY created_at DESC
      LIMIT 30
    `).all(req.user!.id);
    res.json(notifications);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

app.put('/api/notifications/:id/read', requireAuth, (req: AuthRequest, res) => {
  try {
    db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ? AND (user_id = ? OR user_id IS NULL)').run(req.params.id, req.user!.id);
    res.json({ success: true });
  } catch (err) {
    res.json({ success: false });
  }
});

// -------------------------------------------------------------
// ABOUT CHOIR
// -------------------------------------------------------------
app.get('/api/about', (req, res) => {
  try {
    const settings = db.prepare('SELECT key, value FROM app_settings').all() as any[];
    const map: Record<string, string> = {};
    settings.forEach(s => { map[s.key] = s.value; });

    res.json({
      choir_name: map.choir_name || 'La Lumiere Choir',
      affiliation: map.church_affiliation || 'ADEPR Nyanza, Kicukiro District, Rwanda',
      about_story: map.about_story || '',
      mission: map.mission_statement || '',
      vision: map.vision_statement || '',
      contact_phone: map.contact_phone || '+250 788 000 000',
      contact_email: map.contact_email || 'info@lalumierechoir.rw',
      socials: {
        youtube: 'https://youtube.com/@LaLumiereChoir',
        instagram: 'https://instagram.com/lalumierechoir',
        facebook: 'https://facebook.com/lalumierechoir'
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch choir about info' });
  }
});

// -------------------------------------------------------------
// PUBLIC CONTENT ENDPOINTS (Events, Documents, Articles)
// -------------------------------------------------------------
// -------------------------------------------------------------
// PUBLIC & USER EVENTS ENDPOINTS (Upcoming Events & Interests)
// -------------------------------------------------------------
app.get('/api/events', optionalAuth, (req: AuthRequest, res) => {
  try {
    const { category, search, upcoming_only, all } = req.query;
    const currentUserId = req.user?.id || null;

    let query = `
      SELECT e.*,
             (SELECT COUNT(*) FROM event_interested ei WHERE ei.event_id = e.id) as interested_count,
             CASE WHEN ? IS NOT NULL AND EXISTS(SELECT 1 FROM event_interested ei WHERE ei.event_id = e.id AND ei.user_id = ?) THEN 1 ELSE 0 END as is_interested
      FROM events e
      WHERE (e.is_deleted = 0 OR e.is_deleted IS NULL)
    `;
    const params: any[] = [currentUserId, currentUserId];

    if (all !== 'true') {
      // By default public sees only published, non-cancelled events
      query += ` AND (e.status = 'published' OR e.status IS NULL) AND (e.event_status != 'cancelled' OR e.event_status IS NULL)`;
    }

    if (category && category !== 'all') {
      query += ` AND LOWER(e.category) = LOWER(?)`;
      params.push(String(category).trim());
    }

    if (search && typeof search === 'string' && search.trim()) {
      const term = `%${search.trim()}%`;
      query += ` AND (e.title LIKE ? OR e.location LIKE ? OR e.description LIKE ? OR e.category LIKE ?)`;
      params.push(term, term, term, term);
    }

    if (upcoming_only !== 'false') {
      // Display events from yesterday onwards or with upcoming/ongoing status
      query += ` AND (e.event_status IN ('upcoming', 'ongoing') OR e.event_date >= DATE('now', '-1 day'))`;
    }

    query += ` ORDER BY e.event_date ASC, COALESCE(e.start_time, '00:00') ASC`;

    const events = db.prepare(query).all(...params) as any[];

    const formattedEvents = events.map(e => ({
      ...e,
      interested_count: Number(e.interested_count || 0),
      is_interested: Boolean(e.is_interested),
    }));

    res.json(formattedEvents);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

app.get('/api/events/categories', (req, res) => {
  try {
    const standardCategories = [
      { name: 'Choir Practice', name_rw: 'Imyitozo ya Korali' },
      { name: 'Ministry Event', name_rw: 'Ivugabutumwa & Amavuna' },
      { name: 'Special Performance', name_rw: 'Ibitaramo Byihariye' },
      { name: 'Concert', name_rw: 'Ibitaramo Bikomeye (Concerts)' },
      { name: 'Worship Night', name_rw: 'Ijoro ryo Kuramya' },
      { name: 'Fellowship', name_rw: 'Ubusabane & Amateraniro' },
    ];

    const counts = db.prepare(`
      SELECT category, COUNT(*) as count
      FROM events
      WHERE (is_deleted = 0 OR is_deleted IS NULL)
        AND (status = 'published' OR status IS NULL)
        AND (event_status != 'cancelled' OR event_status IS NULL)
      GROUP BY category
    `).all() as any[];

    const countMap = new Map(counts.map(c => [String(c.category || '').toLowerCase(), c.count]));

    const categoriesWithCount = standardCategories.map(cat => ({
      ...cat,
      count: countMap.get(cat.name.toLowerCase()) || 0,
    }));

    res.json(categoriesWithCount);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch event categories' });
  }
});

app.get('/api/events/user-interests', requireAuth, (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const rows = db.prepare('SELECT event_id FROM event_interested WHERE user_id = ?').all(userId) as any[];
    res.json({ event_ids: rows.map(r => r.event_id) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user event interests' });
  }
});

app.get('/api/events/:id', optionalAuth, (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user?.id || null;
    const isAdmin = isUserAdmin(req.user?.role);

    const event = db.prepare(`
      SELECT e.*,
             (SELECT COUNT(*) FROM event_interested ei WHERE ei.event_id = e.id) as interested_count,
             CASE WHEN ? IS NOT NULL AND EXISTS(SELECT 1 FROM event_interested ei WHERE ei.event_id = e.id AND ei.user_id = ?) THEN 1 ELSE 0 END as is_interested
      FROM events e
      WHERE e.id = ? AND (e.is_deleted = 0 OR e.is_deleted IS NULL)
    `).get(currentUserId, currentUserId, id) as any;

    if (!event) {
      return res.status(404).json({ error: 'Igikorwa ntikibonetse (Event not found)' });
    }

    event.interested_count = Number(event.interested_count || 0);
    event.is_interested = Boolean(event.is_interested);

    if (isAdmin) {
      event.interested_users = db.prepare(`
        SELECT u.id as user_id, u.name, u.email, u.phone, u.avatar_url, u.role, u.choir_voice, ei.created_at
        FROM event_interested ei
        JOIN users u ON ei.user_id = u.id
        WHERE ei.event_id = ?
        ORDER BY ei.created_at DESC
      `).all(id);
    }

    res.json(event);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch event details' });
  }
});

app.post('/api/events/:id/interest', requireAuth, (req: AuthRequest, res) => {
  try {
    const { id: eventId } = req.params;
    const userId = req.user!.id;
    const { interested } = req.body;

    const event = db.prepare('SELECT id, title FROM events WHERE id = ? AND (is_deleted = 0 OR is_deleted IS NULL)').get(eventId) as any;
    if (!event) {
      return res.status(404).json({ error: 'Igikorwa ntikibonetse (Event not found)' });
    }

    const existing = db.prepare('SELECT 1 FROM event_interested WHERE event_id = ? AND user_id = ?').get(eventId, userId);

    let isNowInterested: boolean;
    if (typeof interested === 'boolean') {
      if (interested) {
        db.prepare('INSERT OR IGNORE INTO event_interested (event_id, user_id) VALUES (?, ?)').run(eventId, userId);
        isNowInterested = true;
      } else {
        db.prepare('DELETE FROM event_interested WHERE event_id = ? AND user_id = ?').run(eventId, userId);
        isNowInterested = false;
      }
    } else {
      // Toggle
      if (existing) {
        db.prepare('DELETE FROM event_interested WHERE event_id = ? AND user_id = ?').run(eventId, userId);
        isNowInterested = false;
      } else {
        db.prepare('INSERT OR IGNORE INTO event_interested (event_id, user_id) VALUES (?, ?)').run(eventId, userId);
        isNowInterested = true;
      }
    }

    const countRow = db.prepare('SELECT COUNT(*) as count FROM event_interested WHERE event_id = ?').get(eventId) as any;
    const newCount = Number(countRow?.count || 0);

    // Real-time broadcast to all clients via SSE
    broadcastRealtimeEvent('event:interest', {
      event_id: eventId,
      user_id: userId,
      user_name: req.user!.name,
      is_interested: isNowInterested,
      interested_count: newCount,
    });

    logActivity(
      userId,
      req.user!.name,
      req.user!.role,
      isNowInterested ? 'EVENT_INTEREST_ADD' : 'EVENT_INTEREST_REMOVE',
      'events',
      eventId,
      `${isNowInterested ? 'Kugaragaza ubushake bwo kwitabira' : 'Kuvana ubushake bwo kwitabira'} igikorwa "${event.title}"`
    );

    res.json({
      success: true,
      event_id: eventId,
      is_interested: isNowInterested,
      interested_count: newCount,
      message: isNowInterested
        ? 'Wiyandikishije kugaragaza ko wishimiye iki gikorwa!'
        : 'Wavanyeho ukwifuza kwitabira iki gikorwa.',
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update interest' });
  }
});

app.get('/api/documents', (req, res) => {
  try {
    const docs = db.prepare(`
      SELECT d.*, s.title as song_title
      FROM documents d
      LEFT JOIN songs s ON d.song_id = s.id
      WHERE (d.is_deleted = 0 OR d.is_deleted IS NULL) AND d.status = 'published'
      ORDER BY d.created_at DESC
    `).all();
    res.json(docs);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

app.get('/api/content-articles', (req, res) => {
  try {
    const { type } = req.query;
    let query = `SELECT * FROM content_articles WHERE (is_deleted = 0 OR is_deleted IS NULL) AND status = 'published'`;
    const params: any[] = [];
    if (type && type !== 'all') {
      query += ` AND type = ?`;
      params.push(type);
    }
    query += ` ORDER BY published_at DESC, created_at DESC`;
    const articles = db.prepare(query).all(...params);
    res.json(articles);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch articles' });
  }
});

// -------------------------------------------------------------
// ADMIN MANAGEMENT ROUTES (requireAdmin / RBAC)
// -------------------------------------------------------------
app.get('/api/admin/metrics', requireAdmin, (req: AuthRequest, res) => {
  try {
    const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users').get() as any;
    const adminUsers = db.prepare("SELECT COUNT(*) as count FROM users WHERE role IN ('super_admin', 'admin', 'content_admin', 'moderator')").get() as any;
    const disabledUsers = db.prepare('SELECT COUNT(*) as count FROM users WHERE is_disabled = 1').get() as any;

    const totalSongs = db.prepare('SELECT COUNT(*) as count FROM songs WHERE (is_deleted = 0 OR is_deleted IS NULL)').get() as any;
    const publishedSongs = db.prepare("SELECT COUNT(*) as count FROM songs WHERE (is_deleted = 0 OR is_deleted IS NULL) AND (status = 'published' OR status IS NULL)").get() as any;
    const draftSongs = db.prepare("SELECT COUNT(*) as count FROM songs WHERE (is_deleted = 0 OR is_deleted IS NULL) AND status = 'draft'").get() as any;
    const releasedSongs = db.prepare("SELECT COUNT(*) as count FROM songs WHERE (is_deleted = 0 OR is_deleted IS NULL) AND release_status = 'released'").get() as any;
    const unreleasedSongs = db.prepare("SELECT COUNT(*) as count FROM songs WHERE (is_deleted = 0 OR is_deleted IS NULL) AND release_status = 'unreleased'").get() as any;
    const deletedSongs = db.prepare('SELECT COUNT(*) as count FROM songs WHERE is_deleted = 1').get() as any;

    const totalAudio = db.prepare('SELECT COUNT(*) as count FROM audio_tracks WHERE (is_deleted = 0 OR is_deleted IS NULL)').get() as any;
    const totalImages = db.prepare('SELECT COUNT(*) as count FROM images WHERE (is_deleted = 0 OR is_deleted IS NULL)').get() as any;
    const totalComments = db.prepare('SELECT COUNT(*) as count FROM comments WHERE (is_deleted = 0 OR is_deleted IS NULL)').get() as any;
    const pendingComments = db.prepare("SELECT COUNT(*) as count FROM comments WHERE (is_deleted = 0 OR is_deleted IS NULL) AND status = 'flagged'").get() as any;

    const totalAnnouncements = db.prepare('SELECT COUNT(*) as count FROM announcements WHERE (is_deleted = 0 OR is_deleted IS NULL)').get() as any;
    const totalEvents = db.prepare('SELECT COUNT(*) as count FROM events WHERE (is_deleted = 0 OR is_deleted IS NULL)').get() as any;
    const totalDocuments = db.prepare('SELECT COUNT(*) as count FROM documents WHERE (is_deleted = 0 OR is_deleted IS NULL)').get() as any;
    const totalArticles = db.prepare('SELECT COUNT(*) as count FROM content_articles WHERE (is_deleted = 0 OR is_deleted IS NULL)').get() as any;

    const donationsTotal = db.prepare("SELECT COALESCE(SUM(amount), 0) as total, COUNT(*) as count FROM payment_transactions WHERE status = 'successful'").get() as any;
    const pendingDonations = db.prepare("SELECT COUNT(*) as count FROM payment_transactions WHERE status = 'pending'").get() as any;

    const recentActivity = db.prepare(`
      SELECT * FROM activity_logs ORDER BY created_at DESC LIMIT 20
    `).all();

    res.json({
      totalUsers: totalUsers?.count || 0,
      adminUsers: adminUsers?.count || 0,
      disabledUsers: disabledUsers?.count || 0,
      totalSongs: totalSongs?.count || 0,
      publishedSongs: publishedSongs?.count || 0,
      draftSongs: draftSongs?.count || 0,
      releasedSongs: releasedSongs?.count || 0,
      unreleasedSongs: unreleasedSongs?.count || 0,
      deletedSongs: deletedSongs?.count || 0,
      totalAudio: totalAudio?.count || 0,
      totalImages: totalImages?.count || 0,
      totalComments: totalComments?.count || 0,
      pendingComments: pendingComments?.count || 0,
      totalAnnouncements: totalAnnouncements?.count || 0,
      totalEvents: totalEvents?.count || 0,
      totalDocuments: totalDocuments?.count || 0,
      totalArticles: totalArticles?.count || 0,
      successfulDonationsCount: donationsTotal?.count || 0,
      totalDonationsAmount: donationsTotal?.total || 0,
      pendingDonationsCount: pendingDonations?.count || 0,
      recentActivity
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to load admin metrics' });
  }
});

// Admin Global Search
app.get('/api/admin/search', requireAdmin, (req: AuthRequest, res) => {
  try {
    const q = req.query.q ? String(req.query.q).trim() : '';
    if (!q) {
      return res.json({ songs: [], announcements: [], events: [], users: [] });
    }
    const term = `%${q}%`;

    const songs = db.prepare(`
      SELECT id, title, composer, release_status, status
      FROM songs
      WHERE (is_deleted = 0 OR is_deleted IS NULL)
        AND (title LIKE ? OR composer LIKE ? OR song_number LIKE ?)
      LIMIT 10
    `).all(term, term, term);

    const announcements = db.prepare(`
      SELECT id, title, category, status
      FROM announcements
      WHERE (is_deleted = 0 OR is_deleted IS NULL)
        AND (title LIKE ? OR content LIKE ?)
      LIMIT 10
    `).all(term, term);

    const events = db.prepare(`
      SELECT id, title, location, event_date, status
      FROM events
      WHERE (is_deleted = 0 OR is_deleted IS NULL)
        AND (title LIKE ? OR location LIKE ?)
      LIMIT 10
    `).all(term, term);

    const users = db.prepare(`
      SELECT id, name, email, role, is_disabled
      FROM users
      WHERE name LIKE ? OR email LIKE ? OR phone LIKE ?
      LIMIT 10
    `).all(term, term, term);

    res.json({ songs, announcements, events, users });
  } catch (err) {
    res.status(500).json({ error: 'Search failed' });
  }
});

// -------------------------------------------------------------
// ADMIN SONGS MANAGEMENT
// -------------------------------------------------------------
app.get('/api/admin/songs', requireAdmin, (req: AuthRequest, res) => {
  try {
    const { search, category, status, release_status, include_deleted } = req.query;
    let query = `
      SELECT s.id, s.title, s.song_number, s.composer, s.category_id, s.release_status,
             s.release_date, s.description, s.cover_image_url, s.views_count,
             s.status, s.is_deleted, s.deleted_at, s.created_at, s.updated_at,
             sc.name as category_name,
             (SELECT COUNT(*) FROM audio_tracks at WHERE at.song_id = s.id AND (at.is_deleted = 0 OR at.is_deleted IS NULL)) as audio_count,
             (SELECT COUNT(*) FROM comments c WHERE c.song_id = s.id AND (c.is_deleted = 0 OR c.is_deleted IS NULL)) as comments_count,
             (SELECT content FROM lyrics l WHERE l.song_id = s.id LIMIT 1) as lyrics,
             (SELECT solfa_notation FROM lyrics l WHERE l.song_id = s.id LIMIT 1) as solfa_notation
      FROM songs s
      LEFT JOIN song_categories sc ON s.category_id = sc.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (include_deleted === 'true') {
      // show all including deleted
    } else {
      query += ` AND (s.is_deleted = 0 OR s.is_deleted IS NULL)`;
    }

    if (category && category !== 'all') {
      query += ` AND (s.category_id = ? OR sc.slug = ?)`;
      params.push(category, category);
    }

    if (status && status !== 'all') {
      query += ` AND s.status = ?`;
      params.push(status);
    }

    if (release_status && release_status !== 'all') {
      query += ` AND s.release_status = ?`;
      params.push(release_status);
    }

    if (search && typeof search === 'string' && search.trim()) {
      const term = `%${search.trim()}%`;
      query += ` AND (
        s.title LIKE ? OR
        s.composer LIKE ? OR
        s.song_number LIKE ? OR
        EXISTS (SELECT 1 FROM lyrics l WHERE l.song_id = s.id AND l.content LIKE ?)
      )`;
      params.push(term, term, term, term);
    }

    query += ` ORDER BY s.created_at DESC`;
    const songs = db.prepare(query).all(...params);
    res.json(songs);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch admin songs' });
  }
});

app.post('/api/admin/songs', requireAdmin, (req: AuthRequest, res) => {
  try {
    const {
      title,
      song_number,
      composer,
      category_id,
      release_status,
      release_date,
      description,
      cover_image_url,
      access_password,
      status,
      lyrics,
      solfa_notation,
      language,
      audio_tracks
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Umutwe w\'indirimbo urakenewe (Song title required)' });
    }

    const songId = 'song_' + Date.now();
    const pwdHash = access_password && access_password.trim() ? bcrypt.hashSync(access_password.trim(), 10) : null;
    const finalStatus = status === 'draft' ? 'draft' : 'published';
    const finalReleaseStatus = release_status === 'unreleased' ? 'unreleased' : 'released';

    db.prepare(`
      INSERT INTO songs (
        id, title, song_number, composer, category_id, release_status,
        release_date, description, cover_image_url, access_password_hash,
        status, is_deleted, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
    `).run(
      songId,
      title.trim(),
      song_number || null,
      composer?.trim() || 'La Lumiere Choir',
      category_id || null,
      finalReleaseStatus,
      release_date || null,
      description?.trim() || '',
      cover_image_url || '',
      pwdHash,
      finalStatus,
      req.user!.id
    );

    // Add lyrics & solfa
    if ((lyrics && lyrics.trim()) || (solfa_notation && solfa_notation.trim())) {
      db.prepare(`
        INSERT INTO lyrics (id, song_id, content, solfa_notation, language)
        VALUES (?, ?, ?, ?, ?)
      `).run('lyr_' + Date.now(), songId, lyrics?.trim() || '', solfa_notation?.trim() || null, language || 'rw');
    }

    // Add audio tracks if provided
    if (Array.isArray(audio_tracks)) {
      const insertTrk = db.prepare(`
        INSERT INTO audio_tracks (id, song_id, title, track_type, audio_url, duration_seconds, is_deleted, created_by)
        VALUES (?, ?, ?, ?, ?, ?, 0, ?)
      `);
      audio_tracks.forEach(trk => {
        if (trk.title && trk.audio_url) {
          insertTrk.run(
            'trk_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
            songId,
            trk.title.trim(),
            trk.track_type || 'full_song',
            trk.audio_url,
            trk.duration_seconds || 0,
            req.user!.id
          );
        }
      });
    }

    logActivity(req.user!.id, req.user!.name, req.user!.role, 'CREATE_SONG', 'songs', songId, `Added song "${title.trim()}" (${finalStatus}, ${finalReleaseStatus})`);

    res.status(201).json({ message: 'Indirimbo yongewemo neza (Song created successfully)', songId });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to create song' });
  }
});

app.put('/api/admin/songs/:id', requireAdmin, (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      song_number,
      composer,
      category_id,
      release_status,
      release_date,
      description,
      cover_image_url,
      access_password,
      status,
      lyrics,
      solfa_notation,
      language
    } = req.body;

    let pwdUpdateClause = '';
    const params: any[] = [
      title?.trim(),
      song_number || null,
      composer?.trim() || 'La Lumiere Choir',
      category_id || null,
      release_status || 'released',
      release_date || null,
      description || '',
      cover_image_url || '',
      status || 'published'
    ];

    if (access_password !== undefined) {
      if (access_password && access_password.trim()) {
        const hash = bcrypt.hashSync(access_password.trim(), 10);
        pwdUpdateClause = ', access_password_hash = ?';
        params.push(hash);
      } else if (release_status === 'released') {
        pwdUpdateClause = ', access_password_hash = NULL';
      }
    }

    params.push(id);

    db.prepare(`
      UPDATE songs
      SET title = ?, song_number = ?, composer = ?, category_id = ?, release_status = ?,
          release_date = ?, description = ?, cover_image_url = ?, status = ?,
          updated_at = CURRENT_TIMESTAMP ${pwdUpdateClause}
      WHERE id = ?
    `).run(...params);

    // Update lyrics
    if (lyrics !== undefined || solfa_notation !== undefined) {
      const existingLyrics = db.prepare('SELECT id FROM lyrics WHERE song_id = ?').get(id);
      if (existingLyrics) {
        db.prepare(`
          UPDATE lyrics
          SET content = COALESCE(?, content),
              solfa_notation = COALESCE(?, solfa_notation),
              language = COALESCE(?, language),
              updated_at = CURRENT_TIMESTAMP
          WHERE song_id = ?
        `).run(lyrics, solfa_notation, language, id);
      } else {
        db.prepare(`
          INSERT INTO lyrics (id, song_id, content, solfa_notation, language)
          VALUES (?, ?, ?, ?, ?)
        `).run('lyr_' + Date.now(), id, lyrics || '', solfa_notation || null, language || 'rw');
      }
    }

    logActivity(req.user!.id, req.user!.name, req.user!.role, 'UPDATE_SONG', 'songs', id, `Updated song "${title || id}"`);

    res.json({ message: 'Indirimbo yavuguruwe neza (Song updated successfully)' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update song' });
  }
});

// Soft Delete Song
app.delete('/api/admin/songs/:id', requireAdmin, (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    db.prepare('UPDATE songs SET is_deleted = 1, deleted_at = CURRENT_TIMESTAMP WHERE id = ?').run(id);

    logActivity(req.user!.id, req.user!.name, req.user!.role, 'DELETE_SONG', 'songs', id, `Soft-deleted song ${id}`);

    res.json({ message: 'Indirimbo yasibwe neza (Song deleted successfully)' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to delete song' });
  }
});

// Restore soft-deleted song
app.post('/api/admin/songs/:id/restore', requireAdmin, (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    db.prepare('UPDATE songs SET is_deleted = 0, deleted_at = NULL WHERE id = ?').run(id);

    logActivity(req.user!.id, req.user!.name, req.user!.role, 'RESTORE_SONG', 'songs', id, `Restored song ${id}`);

    res.json({ message: 'Indirimbo yagaruwe neza (Song restored successfully)' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to restore song' });
  }
});

// Quick toggle published / draft status
app.patch('/api/admin/songs/:id/status', requireAdmin, (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'published' | 'draft'
    if (!['published', 'draft'].includes(status)) {
      return res.status(400).json({ error: 'Imimerere itemewe (Invalid status)' });
    }

    db.prepare('UPDATE songs SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(status, id);

    logActivity(req.user!.id, req.user!.name, req.user!.role, 'STATUS_CHANGE', 'songs', id, `Changed song status to ${status}`);

    res.json({ message: `Imimerere y\'indirimbo yahinduwe kuri ${status}`, status });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update song status' });
  }
});

// Quick toggle release status (released / unreleased)
app.patch('/api/admin/songs/:id/release-status', requireAdmin, (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { release_status, access_password } = req.body; // 'released' | 'unreleased'

    if (!['released', 'unreleased'].includes(release_status)) {
      return res.status(400).json({ error: 'Release status itemewe' });
    }

    let pwdClause = '';
    const params: any[] = [release_status];

    if (release_status === 'released') {
      pwdClause = ', access_password_hash = NULL';
    } else if (access_password && access_password.trim()) {
      pwdClause = ', access_password_hash = ?';
      params.push(bcrypt.hashSync(access_password.trim(), 10));
    }

    params.push(id);

    db.prepare(`UPDATE songs SET release_status = ?, updated_at = CURRENT_TIMESTAMP ${pwdClause} WHERE id = ?`).run(...params);

    logActivity(req.user!.id, req.user!.name, req.user!.role, 'RELEASE_STATUS_CHANGE', 'songs', id, `Changed release status to ${release_status}`);

    res.json({ message: `Indirimbo yabaye ${release_status}`, release_status });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update release status' });
  }
});

// -------------------------------------------------------------
// AUDIO UPLOAD & MANAGEMENT
// -------------------------------------------------------------
app.get('/api/admin/audio-tracks', requireAdmin, (req: AuthRequest, res) => {
  try {
    const { song_id, search } = req.query;
    let query = `
      SELECT at.*, s.title as song_title, s.release_status as song_release_status
      FROM audio_tracks at
      LEFT JOIN songs s ON at.song_id = s.id
      WHERE (at.is_deleted = 0 OR at.is_deleted IS NULL)
    `;
    const params: any[] = [];
    if (song_id) {
      query += ` AND at.song_id = ?`;
      params.push(song_id);
    }
    if (search && typeof search === 'string') {
      query += ` AND (at.title LIKE ? OR s.title LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }
    query += ` ORDER BY at.created_at DESC`;

    const tracks = db.prepare(query).all(...params);
    res.json(tracks);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch audio tracks' });
  }
});

// Dedicated audio upload endpoint with format and size validation
app.post('/api/admin/upload/audio', requireAdmin, upload.single('file'), (req: AuthRequest, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nta dosiye y\'ijwi yatoranyijwe (No audio file uploaded)' });
    }

    const allowedMime = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/mp4', 'audio/x-m4a', 'audio/m4a', 'audio/aac', 'audio/ogg'];
    const ext = path.extname(req.file.originalname).toLowerCase();
    const allowedExts = ['.mp3', '.wav', '.m4a', '.aac', '.ogg'];

    if (!allowedMime.includes(req.file.mimetype) && !allowedExts.includes(ext)) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'Ubwoko bw\'idosiye ntibwemewe. Koresha MP3, WAV, M4A, AAC, cyangwa OGG gusa.' });
    }

    const fileUrl = `/uploads/${req.file.filename}`;
    const { song_id, title, track_type, duration_seconds } = req.body;

    let trackId = 'trk_' + Date.now();
    if (song_id) {
      db.prepare(`
        INSERT INTO audio_tracks (id, song_id, title, track_type, audio_url, duration_seconds, file_size_bytes, mime_type, original_filename, created_by, is_deleted)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
      `).run(
        trackId,
        song_id,
        title?.trim() || req.file.originalname,
        track_type || 'full_song',
        fileUrl,
        Number(duration_seconds) || 0,
        req.file.size,
        req.file.mimetype,
        req.file.originalname,
        req.user!.id
      );

      logActivity(req.user!.id, req.user!.name, req.user!.role, 'UPLOAD_AUDIO', 'audio_tracks', trackId, `Uploaded audio "${req.file.originalname}" for song ${song_id}`);
    }

    res.json({
      track_id: trackId,
      url: fileUrl,
      filename: req.file.filename,
      original_filename: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
      message: 'Idosiye y\'ijwi yashyizwemo neza (Audio file uploaded successfully)'
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Upload failed: ' + (err.message || 'Unknown error') });
  }
});

// Single song audio track create
app.post('/api/admin/songs/:id/audio', requireAdmin, (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { title, track_type, audio_url, duration_seconds } = req.body;

    if (!title || !audio_url) {
      return res.status(400).json({ error: 'Umutwe n\'aho ijwi riboneka birakenewe' });
    }

    const trkId = 'trk_' + Date.now();
    db.prepare(`
      INSERT INTO audio_tracks (id, song_id, title, track_type, audio_url, duration_seconds, is_deleted, created_by)
      VALUES (?, ?, ?, ?, ?, ?, 0, ?)
    `).run(trkId, id, title.trim(), track_type || 'full_song', audio_url, duration_seconds || 0, req.user!.id);

    logActivity(req.user!.id, req.user!.name, req.user!.role, 'ADD_AUDIO_TRACK', 'audio_tracks', trkId, `Added track "${title}" to song ${id}`);

    res.status(201).json({ message: 'Ijwi ryongewemo neza', trackId: trkId });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to add audio track' });
  }
});

// Soft delete audio track
app.delete('/api/admin/audio-tracks/:id', requireAdmin, (req: AuthRequest, res) => {
  try {
    db.prepare('UPDATE audio_tracks SET is_deleted = 1 WHERE id = ?').run(req.params.id);

    logActivity(req.user!.id, req.user!.name, req.user!.role, 'DELETE_AUDIO', 'audio_tracks', req.params.id, `Soft-deleted audio track ${req.params.id}`);

    res.json({ message: 'Ijwi ryasibwe neza' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete audio track' });
  }
});

// -------------------------------------------------------------
// IMAGE UPLOAD & MEDIA LIBRARY
// -------------------------------------------------------------
app.get('/api/admin/images', requireAdmin, (req: AuthRequest, res) => {
  try {
    const { category, search } = req.query;
    let query = `SELECT * FROM images WHERE (is_deleted = 0 OR is_deleted IS NULL)`;
    const params: any[] = [];

    if (category && category !== 'all') {
      query += ` AND category = ?`;
      params.push(category);
    }
    if (search && typeof search === 'string') {
      query += ` AND (title LIKE ? OR original_filename LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }
    query += ` ORDER BY created_at DESC`;

    const images = db.prepare(query).all(...params);
    res.json(images);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch images' });
  }
});

app.post('/api/admin/upload/image', requireAdmin, upload.single('file'), (req: AuthRequest, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nta foto yatoranyijwe (No image selected)' });
    }

    const allowedMime = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
    const ext = path.extname(req.file.originalname).toLowerCase();
    const allowedExts = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg'];

    if (!allowedMime.includes(req.file.mimetype) && !allowedExts.includes(ext)) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'Ubwoko bw\'ifoto ntibwemewe. Koresha JPG, PNG, WEBP, GIF, cyangwa SVG.' });
    }

    const fileUrl = `/uploads/${req.file.filename}`;
    const { category, title } = req.body;
    const imgId = 'img_' + Date.now();

    db.prepare(`
      INSERT INTO images (id, title, url, category, file_size_bytes, mime_type, original_filename, created_by, is_deleted)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)
    `).run(
      imgId,
      title?.trim() || req.file.originalname,
      fileUrl,
      category || 'general',
      req.file.size,
      req.file.mimetype,
      req.file.originalname,
      req.user!.id
    );

    logActivity(req.user!.id, req.user!.name, req.user!.role, 'UPLOAD_IMAGE', 'images', imgId, `Uploaded image "${req.file.originalname}" (${category || 'general'})`);

    res.json({
      id: imgId,
      url: fileUrl,
      filename: req.file.filename,
      original_filename: req.file.originalname,
      size: req.file.size,
      category: category || 'general',
      message: 'Ifoto yashyizwemo neza (Image uploaded successfully)'
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Image upload failed' });
  }
});

app.delete('/api/admin/images/:id', requireAdmin, (req: AuthRequest, res) => {
  try {
    db.prepare('UPDATE images SET is_deleted = 1 WHERE id = ?').run(req.params.id);

    logActivity(req.user!.id, req.user!.name, req.user!.role, 'DELETE_IMAGE', 'images', req.params.id, `Soft-deleted image ${req.params.id}`);

    res.json({ message: 'Ifoto yasibwe neza' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete image' });
  }
});

// -------------------------------------------------------------
// ANNOUNCEMENTS CMS
// -------------------------------------------------------------
app.get('/api/admin/announcements', requireAdmin, (req: AuthRequest, res) => {
  try {
    const announcements = db.prepare(`
      SELECT * FROM announcements
      WHERE (is_deleted = 0 OR is_deleted IS NULL)
      ORDER BY created_at DESC
    `).all();
    res.json(announcements);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch admin announcements' });
  }
});

app.post('/api/admin/announcements', requireAdmin, (req: AuthRequest, res) => {
  try {
    const { title, content, category, image_url, status } = req.body;
    if (!title || !content) {
      return res.status(400).json({ error: 'Umutwe n\'ubutumwa birakenewe (Title and content required)' });
    }

    const id = 'ann_' + Date.now();
    const finalStatus = status === 'draft' ? 'draft' : 'published';
    const isActive = finalStatus === 'published' ? 1 : 0;

    db.prepare(`
      INSERT INTO announcements (id, title, content, category, image_url, status, is_active, is_deleted, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)
    `).run(id, title.trim(), content.trim(), category || 'general', image_url || '', finalStatus, isActive, req.user!.id);

    logActivity(req.user!.id, req.user!.name, req.user!.role, 'CREATE_ANNOUNCEMENT', 'announcements', id, `Created announcement "${title}" (${finalStatus})`);

    res.status(201).json({ message: 'Itangazo ryashyizwemo neza', id });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to create announcement' });
  }
});

app.put('/api/admin/announcements/:id', requireAdmin, (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { title, content, category, image_url, status } = req.body;
    const finalStatus = status === 'draft' ? 'draft' : 'published';
    const isActive = finalStatus === 'published' ? 1 : 0;

    db.prepare(`
      UPDATE announcements
      SET title = ?, content = ?, category = ?, image_url = ?, status = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(title.trim(), content.trim(), category || 'general', image_url || '', finalStatus, isActive, id);

    logActivity(req.user!.id, req.user!.name, req.user!.role, 'UPDATE_ANNOUNCEMENT', 'announcements', id, `Updated announcement "${title}"`);

    res.json({ message: 'Itangazo ryavuguruwe neza' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update announcement' });
  }
});

app.delete('/api/admin/announcements/:id', requireAdmin, (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    db.prepare('UPDATE announcements SET is_deleted = 1, is_active = 0 WHERE id = ?').run(id);

    logActivity(req.user!.id, req.user!.name, req.user!.role, 'DELETE_ANNOUNCEMENT', 'announcements', id, `Soft-deleted announcement ${id}`);

    res.json({ message: 'Itangazo ryasibwe neza' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete announcement' });
  }
});

app.patch('/api/admin/announcements/:id/status', requireAdmin, (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const finalStatus = status === 'draft' ? 'draft' : 'published';
    const isActive = finalStatus === 'published' ? 1 : 0;

    db.prepare('UPDATE announcements SET status = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(finalStatus, isActive, id);

    logActivity(req.user!.id, req.user!.name, req.user!.role, 'STATUS_CHANGE', 'announcements', id, `Changed announcement status to ${finalStatus}`);

    res.json({ message: `Imimerere y\'itangazo yahinduwe kuri ${finalStatus}`, status: finalStatus });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update status' });
  }
});

// -------------------------------------------------------------
// EVENTS CMS (Full-Featured with Real-time & Interested Registrations)
// -------------------------------------------------------------
app.get('/api/admin/events', requireAdmin, (req: AuthRequest, res) => {
  try {
    const { search, category, status, include_deleted } = req.query;

    let query = `
      SELECT e.*,
             (SELECT COUNT(*) FROM event_interested ei WHERE ei.event_id = e.id) as interested_count
      FROM events e
      WHERE 1=1
    `;
    const params: any[] = [];

    if (include_deleted !== 'true') {
      query += ` AND (e.is_deleted = 0 OR e.is_deleted IS NULL)`;
    }

    if (category && category !== 'all') {
      query += ` AND LOWER(e.category) = LOWER(?)`;
      params.push(String(category).trim());
    }

    if (status && status !== 'all') {
      query += ` AND (e.status = ? OR e.event_status = ?)`;
      params.push(status, status);
    }

    if (search && typeof search === 'string' && search.trim()) {
      const term = `%${search.trim()}%`;
      query += ` AND (e.title LIKE ? OR e.location LIKE ? OR e.description LIKE ?)`;
      params.push(term, term, term);
    }

    query += ` ORDER BY e.event_date DESC, e.created_at DESC`;

    const events = db.prepare(query).all(...params) as any[];

    // Fetch quick preview of interested users for each event
    const eventsWithUsers = events.map(ev => {
      const interestedUsers = db.prepare(`
        SELECT u.id as user_id, u.name, u.email, u.phone, u.avatar_url, u.role, u.choir_voice, ei.created_at
        FROM event_interested ei
        JOIN users u ON ei.user_id = u.id
        WHERE ei.event_id = ?
        ORDER BY ei.created_at DESC
        LIMIT 6
      `).all(ev.id);

      return {
        ...ev,
        interested_count: Number(ev.interested_count || 0),
        interested_users: interestedUsers,
      };
    });

    res.json(eventsWithUsers);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch admin events' });
  }
});

app.get('/api/admin/events/:id/interested-users', requireAdmin, (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const event = db.prepare('SELECT * FROM events WHERE id = ?').get(id) as any;
    if (!event) {
      return res.status(404).json({ error: 'Igikorwa ntikibonetse' });
    }

    const users = db.prepare(`
      SELECT u.id as user_id, u.name, u.email, u.phone, u.avatar_url, u.role, u.choir_voice, u.choir_role, ei.created_at
      FROM event_interested ei
      JOIN users u ON ei.user_id = u.id
      WHERE ei.event_id = ?
      ORDER BY ei.created_at DESC
    `).all(id);

    res.json({
      event: {
        id: event.id,
        title: event.title,
        category: event.category,
        event_date: event.event_date,
        location: event.location,
      },
      total_interested: users.length,
      users,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch interested users' });
  }
});

app.post('/api/admin/events', requireAdmin, (req: AuthRequest, res) => {
  try {
    const {
      title,
      category,
      description,
      event_date,
      start_time,
      end_time,
      location,
      image_url,
      status,
      event_status,
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Umutwe w\'igikorwa urakenewe (Event title required)' });
    }
    if (!event_date || !event_date.trim()) {
      return res.status(400).json({ error: 'Itariki y\'igikorwa irakenewe (Event date required)' });
    }

    const id = 'ev_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const finalStatus = status === 'draft' ? 'draft' : 'published';
    const finalEventStatus = ['upcoming', 'ongoing', 'completed', 'cancelled'].includes(event_status)
      ? event_status
      : 'upcoming';
    const finalCategory = category?.trim() || 'Choir Practice';

    db.prepare(`
      INSERT INTO events (
        id, title, category, description, event_date, start_time, end_time,
        location, image_url, status, event_status, is_deleted, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
    `).run(
      id,
      title.trim(),
      finalCategory,
      description?.trim() || '',
      event_date.trim(),
      start_time?.trim() || '15:00',
      end_time?.trim() || '18:00',
      location?.trim() || '',
      image_url?.trim() || '',
      finalStatus,
      finalEventStatus,
      req.user!.id
    );

    const createdEvent = db.prepare(`
      SELECT e.*, 0 as interested_count
      FROM events e WHERE e.id = ?
    `).get(id) as any;

    logActivity(
      req.user!.id,
      req.user!.name,
      req.user!.role,
      'CREATE_EVENT',
      'events',
      id,
      `Yashyizeho igikorwa gishya "${title.trim()}" kuri itariki ya ${event_date}`
    );

    // Broadcast real-time event creation via SSE
    broadcastRealtimeEvent('events:created', { event: createdEvent });

    res.status(201).json({
      message: 'Igikorwa cyashyizwemo neza (Event created successfully)',
      event: createdEvent,
      id,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to create event' });
  }
});

app.put('/api/admin/events/:id', requireAdmin, (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      category,
      description,
      event_date,
      start_time,
      end_time,
      location,
      image_url,
      status,
      event_status,
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Umutwe w\'igikorwa urakenewe' });
    }
    if (!event_date || !event_date.trim()) {
      return res.status(400).json({ error: 'Itariki y\'igikorwa irakenewe' });
    }

    db.prepare(`
      UPDATE events
      SET title = ?,
          category = ?,
          description = ?,
          event_date = ?,
          start_time = ?,
          end_time = ?,
          location = ?,
          image_url = ?,
          status = COALESCE(?, status),
          event_status = COALESCE(?, event_status),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      title.trim(),
      category?.trim() || 'Choir Practice',
      description?.trim() || '',
      event_date.trim(),
      start_time?.trim() || '15:00',
      end_time?.trim() || '18:00',
      location?.trim() || '',
      image_url?.trim() || '',
      status || 'published',
      event_status || 'upcoming',
      id
    );

    const updatedEvent = db.prepare(`
      SELECT e.*,
             (SELECT COUNT(*) FROM event_interested ei WHERE ei.event_id = e.id) as interested_count
      FROM events e WHERE e.id = ?
    `).get(id) as any;

    logActivity(
      req.user!.id,
      req.user!.name,
      req.user!.role,
      'UPDATE_EVENT',
      'events',
      id,
      `Yavuguruye igikorwa "${title.trim()}"`
    );

    // Broadcast real-time update via SSE
    broadcastRealtimeEvent('events:updated', { event: updatedEvent });

    res.json({
      message: 'Igikorwa cyavuguruwe neza (Event updated successfully)',
      event: updatedEvent,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update event' });
  }
});

app.delete('/api/admin/events/:id', requireAdmin, (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const event = db.prepare('SELECT title FROM events WHERE id = ?').get(id) as any;

    db.prepare('UPDATE events SET is_deleted = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(id);

    logActivity(
      req.user!.id,
      req.user!.name,
      req.user!.role,
      'DELETE_EVENT',
      'events',
      id,
      `Yasibye igikorwa "${event?.title || id}"`
    );

    // Broadcast real-time deletion via SSE
    broadcastRealtimeEvent('events:deleted', { id });

    res.json({ message: 'Igikorwa cyasibwe neza (Event deleted successfully)', id });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to delete event' });
  }
});

app.patch('/api/admin/events/:id/status', requireAdmin, (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { status, event_status } = req.body;

    const event = db.prepare('SELECT * FROM events WHERE id = ?').get(id) as any;
    if (!event) {
      return res.status(404).json({ error: 'Igikorwa ntikibonetse' });
    }

    const finalStatus = status !== undefined ? (status === 'draft' ? 'draft' : 'published') : event.status;
    const finalEventStatus = event_status !== undefined ? event_status : event.event_status;

    db.prepare(`
      UPDATE events
      SET status = ?, event_status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(finalStatus, finalEventStatus, id);

    logActivity(
      req.user!.id,
      req.user!.name,
      req.user!.role,
      'STATUS_CHANGE',
      'events',
      id,
      `Yahinduye status y'igikorwa "${event.title}": ${finalStatus} (${finalEventStatus})`
    );

    const updated = db.prepare(`
      SELECT e.*, (SELECT COUNT(*) FROM event_interested ei WHERE ei.event_id = e.id) as interested_count
      FROM events e WHERE e.id = ?
    `).get(id);

    // Broadcast real-time update
    broadcastRealtimeEvent('events:updated', { event: updated });

    res.json({
      message: `Imimerere yahinduwe neza`,
      status: finalStatus,
      event_status: finalEventStatus,
      event: updated,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update event status' });
  }
});

app.patch('/api/admin/events/:id/cancel', requireAdmin, (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const event = db.prepare('SELECT title FROM events WHERE id = ?').get(id) as any;
    if (!event) {
      return res.status(404).json({ error: 'Igikorwa ntikibonetse' });
    }

    db.prepare(`
      UPDATE events
      SET event_status = 'cancelled', updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(id);

    logActivity(
      req.user!.id,
      req.user!.name,
      req.user!.role,
      'CANCEL_EVENT',
      'events',
      id,
      `Yahagaritse igikorwa "${event.title}"`
    );

    const updated = db.prepare('SELECT * FROM events WHERE id = ?').get(id);

    // Broadcast real-time cancellation
    broadcastRealtimeEvent('events:cancelled', { id, event: updated });

    res.json({
      message: 'Igikorwa cyahagaritswe neza (Event marked as cancelled)',
      event: updated,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to cancel event' });
  }
});

// -------------------------------------------------------------
// DOCUMENTS CMS (Sheet Music, Solfa, Guides)
// -------------------------------------------------------------
app.get('/api/admin/documents', requireAdmin, (req: AuthRequest, res) => {
  try {
    const docs = db.prepare(`
      SELECT d.*, s.title as song_title
      FROM documents d
      LEFT JOIN songs s ON d.song_id = s.id
      WHERE (d.is_deleted = 0 OR d.is_deleted IS NULL)
      ORDER BY d.created_at DESC
    `).all();
    res.json(docs);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch admin documents' });
  }
});

app.post('/api/admin/upload/document', requireAdmin, upload.single('file'), (req: AuthRequest, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nta nyandiko yatoranyijwe (No document uploaded)' });
    }

    const fileUrl = `/uploads/${req.file.filename}`;
    const { title, doc_type, song_id, status } = req.body;
    const docId = 'doc_' + Date.now();

    db.prepare(`
      INSERT INTO documents (id, title, doc_type, file_url, song_id, file_size_bytes, mime_type, original_filename, status, is_deleted, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
    `).run(
      docId,
      title?.trim() || req.file.originalname,
      doc_type || 'sheet_music',
      fileUrl,
      song_id || null,
      req.file.size,
      req.file.mimetype,
      req.file.originalname,
      status || 'published',
      req.user!.id
    );

    logActivity(req.user!.id, req.user!.name, req.user!.role, 'UPLOAD_DOCUMENT', 'documents', docId, `Uploaded document "${req.file.originalname}"`);

    res.json({
      id: docId,
      url: fileUrl,
      filename: req.file.filename,
      original_filename: req.file.originalname,
      message: 'Inyandiko yashyizwemo neza (Document uploaded successfully)'
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Document upload failed' });
  }
});

app.delete('/api/admin/documents/:id', requireAdmin, (req: AuthRequest, res) => {
  try {
    db.prepare('UPDATE documents SET is_deleted = 1 WHERE id = ?').run(req.params.id);

    logActivity(req.user!.id, req.user!.name, req.user!.role, 'DELETE_DOCUMENT', 'documents', req.params.id, `Soft-deleted document ${req.params.id}`);

    res.json({ message: 'Inyandiko yasibwe neza' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete document' });
  }
});

// -------------------------------------------------------------
// CONTENT ARTICLES (Choir News, Devotionals, Videos, Notices)
// -------------------------------------------------------------
app.get('/api/admin/content-articles', requireAdmin, (req: AuthRequest, res) => {
  try {
    const articles = db.prepare(`
      SELECT * FROM content_articles
      WHERE (is_deleted = 0 OR is_deleted IS NULL)
      ORDER BY created_at DESC
    `).all();
    res.json(articles);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch content articles' });
  }
});

app.post('/api/admin/content-articles', requireAdmin, (req: AuthRequest, res) => {
  try {
    const { title, type, content, summary, cover_image_url, video_url, status } = req.body;
    if (!title || !content) {
      return res.status(400).json({ error: 'Umutwe n\'ibiri mu nyandiko birakenewe' });
    }

    const id = 'art_' + Date.now();
    const finalStatus = status === 'draft' ? 'draft' : 'published';

    db.prepare(`
      INSERT INTO content_articles (id, title, type, content, summary, cover_image_url, video_url, status, is_deleted, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
    `).run(
      id,
      title.trim(),
      type || 'news',
      content.trim(),
      summary?.trim() || '',
      cover_image_url || '',
      video_url || '',
      finalStatus,
      req.user!.id
    );

    logActivity(req.user!.id, req.user!.name, req.user!.role, 'CREATE_ARTICLE', 'content_articles', id, `Created article "${title}" (${type})`);

    res.status(201).json({ message: 'Ingingo yashyizwemo neza', id });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to create article' });
  }
});

app.put('/api/admin/content-articles/:id', requireAdmin, (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { title, type, content, summary, cover_image_url, video_url, status } = req.body;

    db.prepare(`
      UPDATE content_articles
      SET title = ?, type = ?, content = ?, summary = ?, cover_image_url = ?, video_url = ?, status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      title.trim(),
      type || 'news',
      content.trim(),
      summary?.trim() || '',
      cover_image_url || '',
      video_url || '',
      status || 'published',
      id
    );

    logActivity(req.user!.id, req.user!.name, req.user!.role, 'UPDATE_ARTICLE', 'content_articles', id, `Updated article "${title}"`);

    res.json({ message: 'Ingingo yavuguruwe neza' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update article' });
  }
});

app.delete('/api/admin/content-articles/:id', requireAdmin, (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    db.prepare('UPDATE content_articles SET is_deleted = 1 WHERE id = ?').run(id);

    logActivity(req.user!.id, req.user!.name, req.user!.role, 'DELETE_ARTICLE', 'content_articles', id, `Soft-deleted article ${id}`);

    res.json({ message: 'Ingingo yasibwe neza' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete article' });
  }
});

// -------------------------------------------------------------
// COMMENTS MODERATION
// -------------------------------------------------------------
app.get('/api/admin/comments', requireAdmin, (req: AuthRequest, res) => {
  try {
    const { status, song_id, search } = req.query;
    let query = `
      SELECT c.*, u.name as user_name, u.email as user_email, u.is_disabled as user_disabled, s.title as song_title
      FROM comments c
      JOIN users u ON c.user_id = u.id
      JOIN songs s ON c.song_id = s.id
      WHERE (c.is_deleted = 0 OR c.is_deleted IS NULL)
    `;
    const params: any[] = [];

    if (status && status !== 'all') {
      query += ` AND c.status = ?`;
      params.push(status);
    }
    if (song_id && song_id !== 'all') {
      query += ` AND c.song_id = ?`;
      params.push(song_id);
    }
    if (search && typeof search === 'string') {
      query += ` AND (c.content LIKE ? OR u.name LIKE ? OR s.title LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    query += ` ORDER BY c.created_at DESC LIMIT 100`;

    const comments = db.prepare(query).all(...params);
    res.json(comments);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch comments for moderation' });
  }
});

app.put('/api/admin/comments/:id/status', requireAdmin, (req: AuthRequest, res) => {
  try {
    const { status } = req.body; // 'visible', 'hidden', 'flagged'
    if (!['visible', 'hidden', 'flagged'].includes(status)) {
      return res.status(400).json({ error: 'Status itemewe' });
    }

    db.prepare('UPDATE comments SET status = ? WHERE id = ?').run(status, req.params.id);

    logActivity(req.user!.id, req.user!.name, req.user!.role, 'MODERATE_COMMENT', 'comments', req.params.id, `Comment status set to ${status}`);

    res.json({ message: `Imimerere y\'igitekerezo yahinduwe kuri ${status}` });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update comment status' });
  }
});

app.delete('/api/admin/comments/:id', requireAdmin, (req: AuthRequest, res) => {
  try {
    db.prepare('UPDATE comments SET is_deleted = 1 WHERE id = ?').run(req.params.id);

    logActivity(req.user!.id, req.user!.name, req.user!.role, 'DELETE_COMMENT', 'comments', req.params.id, `Soft-deleted comment ${req.params.id}`);

    res.json({ message: 'Igitekerezo cyasibwe neza' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete comment' });
  }
});

// Block/disable a user who wrote abusive comments
app.post('/api/admin/users/:id/block', requireAdmin, (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    db.prepare('UPDATE users SET is_disabled = 1 WHERE id = ?').run(id);

    logActivity(req.user!.id, req.user!.name, req.user!.role, 'BLOCK_USER', 'users', id, `Blocked/disabled user account ${id}`);

    res.json({ message: 'Konti y\'umukoresha yahagaritswe (User blocked)' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to block user' });
  }
});

// -------------------------------------------------------------
// USER MANAGEMENT & ROLE-BASED ACCESS CONTROL
// -------------------------------------------------------------
app.get('/api/admin/roles', requireAdmin, (req: AuthRequest, res) => {
  try {
    const roles = db.prepare('SELECT * FROM roles ORDER BY id ASC').all();
    res.json(roles);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch roles' });
  }
});

app.get('/api/admin/users', requireAdmin, (req: AuthRequest, res) => {
  try {
    const { search, role, status } = req.query;
    let query = `
      SELECT id, name, email, phone, role, avatar_url, is_disabled, created_at,
             (SELECT COUNT(*) FROM comments c WHERE c.user_id = u.id) as comments_count,
             (SELECT COUNT(*) FROM payment_transactions pt WHERE pt.user_id = u.id AND pt.status = 'successful') as donations_count
      FROM users u
      WHERE 1=1
    `;
    const params: any[] = [];

    if (role && role !== 'all') {
      query += ` AND u.role = ?`;
      params.push(role);
    }

    if (status === 'active') {
      query += ` AND (u.is_disabled = 0 OR u.is_disabled IS NULL)`;
    } else if (status === 'disabled') {
      query += ` AND u.is_disabled = 1`;
    }

    if (search && typeof search === 'string' && search.trim()) {
      const term = `%${search.trim()}%`;
      query += ` AND (u.name LIKE ? OR u.email LIKE ? OR u.phone LIKE ?)`;
      params.push(term, term, term);
    }

    query += ` ORDER BY u.created_at DESC`;
    const users = db.prepare(query).all(...params);
    res.json(users);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

app.all('/api/admin/users/:id/role', requireSuperAdmin, (req: AuthRequest, res) => {
  if (req.method !== 'PUT' && req.method !== 'PATCH') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    const { id } = req.params;
    const { role } = req.body;

    const validRoles = ['super_admin', 'admin', 'content_admin', 'moderator', 'normal_user', 'member', 'supporter', 'choir_member'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'Inshingano itemewe (Invalid role)' });
    }

    // Protect super admin account from demoting themselves accidentally
    if (id === req.user!.id && role !== 'super_admin') {
      return res.status(400).json({ error: 'Ntushobora kwikuraho ubuyobozi bukuru (Cannot demote yourself)' });
    }

    db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, id);

    logActivity(req.user!.id, req.user!.name, req.user!.role, 'CHANGE_USER_ROLE', 'users', id, `Changed role of user ${id} to ${role}`);

    res.json({ message: `Inshingano zahinduwe kuri ${role}`, role });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update user role' });
  }
});

app.all('/api/admin/users/:id/status', requireSuperAdmin, (req: AuthRequest, res) => {
  if (req.method !== 'PUT' && req.method !== 'PATCH') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    const { id } = req.params;
    const { is_disabled } = req.body;

    if (id === req.user!.id) {
      return res.status(400).json({ error: 'Ntushobora guhagarika konti yawe bwite (Cannot disable yourself)' });
    }

    const disabledVal = is_disabled ? 1 : 0;
    db.prepare('UPDATE users SET is_disabled = ? WHERE id = ?').run(disabledVal, id);

    logActivity(req.user!.id, req.user!.name, req.user!.role, 'CHANGE_USER_STATUS', 'users', id, `${disabledVal ? 'Disabled' : 'Enabled'} user account ${id}`);

    res.json({ message: `Konti y\'umukoresha ${disabledVal ? 'yahagaritswe' : 'yakomorewe'} neza`, is_disabled: disabledVal === 1 });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update user status' });
  }
});

// Member Directory API with server-side role verification
app.get('/api/admin/members', requireAdmin, (req: AuthRequest, res) => {
  try {
    const { search, role, status } = req.query;
    let query = `
      SELECT id, name, email, phone, role, avatar_url, choir_voice, choir_role, is_disabled, created_at,
             (SELECT COUNT(*) FROM comments c WHERE c.user_id = u.id) as comments_count,
             (SELECT COUNT(*) FROM payment_transactions pt WHERE pt.user_id = u.id AND pt.status = 'successful') as donations_count
      FROM users u
      WHERE 1=1
    `;
    const params: any[] = [];

    if (role && role !== 'all') {
      query += ` AND u.role = ?`;
      params.push(role);
    }

    if (status === 'active') {
      query += ` AND (u.is_disabled = 0 OR u.is_disabled IS NULL)`;
    } else if (status === 'disabled') {
      query += ` AND u.is_disabled = 1`;
    }

    if (search && typeof search === 'string' && search.trim()) {
      const term = `%${search.trim()}%`;
      query += ` AND (u.name LIKE ? OR u.email LIKE ? OR u.phone LIKE ? OR u.choir_voice LIKE ? OR u.choir_role LIKE ?)`;
      params.push(term, term, term, term, term);
    }

    query += ` ORDER BY u.created_at DESC`;
    const members = db.prepare(query).all(...params);
    res.json(members);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch admin members' });
  }
});

// Member Statistics API using Recharts data formats
app.get('/api/admin/members/stats', requireAdmin, (req: AuthRequest, res) => {
  try {
    const roleRows = db.prepare(`
      SELECT 
        CASE 
          WHEN role IN ('super_admin', 'admin') THEN 'Admin'
          WHEN role IN ('choir_member', 'member', 'content_admin', 'moderator') THEN 'Member'
          ELSE 'User'
        END as group_name,
        role,
        COUNT(*) as count
      FROM users
      GROUP BY role
    `).all() as any[];

    let adminCount = 0;
    let memberCount = 0;
    let userCount = 0;
    const breakdownByRole: Record<string, number> = {};

    for (const r of roleRows) {
      breakdownByRole[r.role] = r.count;
      if (r.group_name === 'Admin') adminCount += r.count;
      else if (r.group_name === 'Member') memberCount += r.count;
      else userCount += r.count;
    }

    const roleDistribution = [
      { name: 'Admin', count: adminCount, fill: '#1e3a8a' },
      { name: 'Member', count: memberCount, fill: '#059669' },
      { name: 'User', count: userCount, fill: '#d97706' },
    ];

    const trendsRows = db.prepare(`
      SELECT 
        strftime('%Y-%m', created_at) as month,
        COUNT(*) as registrations,
        SUM(CASE WHEN role IN ('super_admin', 'admin') THEN 1 ELSE 0 END) as admins,
        SUM(CASE WHEN role IN ('choir_member', 'member', 'content_admin', 'moderator') THEN 1 ELSE 0 END) as members,
        SUM(CASE WHEN role NOT IN ('super_admin', 'admin', 'choir_member', 'member', 'content_admin', 'moderator') THEN 1 ELSE 0 END) as users
      FROM users
      WHERE created_at >= date('now', '-6 months')
      GROUP BY strftime('%Y-%m', created_at)
      ORDER BY month ASC
    `).all() as any[];

    const registrationTrends = trendsRows.length > 0
      ? trendsRows.map(t => ({
          month: t.month || 'Current',
          registrations: t.registrations || 0,
          admins: t.admins || 0,
          members: t.members || 0,
          users: t.users || 0,
        }))
      : [
          { month: 'Bungura', registrations: adminCount + memberCount + userCount, admins: adminCount, members: memberCount, users: userCount }
        ];

    const totalUsers = adminCount + memberCount + userCount;
    const activeCount = (db.prepare('SELECT COUNT(*) as c FROM users WHERE is_disabled = 0 OR is_disabled IS NULL').get() as any)?.c || 0;
    const disabledCount = (db.prepare('SELECT COUNT(*) as c FROM users WHERE is_disabled = 1').get() as any)?.c || 0;

    res.json({
      totalUsers,
      activeCount,
      disabledCount,
      roleDistribution,
      registrationTrends,
      breakdownByRole
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to load member statistics' });
  }
});

// Member List CSV Export for local record-keeping
app.get('/api/admin/members/export', requireAdmin, (req: AuthRequest, res) => {
  try {
    const { search, role, status } = req.query;
    let query = `
      SELECT id, name, email, phone, role, choir_voice, choir_role, is_disabled, created_at
      FROM users
      WHERE 1=1
    `;
    const params: any[] = [];
    if (role && role !== 'all') {
      query += ` AND role = ?`;
      params.push(role);
    }
    if (status === 'active') {
      query += ` AND (is_disabled = 0 OR is_disabled IS NULL)`;
    } else if (status === 'disabled') {
      query += ` AND is_disabled = 1`;
    }
    if (search && typeof search === 'string' && search.trim()) {
      const term = `%${search.trim()}%`;
      query += ` AND (name LIKE ? OR email LIKE ? OR phone LIKE ?)`;
      params.push(term, term, term);
    }
    query += ` ORDER BY name ASC`;
    const users = db.prepare(query).all(...params) as any[];

    const headers = ['Izina (Full Name)', 'Imeli (Email)', 'Telefone (Phone)', 'Inshingano (Role)', 'Ijwi (Voice)', 'Umwanya (Choir Role)', 'Imiterere (Status)', 'Itariki yo Kwiyandikisha'];
    const rows = users.map(u => [
      `"${(u.name || '').replace(/"/g, '""')}"`,
      `"${(u.email || '').replace(/"/g, '""')}"`,
      `"${(u.phone || '').replace(/"/g, '""')}"`,
      u.role,
      u.choir_voice || 'N/A',
      `"${(u.choir_role || '').replace(/"/g, '""')}"`,
      u.is_disabled ? 'Yahagaritswe (Disabled)' : 'Irakora (Active)',
      u.created_at || ''
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="la_lumiere_members_' + Date.now() + '.csv"');
    res.send(csvContent);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to export members to CSV' });
  }
});

// Member Activity Log (Last 10 user actions)
app.get('/api/admin/member-activity-logs', requireAdmin, (req: AuthRequest, res) => {
  try {
    const limit = Number(req.query.limit) || 10;
    const logs = db.prepare(`
      SELECT al.*, u.avatar_url, u.email as user_email
      FROM activity_logs al
      LEFT JOIN users u ON al.user_id = u.id
      ORDER BY al.created_at DESC
      LIMIT ?
    `).all(limit);

    res.json(logs);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch member activity logs' });
  }
});

// Admin User Creation with Bcrypt Password Hashing
app.post('/api/admin/users', requireAdmin, (req: AuthRequest, res) => {
  try {
    const { name, email, password, role, phone } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Amazina, imeli n\'ijambo ry\'ibanga birakenewe (Name, email, and password required)' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Ijambo ry\'ibanga rigomba kugira byibuze inyuguti 6 (Password must be at least 6 characters)' });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const existing = db.prepare('SELECT id FROM users WHERE LOWER(TRIM(email)) = ?').get(cleanEmail);
    if (existing) {
      return res.status(409).json({ error: 'Iyi imeli isanzwe ikoreshwa (Email already registered)' });
    }

    const validRoles = ['super_admin', 'admin', 'content_admin', 'moderator', 'normal_user', 'member', 'supporter'];
    const selectedRole = role && validRoles.includes(role) ? role : 'supporter';

    // Only super_admin can create super_admin or admin accounts
    if ((selectedRole === 'super_admin' || selectedRole === 'admin') && req.user!.role !== 'super_admin') {
      return res.status(403).json({ error: 'Super Admin gusa ni we ushobora guha undi umwanya wa Admin cyangwa Super Admin' });
    }

    const newUserId = `usr_${Date.now()}`;
    const passwordHash = hashPassword(password);

    db.prepare(`
      INSERT INTO users (id, name, email, password_hash, phone, role, is_disabled)
      VALUES (?, ?, ?, ?, ?, ?, 0)
    `).run(newUserId, name.trim(), cleanEmail, passwordHash, phone?.trim() || '', selectedRole);

    logActivity(
      req.user!.id,
      req.user!.name,
      req.user!.role,
      'CREATE_USER',
      'users',
      newUserId,
      `Created user ${cleanEmail} with role ${selectedRole} using bcrypt password hashing`
    );

    res.status(201).json({
      message: 'Umukoresha yongewemo neza',
      user: {
        id: newUserId,
        name: name.trim(),
        email: cleanEmail,
        role: selectedRole,
        phone: phone?.trim() || ''
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to create user' });
  }
});

// Admin Password Reset with Bcrypt Password Hashing
app.post('/api/admin/users/:id/reset-password', requireSuperAdmin, (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { new_password } = req.body;

    if (!new_password || typeof new_password !== 'string' || new_password.length < 6) {
      return res.status(400).json({ error: 'Ijambo ry\'ibanga rigomba kugira byibuze inyuguti 6 (Password must be at least 6 characters)' });
    }

    const user = db.prepare('SELECT id, name, email FROM users WHERE id = ?').get(id) as any;
    if (!user) {
      return res.status(404).json({ error: 'Umukoresha ntabonetse (User not found)' });
    }

    const newHash = hashPassword(new_password);
    db.prepare('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(newHash, id);

    logActivity(
      req.user!.id,
      req.user!.name,
      req.user!.role,
      'RESET_PASSWORD',
      'users',
      id,
      `Reset password for user ${user.email} using bcrypt password hashing`
    );

    res.json({ message: `Ijambobanga rya ${user.name} ryahinduwe neza (Bcrypt hash updated)` });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to reset password' });
  }
});

// -------------------------------------------------------------
// ACTIVITY AUDIT LOGS
// -------------------------------------------------------------
app.get('/api/admin/activity-logs', requireAdmin, (req: AuthRequest, res) => {
  try {
    const { resource, action, search, limit = 50 } = req.query;
    let query = `SELECT * FROM activity_logs WHERE 1=1`;
    const params: any[] = [];

    if (resource && resource !== 'all') {
      query += ` AND resource = ?`;
      params.push(resource);
    }
    if (action && action !== 'all') {
      query += ` AND action = ?`;
      params.push(action);
    }
    if (search && typeof search === 'string') {
      query += ` AND (details LIKE ? OR user_name LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }

    query += ` ORDER BY created_at DESC LIMIT ?`;
    params.push(Number(limit) || 50);

    const logs = db.prepare(query).all(...params);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch activity logs' });
  }
});

// Admin Donations Dashboard & CSV Export
app.get('/api/admin/donations', requireAdmin, (req: AuthRequest, res) => {
  try {
    const { status, provider, date_from, date_to } = req.query;
    let query = `
      SELECT pt.*, u.email as user_email
      FROM payment_transactions pt
      LEFT JOIN users u ON pt.user_id = u.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (status && status !== 'all') {
      query += ` AND pt.status = ?`;
      params.push(status);
    }
    if (provider && provider !== 'all') {
      query += ` AND pt.provider_slug = ?`;
      params.push(provider);
    }
    if (date_from) {
      query += ` AND pt.created_at >= ?`;
      params.push(date_from);
    }
    if (date_to) {
      query += ` AND pt.created_at <= ?`;
      params.push(date_to);
    }

    query += ` ORDER BY pt.created_at DESC`;
    const donations = db.prepare(query).all(...params);
    res.json(donations);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch donations' });
  }
});

// CSV Export for donations
app.get('/api/admin/donations/export', requireAdmin, (req: AuthRequest, res) => {
  try {
    const donations = db.prepare(`
      SELECT pt.internal_reference, pt.provider_reference, pt.donor_name,
             pt.amount, pt.currency, pt.provider_slug, pt.donation_purpose,
             pt.status, pt.created_at, pt.completed_at
      FROM payment_transactions pt
      ORDER BY pt.created_at DESC
    `).all() as any[];

    const headers = ['Reference', 'Provider Ref', 'Donor Name', 'Amount (RWF)', 'Currency', 'Payment Method', 'Purpose', 'Status', 'Date', 'Completed Date'];
    const rows = donations.map(d => [
      d.internal_reference,
      d.provider_reference || '',
      `"${(d.donor_name || '').replace(/"/g, '""')}"`,
      d.amount,
      d.currency,
      d.provider_slug,
      `"${(d.donation_purpose || '').replace(/"/g, '""')}"`,
      d.status,
      d.created_at,
      d.completed_at || ''
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="la_lumiere_donations_' + Date.now() + '.csv"');
    res.send(csvContent);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to export donations' });
  }
});

// Admin Branding Management
app.put('/api/admin/branding', requireAdmin, (req: AuthRequest, res) => {
  try {
    const {
      main_logo_url,
      app_icon_url,
      splash_logo_url,
      light_logo_url,
      dark_logo_url,
      banner_image_url,
      primary_color,
      secondary_color,
      accent_color,
      background_color,
      text_color,
      choir_name,
      affiliation,
      church_affiliation,
      about_story,
      mission_statement,
      mission,
      vision_statement,
      vision,
      welcome_message,
      scripture_verse,
      songs_badge_text,
      contact_phone,
      contact_email
    } = req.body;

    db.prepare(`
      UPDATE branding_settings
      SET main_logo_url = ?, app_icon_url = ?, splash_logo_url = ?, light_logo_url = ?,
          dark_logo_url = ?, banner_image_url = ?, primary_color = ?, secondary_color = ?,
          accent_color = ?, background_color = ?, text_color = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = 'default_branding'
    `).run(
      main_logo_url || '',
      app_icon_url || '',
      splash_logo_url || '',
      light_logo_url || '',
      dark_logo_url || '',
      banner_image_url || '',
      primary_color || '#1e3a8a',
      secondary_color || '#d97706',
      accent_color || '#2563eb',
      background_color || '#f8fafc',
      text_color || '#0f172a'
    );

    // Update text settings
    const updateSetting = db.prepare('INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)');
    if (choir_name !== undefined) updateSetting.run('choir_name', String(choir_name).trim());
    if (affiliation !== undefined || church_affiliation !== undefined) updateSetting.run('church_affiliation', String(affiliation || church_affiliation).trim());
    if (about_story !== undefined) updateSetting.run('about_story', String(about_story).trim());
    if (mission_statement !== undefined || mission !== undefined) updateSetting.run('mission_statement', String(mission_statement || mission).trim());
    if (vision_statement !== undefined || vision !== undefined) updateSetting.run('vision_statement', String(vision_statement || vision).trim());
    if (welcome_message !== undefined) updateSetting.run('welcome_message', String(welcome_message).trim());
    if (scripture_verse !== undefined) updateSetting.run('scripture_verse', String(scripture_verse).trim());
    if (songs_badge_text !== undefined) updateSetting.run('songs_badge_text', String(songs_badge_text).trim());
    if (contact_phone !== undefined) updateSetting.run('contact_phone', String(contact_phone).trim());
    if (contact_email !== undefined) updateSetting.run('contact_email', String(contact_email).trim());

    // Audit log
    db.prepare("INSERT INTO audit_logs (id, user_id, action, resource, details) VALUES (?, ?, 'UPDATE_BRANDING', 'branding_settings', ?)")
      .run('log_' + Date.now(), req.user!.id, 'Branding & logos updated');

    res.json({ message: 'Ibirango n\'amabara byavuguruwe (Branding updated successfully)' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update branding' });
  }
});

// -------------------------------------------------------------
// ADMIN CHOIR LEADERSHIP CONTACT MANAGEMENT API
// -------------------------------------------------------------
app.get('/api/admin/contacts', requireAdmin, (req: AuthRequest, res) => {
  try {
    let contacts = db.prepare('SELECT * FROM leadership_contacts WHERE id = ?').get('default_contacts') as any;
    if (!contacts) {
      contacts = {
        id: 'default_contacts',
        leader_name: '[INSERT NAME]',
        leader_phone: '[INSERT PHONE NUMBER]',
        leader_whatsapp: '[INSERT WHATSAPP NUMBER]',
        leader_title_rw: 'Umuyobozi wa Korali',
        leader_title_en: 'Choir Leader / President',
        secretary_name: '[INSERT NAME]',
        secretary_phone: '[INSERT PHONE NUMBER]',
        secretary_whatsapp: '[INSERT WHATSAPP NUMBER]',
        secretary_title_rw: 'Umunyamabanga wa Korali',
        secretary_title_en: 'Choir Secretary',
        general_phone: '[INSERT PHONE NUMBER]',
        general_whatsapp: '[INSERT WHATSAPP NUMBER]',
        general_email: '[INSERT EMAIL ADDRESS]',
        address: '[INSERT CHOIR ADDRESS]',
        city: 'Kigali',
        country: 'Rwanda',
        weekday_range: 'Kuwa Mbere – Kuwa Gatanu (Monday–Friday)',
        weekday_hours: '[INSERT HOURS]',
        weekend_range: 'Kuwa Gatandatu – Ku Cyumweru (Saturday–Sunday)',
        weekend_hours: '[INSERT HOURS]',
        contact_description_rw: 'Ufite ikibazo, igitekerezo, cyangwa ushaka kumenya byinshi kuri La Lumiere Choir? Twandikire cyangwa utuvugishe ukoresheje bumwe mu buryo bukurikira.',
        contact_description_en: 'Do you have questions, feedback, or need information about La Lumiere Choir? Get in touch with our leadership team using the options below.',
      };
    }
    res.json(contacts);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch choir leadership contact details' });
  }
});

app.put('/api/admin/contacts', requireAdmin, (req: AuthRequest, res) => {
  try {
    const {
      leader_name,
      leader_phone,
      leader_whatsapp,
      leader_title_rw,
      leader_title_en,
      secretary_name,
      secretary_phone,
      secretary_whatsapp,
      secretary_title_rw,
      secretary_title_en,
      general_phone,
      general_whatsapp,
      general_email,
      address,
      city,
      country,
      weekday_range,
      weekday_hours,
      weekend_range,
      weekend_hours,
      contact_description_rw,
      contact_description_en
    } = req.body;

    // Strict validation for required fields
    if (!leader_name?.trim()) {
      return res.status(400).json({ error: 'Izina ry\'Umuyobozi wa Korali rirakenewe (Leader name required)' });
    }
    if (!leader_phone?.trim()) {
      return res.status(400).json({ error: 'Nimero ya telefone y\'Umuyobozi irakenewe (Leader phone required)' });
    }
    if (!secretary_name?.trim()) {
      return res.status(400).json({ error: 'Izina ry\'Umunyamabanga rirakenewe (Secretary name required)' });
    }
    if (!secretary_phone?.trim()) {
      return res.status(400).json({ error: 'Nimero ya telefone y\'Umunyamabanga irakenewe (Secretary phone required)' });
    }
    if (!general_phone?.trim()) {
      return res.status(400).json({ error: 'Telefone rusange ya korali irakenewe (General choir phone required)' });
    }
    if (!general_email?.trim()) {
      return res.status(400).json({ error: 'Imeli rusange ya korali irakenewe (General choir email required)' });
    }
    if (!address?.trim()) {
      return res.status(400).json({ error: 'Aderesi cyangwa icyicaro cya korali birakenewe (Address required)' });
    }

    // Email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const cleanEmail = general_email.trim();
    if (!cleanEmail.includes('[INSERT') && !emailRegex.test(cleanEmail)) {
      return res.status(400).json({ error: 'Imeli yanditse nabi. Urugero: info@lalumierechoir.rw (Invalid email format)' });
    }

    // Insert or replace in leadership_contacts
    db.prepare(`
      INSERT INTO leadership_contacts (
        id,
        leader_name, leader_phone, leader_whatsapp, leader_title_rw, leader_title_en,
        secretary_name, secretary_phone, secretary_whatsapp, secretary_title_rw, secretary_title_en,
        general_phone, general_whatsapp, general_email,
        address, city, country,
        weekday_range, weekday_hours, weekend_range, weekend_hours,
        contact_description_rw, contact_description_en,
        updated_at, updated_by
      ) VALUES (
        'default_contacts',
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?,
        CURRENT_TIMESTAMP, ?
      )
      ON CONFLICT(id) DO UPDATE SET
        leader_name = excluded.leader_name,
        leader_phone = excluded.leader_phone,
        leader_whatsapp = excluded.leader_whatsapp,
        leader_title_rw = excluded.leader_title_rw,
        leader_title_en = excluded.leader_title_en,
        secretary_name = excluded.secretary_name,
        secretary_phone = excluded.secretary_phone,
        secretary_whatsapp = excluded.secretary_whatsapp,
        secretary_title_rw = excluded.secretary_title_rw,
        secretary_title_en = excluded.secretary_title_en,
        general_phone = excluded.general_phone,
        general_whatsapp = excluded.general_whatsapp,
        general_email = excluded.general_email,
        address = excluded.address,
        city = excluded.city,
        country = excluded.country,
        weekday_range = excluded.weekday_range,
        weekday_hours = excluded.weekday_hours,
        weekend_range = excluded.weekend_range,
        weekend_hours = excluded.weekend_hours,
        contact_description_rw = excluded.contact_description_rw,
        contact_description_en = excluded.contact_description_en,
        updated_at = CURRENT_TIMESTAMP,
        updated_by = excluded.updated_by
    `).run(
      leader_name.trim(),
      leader_phone.trim(),
      leader_whatsapp?.trim() || leader_phone.trim(),
      leader_title_rw?.trim() || 'Umuyobozi wa Korali',
      leader_title_en?.trim() || 'Choir Leader / President',
      secretary_name.trim(),
      secretary_phone.trim(),
      secretary_whatsapp?.trim() || secretary_phone.trim(),
      secretary_title_rw?.trim() || 'Umunyamabanga wa Korali',
      secretary_title_en?.trim() || 'Choir Secretary',
      general_phone.trim(),
      general_whatsapp?.trim() || general_phone.trim(),
      cleanEmail,
      address.trim(),
      city?.trim() || 'Kigali',
      country?.trim() || 'Rwanda',
      weekday_range?.trim() || 'Kuwa Mbere – Kuwa Gatanu (Monday–Friday)',
      weekday_hours?.trim() || '[INSERT HOURS]',
      weekend_range?.trim() || 'Kuwa Gatandatu – Ku Cyumweru (Saturday–Sunday)',
      weekend_hours?.trim() || '[INSERT HOURS]',
      contact_description_rw?.trim() || '',
      contact_description_en?.trim() || '',
      req.user!.id
    );

    // Synchronize contact_phone and contact_email in app_settings as well for backward compatibility
    const upsertSetting = db.prepare('INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)');
    upsertSetting.run('contact_phone', general_phone.trim());
    upsertSetting.run('contact_email', cleanEmail);

    // Audit log
    db.prepare("INSERT INTO audit_logs (id, user_id, action, resource, details) VALUES (?, ?, 'UPDATE_CONTACT_INFO', 'leadership_contacts', ?)")
      .run('log_' + Date.now(), req.user!.id, `Choir leadership contact information updated by ${req.user!.name}`);

    res.json({
      message: 'Amakuru yo kuvugisha ubuyobozi yabitswe neza (Contact information updated successfully)',
      success: true
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update contact information' });
  }
});

// Admin Payment Settings & Providers
app.get('/api/admin/payment-providers', requireAdmin, (req: AuthRequest, res) => {
  try {
    const providers = db.prepare('SELECT * FROM payment_providers').all();
    res.json(providers);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch payment providers' });
  }
});

app.get('/api/admin/payment-settings', requireAdmin, (req: AuthRequest, res) => {
  try {
    const providers = db.prepare('SELECT * FROM payment_providers').all();
    res.json({
      providers,
      env: {
        mtn_configured: Boolean(process.env.MTN_MOMO_SUBSCRIPTION_KEY),
        airtel_configured: Boolean(process.env.AIRTEL_MONEY_CLIENT_ID)
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch payment settings' });
  }
});

app.put('/api/admin/payment-settings', requireAdmin, (req: AuthRequest, res) => {
  try {
    const { providers } = req.body;
    if (Array.isArray(providers)) {
      const updateProv = db.prepare(`
        UPDATE payment_providers
        SET is_enabled = ?, environment = ?, api_endpoint = ?, merchant_account_id = ?, updated_at = CURRENT_TIMESTAMP
        WHERE slug = ?
      `);
      providers.forEach(p => {
        updateProv.run(p.is_enabled ? 1 : 0, p.environment || 'sandbox', p.api_endpoint || null, p.merchant_account_id || null, p.slug);
      });
    }

    db.prepare("INSERT INTO audit_logs (id, user_id, action, resource, details) VALUES (?, ?, 'UPDATE_PAYMENT_CONFIG', 'payment_providers', ?)")
      .run('log_' + Date.now(), req.user!.id, 'Payment provider configurations updated');

    res.json({ message: 'Amakuru yo kwishyura yavuguruwe (Payment settings updated)' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update payment settings' });
  }
});

// Admin File Uploads (Images & Audio)
app.post('/api/admin/upload', requireAdmin, upload.single('file'), (req: AuthRequest, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nta dosiye yatoranyijwe (No file uploaded)' });
    }
    const fileUrl = `/uploads/${req.file.filename}`;
    res.json({
      url: fileUrl,
      filename: req.file.filename,
      size: req.file.size,
      mimetype: req.file.mimetype
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Upload failed' });
  }
});

// -------------------------------------------------------------
// API 404 & ERROR HANDLING (Guarantees valid JSON responses)
// -------------------------------------------------------------
app.all('/api/*', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  return res.status(404).json({
    success: false,
    message: `API endpoint ${req.method} ${req.originalUrl} not found`,
    error: `API endpoint ${req.method} ${req.originalUrl} not found`
  });
});

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled server error:', err);
  if (req.path && req.path.startsWith('/api')) {
    res.setHeader('Content-Type', 'application/json');
    return res.status(err.status || 500).json({
      success: false,
      message: err.message || 'Habaye ikosa kuri seriveri (Internal server error)',
      error: err.message || 'Internal server error'
    });
  }
  next(err);
});

// -------------------------------------------------------------
// VITE MIDDLEWARE & SPA SERVING
// -------------------------------------------------------------
async function startServer() {
  // Initialize the first admin account hash if it does not already exist in the database
  try {
    const adminInitResult = await setupFirstAdminAccount();
    console.log(`[Admin Account Setup] ${adminInitResult.message}`);
  } catch (initErr) {
    console.warn('[Admin Account Setup Error] Failed during startup setup:', initErr);
  }

  const server = http.createServer(app);

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        ws: {
          server,
        },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);

    // Explicit fallback for client-side routing in dev to ensure index.html
    // is always processed through vite.transformIndexHtml with React refresh preamble
    app.use('*', async (req, res, next) => {
      const url = req.originalUrl;
      // Skip API and static asset requests that were not matched
      if (url.startsWith('/api') || url.startsWith('/uploads') || url.includes('.')) {
        return next();
      }
      try {
        const indexPath = path.resolve(process.cwd(), 'index.html');
        let template = fs.readFileSync(indexPath, 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`La Lumiere Choir App running at http://0.0.0.0:${PORT}`);
  });

  server.on('error', (err: any) => {
    if (err && err.code === 'EADDRINUSE') {
      console.warn(`[Server] Port ${PORT} is temporarily in use. Waiting to retry...`);
      setTimeout(() => {
        try {
          server.close();
        } catch {
          // ignore close error
        }
        server.listen(PORT, '0.0.0.0');
      }, 1000);
    } else {
      console.error('[Server] Listen error:', err);
    }
  });

  const handleShutdown = () => {
    try {
      server.close(() => {
        process.exit(0);
      });
    } catch {
      process.exit(0);
    }
  };

  process.on('SIGTERM', handleShutdown);
  process.on('SIGINT', handleShutdown);
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
});
