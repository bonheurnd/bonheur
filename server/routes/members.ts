import { Router, Response } from 'express';
import crypto from 'crypto';
import { db, logActivity } from '../db.js';
import { requireAdmin, requireAuth, AuthRequest, isUserAdmin, hashPassword } from '../auth.js';
import { buildCsvPayload, sanitizeCsvField, getDateSuffix } from '../export.js';

export const membersRouter = Router();

/**
 * Normalizes phone numbers for accurate duplicate detection.
 * Handles Rwandan local (078...) and international formats (+25078..., 25078...).
 */
export function normalizePhoneNumber(phone?: string | null): string {
  if (!phone) return '';
  let cleaned = String(phone).replace(/[\s\-\(\)\+]/g, '').trim();
  if (cleaned.startsWith('250') && cleaned.length === 12) {
    cleaned = '0' + cleaned.substring(3);
  }
  return cleaned;
}

/**
 * Normalizes email address for duplicate matching.
 */
export function normalizeEmail(email?: string | null): string {
  if (!email) return '';
  return String(email).trim().toLowerCase();
}

/**
 * Valid choir voices
 */
export const VALID_VOICES = ['Soprano', 'Alto', 'Tenor', 'Bass', 'Musician', 'Director', 'Choir Member'] as const;

/**
 * Parse raw CSV string into rows of key-value objects
 */
export function parseCsvString(csvText: string): Array<Record<string, string>> {
  if (!csvText || typeof csvText !== 'string') return [];
  // Strip BOM if present
  const text = csvText.replace(/^\uFEFF/, '').trim();
  const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length < 2) return [];

  // Parse header
  const headerLine = lines[0];
  const headers = parseCsvRowLine(headerLine).map(h => h.trim().toLowerCase());

  const rows: Array<Record<string, string>> = [];
  for (let i = 1; i < lines.length; i++) {
    const rawCols = parseCsvRowLine(lines[i]);
    const rowObj: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      const headerKey = headers[j];
      rowObj[headerKey] = (rawCols[j] !== undefined ? rawCols[j] : '').trim();
    }
    rows.push(rowObj);
  }
  return rows;
}

/**
 * Parses a single CSV line taking quotes and commas into account
 */
function parseCsvRowLine(line: string): string[] {
  const result: string[] = [];
  let inQuotes = false;
  let current = '';

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++; // skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

// -------------------------------------------------------------
// 1. GET ALL CHOIR MEMBERS (UNIFIED MEMBER DIRECTORY & ADMIN LIST)
// -------------------------------------------------------------
membersRouter.get('/', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const { status, voice, search, role } = req.query;
    const isAdmin = isUserAdmin(req.user?.role);
    const currentUserId = req.user!.id;

    let query = `
      SELECT 
        u.id,
        u.name,
        u.email,
        u.phone,
        u.role,
        u.avatar_url,
        u.choir_voice,
        u.choir_role,
        u.bio,
        u.is_disabled,
        u.status,
        u.created_at,
        u.updated_at,
        u.share_directory,
        u.share_phone,
        u.share_email,
        u.share_whatsapp,
        (SELECT COUNT(*) FROM attendance_records ar WHERE ar.user_id = u.id) as attendance_records_count,
        (SELECT COUNT(*) FROM attendance_records ar WHERE ar.user_id = u.id AND ar.status IN ('present', 'late')) as attendance_attended_count
      FROM users u
      WHERE 1=1
    `;
    const params: any[] = [];

    // Filter by membership role
    if (role && role !== 'all') {
      query += ` AND u.role = ?`;
      params.push(role);
    } else if (!isAdmin) {
      // Non-admins see only choir members and members
      query += ` AND u.role IN ('choir_member', 'member', 'admin', 'super_admin', 'content_admin', 'moderator')`;
    }

    // Active vs Inactive filter
    if (status === 'active') {
      query += ` AND (u.status = 'active' OR u.status IS NULL) AND (u.is_disabled = 0 OR u.is_disabled IS NULL)`;
    } else if (status === 'inactive' || status === 'disabled') {
      query += ` AND (u.status = 'inactive' OR u.is_disabled = 1)`;
    }

    // Voice filter
    if (voice && typeof voice === 'string' && voice !== 'all') {
      query += ` AND LOWER(u.choir_voice) = LOWER(?)`;
      params.push(voice);
    }

    // Search query
    if (search && typeof search === 'string' && search.trim()) {
      const term = `%${search.trim()}%`;
      query += ` AND (u.name LIKE ? OR u.email LIKE ? OR u.phone LIKE ? OR u.choir_voice LIKE ? OR u.choir_role LIKE ?)`;
      params.push(term, term, term, term, term);
    }

    query += `
      ORDER BY 
        CASE 
          WHEN u.status = 'inactive' OR u.is_disabled = 1 THEN 2 
          ELSE 1 
        END,
        CASE 
          WHEN u.choir_voice = 'Director' THEN 1
          WHEN u.choir_voice = 'Soprano' THEN 2
          WHEN u.choir_voice = 'Alto' THEN 3
          WHEN u.choir_voice = 'Tenor' THEN 4
          WHEN u.choir_voice = 'Bass' THEN 5
          WHEN u.choir_voice = 'Musician' THEN 6
          ELSE 7
        END,
        u.name ASC
    `;

    const rawRows = db.prepare(query).all(...params) as any[];

    const members = rawRows.map(u => {
      const isInactive = u.status === 'inactive' || u.is_disabled === 1;
      const totalRec = u.attendance_records_count || 0;
      const attended = u.attendance_attended_count || 0;
      const rate = totalRec > 0 ? Math.round((attended / totalRec) * 100) : 100;

      // Privacy mask for non-admins
      const isSelf = u.id === currentUserId;
      const canViewDetails = isAdmin || isSelf;

      return {
        id: u.id,
        name: u.name,
        full_name: u.name,
        email: canViewDetails || u.share_email ? u.email : '',
        phone: canViewDetails || u.share_phone ? (u.phone || '') : '',
        role: u.role,
        choir_voice: u.choir_voice || 'Choir Member',
        choir_role: u.choir_role || 'Member',
        bio: u.bio || '',
        avatar_url: u.avatar_url || '',
        status: isInactive ? 'inactive' : 'active',
        is_disabled: isInactive ? 1 : 0,
        created_at: u.created_at,
        date_added: u.created_at,
        share_directory: Boolean(u.share_directory ?? 1),
        share_phone: Boolean(u.share_phone ?? 1),
        share_email: Boolean(u.share_email ?? 1),
        share_whatsapp: Boolean(u.share_whatsapp ?? 1),
        whatsapp: (canViewDetails || u.share_whatsapp) ? (u.phone || '') : '',
        has_phone: Boolean(u.phone && (canViewDetails || u.share_phone)),
        has_email: Boolean(u.email && (canViewDetails || u.share_email)),
        has_whatsapp: Boolean(u.phone && (canViewDetails || u.share_whatsapp)),
        is_self: isSelf,
        attendance_records_count: totalRec,
        attendance_rate: rate,
      };
    });

    const activeCount = members.filter(m => m.status === 'active').length;
    const inactiveCount = members.filter(m => m.status === 'inactive').length;

    res.json({
      members,
      total: members.length,
      active_count: activeCount,
      inactive_count: inactiveCount,
    });
  } catch (err: any) {
    console.error('Error fetching choir members:', err);
    res.status(500).json({ error: 'Habaye ikibazo mu gushaka abanyamuryango' });
  }
});

// -------------------------------------------------------------
// 2. GET DOWNLOADABLE SAMPLE CSV TEMPLATE
// -------------------------------------------------------------
membersRouter.get(['/template', '/template/csv'], (req, res) => {
  try {
    const headers = ['Name', 'Phone', 'Email', 'Voice', 'Role', 'Status'];
    const rows = [
      ['Uwase Aline', "'0788123456", 'aline.uwase@example.com', 'Soprano', 'Member', 'active'],
      ['Mugisha Jean', "'0789234567", 'jean.mugisha@example.com', 'Tenor', 'Voice Leader', 'active'],
      ['Kwizera David', "'0787345678", 'david.kwizera@example.com', 'Bass', 'Member', 'active'],
      ['Ineza Marie', "'0786456789", 'marie.ineza@example.com', 'Alto', 'Pianist', 'active'],
      ['Kalisa Eric', "'0785567890", '', 'Musician', 'Instrumentalist', 'active'],
      ['Ganza Chantal', "'0784678901", 'chantal.ganza@example.com', 'Soprano', 'Member', 'inactive'],
    ];

    const csvContent = buildCsvPayload(headers, rows);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="la-lumiere-members-sample-template.csv"');
    res.send(csvContent);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to generate template CSV' });
  }
});

export interface SanitizedMemberInput {
  name: string;
  phone: string | null;
  normalizedPhone: string | null;
  email: string | null;
  voicePart: string;
  choirRole: string;
  status: 'active' | 'inactive';
  isDisabled: number;
  bio: string | null;
}

/**
 * Validation & Sanitization Layer for Member Creation
 * Verifies and sanitizes expected fields (name, phone, status, voicePart)
 * to prevent empty string injections, malformed data, and schema mismatches.
 */
export function validateMemberPostInput(body: any): {
  isValid: boolean;
  errors: string[];
  sanitized?: SanitizedMemberInput;
} {
  const errors: string[] = [];
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return {
      isValid: false,
      errors: ['Amakuru yahawe seriveri ntabwo yemewe (Request body must be a valid JSON object)'],
    };
  }

  // 1. Sanitize & Verify Name (Required, 2-100 chars, no empty string injection)
  let sanitizedName = '';
  if (body.name === undefined || body.name === null) {
    errors.push('Amazina y\'umunyamuryango arakenewe (Member name is required)');
  } else if (typeof body.name !== 'string') {
    errors.push('Amazina agomba kuba amagambo (Member name must be a string)');
  } else {
    // Strip control characters, trim, and collapse multiple consecutive whitespace
    sanitizedName = body.name.replace(/[\x00-\x1F\x7F]/g, '').trim().replace(/\s+/g, ' ');
    if (sanitizedName.length < 2) {
      errors.push('Amazina agomba kugira byibuze inyuguti 2 (Member name must be at least 2 characters)');
    } else if (sanitizedName.length > 100) {
      errors.push('Amazina ntagomba kurenza inyuguti 100 (Member name cannot exceed 100 characters)');
    }
  }

  // 2. Sanitize & Verify Phone (Optional, strictly mapped to null on empty to prevent empty string injection)
  let sanitizedPhone: string | null = null;
  let normalizedPhone: string | null = null;
  if (body.phone !== undefined && body.phone !== null) {
    if (typeof body.phone !== 'string' && typeof body.phone !== 'number') {
      errors.push('Nimero ya telefone ntabwo yanditse neza (Phone must be a string or number)');
    } else {
      const rawPhone = String(body.phone).trim();
      if (rawPhone.length > 0) {
        const phoneRegex = /^\+?[0-9\s\-()]{7,25}$/;
        const digitCount = rawPhone.replace(/\D/g, '').length;
        if (!phoneRegex.test(rawPhone) || digitCount < 7 || digitCount > 15) {
          errors.push('Nimero ya telefone ntabwo yemewe. Urugero: 078XXXXXXX cyangwa +25078XXXXXXX (Invalid phone number format)');
        } else {
          sanitizedPhone = rawPhone;
          normalizedPhone = normalizePhoneNumber(rawPhone);
        }
      }
      // If rawPhone is empty string, sanitizedPhone remains null to prevent empty string injection into DB
    }
  }

  // 3. Sanitize & Verify Status (Expected: 'active' | 'inactive', defaults to 'active')
  let sanitizedStatus: 'active' | 'inactive' = 'active';
  if (body.status !== undefined && body.status !== null) {
    if (typeof body.status !== 'string') {
      errors.push('Imimerere igomba kuba "active" cyangwa "inactive" (Status must be a string)');
    } else {
      const normalizedStatus = body.status.trim().toLowerCase();
      if (normalizedStatus === 'active') {
        sanitizedStatus = 'active';
      } else if (normalizedStatus === 'inactive') {
        sanitizedStatus = 'inactive';
      } else {
        errors.push('Imimerere y\'umunyamuryango ntabwo yemewe. Hitamo "active" cyangwa "inactive" (Status must be "active" or "inactive")');
      }
    }
  }

  // 4. Sanitize & Verify Voice Part (accepts voicePart or choir_voice, matches against VALID_VOICES)
  let sanitizedVoice = 'Choir Member';
  const rawVoice = body.voicePart !== undefined ? body.voicePart : body.choir_voice;
  if (rawVoice !== undefined && rawVoice !== null) {
    if (typeof rawVoice !== 'string') {
      errors.push('Ijwi rigomba kuba amagambo (Voice part must be a string)');
    } else {
      const trimmedVoice = rawVoice.trim();
      if (trimmedVoice.length > 0) {
        const match = VALID_VOICES.find(v => v.toLowerCase() === trimmedVoice.toLowerCase());
        if (match) {
          sanitizedVoice = match;
        } else {
          errors.push(`Ijwi ryatoranyijwe ntabwo ryemewe. Hitamo rimwe muri: ${VALID_VOICES.join(', ')} (Invalid voice part)`);
        }
      }
    }
  }

  // 5. Sanitize & Verify Email (Optional, strictly validated if provided)
  let sanitizedEmail: string | null = null;
  if (body.email !== undefined && body.email !== null) {
    if (typeof body.email !== 'string') {
      errors.push('Imeli igomba kuba amagambo (Email must be a string)');
    } else {
      const trimmedEmail = body.email.trim();
      if (trimmedEmail.length > 0) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(trimmedEmail) || trimmedEmail.length > 120) {
          errors.push('Imeli yanditse nabi. Urugero: izina@urugero.rw (Invalid email format)');
        } else {
          sanitizedEmail = trimmedEmail.toLowerCase();
        }
      }
    }
  }

  // 6. Sanitize Choir Role (Optional, defaults to 'Member')
  let sanitizedRole = 'Member';
  const rawRole = body.choir_role !== undefined ? body.choir_role : body.role;
  if (rawRole !== undefined && rawRole !== null) {
    if (typeof rawRole === 'string') {
      const trimmedRole = rawRole.trim();
      if (trimmedRole.length > 0) {
        sanitizedRole = trimmedRole.slice(0, 60);
      }
    }
  }

  // 7. Sanitize Bio (Optional, null if empty)
  let sanitizedBio: string | null = null;
  if (body.bio !== undefined && body.bio !== null) {
    if (typeof body.bio === 'string') {
      const trimmedBio = body.bio.trim();
      if (trimmedBio.length > 0) {
        sanitizedBio = trimmedBio.slice(0, 500);
      }
    }
  }

  if (errors.length > 0) {
    return { isValid: false, errors };
  }

  return {
    isValid: true,
    errors: [],
    sanitized: {
      name: sanitizedName,
      phone: sanitizedPhone,
      normalizedPhone,
      email: sanitizedEmail,
      voicePart: sanitizedVoice,
      choirRole: sanitizedRole,
      status: sanitizedStatus,
      isDisabled: sanitizedStatus === 'inactive' ? 1 : 0,
      bio: sanitizedBio,
    },
  };
}

// -------------------------------------------------------------
// 3. ADD A MEMBER MANUALLY (ADMIN ONLY)
// -------------------------------------------------------------
membersRouter.post('/', requireAdmin, (req: AuthRequest, res: Response) => {
  try {
    // 1. Validation & sanitization layer before any DB queries or SQL execution
    const validation = validateMemberPostInput(req.body);
    if (!validation.isValid || !validation.sanitized) {
      return res.status(400).json({
        error: validation.errors[0],
        errors: validation.errors,
      });
    }

    const {
      name: trimmedName,
      phone: cleanPhone,
      normalizedPhone,
      email: cleanEmail,
      voicePart,
      choirRole,
      status: finalStatus,
      isDisabled,
      bio: cleanBio,
    } = validation.sanitized;

    // 2. Check duplicate by email
    if (cleanEmail) {
      const existingEmail = db.prepare('SELECT id, name FROM users WHERE LOWER(email) = ?').get(cleanEmail) as any;
      if (existingEmail) {
        return res.status(409).json({
          error: `Iyi imeli (${cleanEmail}) isanzwe ikoreshwa na: ${existingEmail.name}`,
        });
      }
    }

    // 3. Check duplicate by normalized phone (using proper SQL string literals)
    if (normalizedPhone) {
      const allUsers = db.prepare("SELECT id, name, phone FROM users WHERE phone IS NOT NULL AND TRIM(phone) != ''").all() as any[];
      const match = allUsers.find(u => normalizePhoneNumber(u.phone) === normalizedPhone);
      if (match) {
        return res.status(409).json({
          error: `Iyi nimero ya terefone (${cleanPhone}) isanzwe yanditse kuri: ${match.name}`,
        });
      }
    }

    // 4. Generate unique ID and secure initial temporary password
    const memberId = 'usr_mem_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const tempPassword = crypto.randomBytes(12).toString('hex');
    const passwordHash = hashPassword(tempPassword);

    // Fallback email if not provided (ensures DB unique constraint is satisfied)
    const finalEmail = cleanEmail || `member.${memberId.substring(8)}@lalumiere.local`;

    // 5. Execute parameterized SQL query with strictly typed & sanitized fields
    db.prepare(`
      INSERT INTO users (
        id, name, email, password_hash, phone, role, choir_voice, choir_role, bio, status, is_disabled
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      memberId,
      trimmedName,
      finalEmail,
      passwordHash,
      cleanPhone, // explicitly null if omitted or empty string
      'choir_member',
      voicePart, // verified valid choir voice part
      choirRole,
      cleanBio, // explicitly null if omitted or empty string
      finalStatus, // strictly 'active' | 'inactive'
      isDisabled // strictly 0 or 1
    );

    logActivity(
      req.user!.id,
      req.user!.name,
      req.user!.role,
      'CREATE_MEMBER',
      'users',
      memberId,
      `Manually added member "${trimmedName}" (${voicePart}, status: ${finalStatus})`
    );

    const createdMember = db.prepare(`
      SELECT id, name, email, phone, role, choir_voice, choir_role, status, is_disabled, created_at
      FROM users WHERE id = ?
    `).get(memberId) as any;

    res.status(201).json({
      message: 'Umunyamuryango yongewemo neza (Member created successfully)',
      member: createdMember,
    });
  } catch (err: any) {
    console.error('Error adding member:', err);
    res.status(500).json({ error: 'Habaye ikibazo mu kongeramo umunyamuryango: ' + err.message });
  }
});

// -------------------------------------------------------------
// 4. CSV MEMBER IMPORT (PREVIEW & EXECUTE) (ADMIN ONLY)
// -------------------------------------------------------------
membersRouter.post('/import', requireAdmin, (req: AuthRequest, res: Response) => {
  try {
    const { csv_content, rows: providedRows, preview = false } = req.body;

    let parsedRows: Array<Record<string, string>> = [];
    if (typeof csv_content === 'string' && csv_content.trim().length > 0) {
      parsedRows = parseCsvString(csv_content);
    } else if (Array.isArray(providedRows)) {
      parsedRows = providedRows;
    } else {
      return res.status(400).json({ error: 'Nta makuru ya CSV yatanzwe (No CSV content provided)' });
    }

    if (parsedRows.length === 0) {
      return res.status(400).json({ error: 'Idosiye ya CSV nta baririmbyi irimo (CSV file is empty or has only headers)' });
    }

    // Limit maximum rows per import batch to protect server stability
    const MAX_IMPORT_ROWS = 1000;
    if (parsedRows.length > MAX_IMPORT_ROWS) {
      return res.status(400).json({
        error: `CSV irimo imirongo myinshi cyane (${parsedRows.length}). Nturenze ${MAX_IMPORT_ROWS} icyarimwe.`,
      });
    }

    // Fetch existing users from DB for duplicate matching
    const existingUsers = db.prepare(`
      SELECT id, name, email, phone FROM users
    `).all() as any[];

    const existingEmails = new Map<string, any>();
    const existingPhones = new Map<string, any>();
    const existingIds = new Set<string>();

    for (const u of existingUsers) {
      existingIds.add(u.id);
      if (u.email) existingEmails.set(normalizeEmail(u.email), u);
      if (u.phone) {
        const norm = normalizePhoneNumber(u.phone);
        if (norm) existingPhones.set(norm, u);
      }
    }

    // Track duplicates WITHIN the batch itself
    const batchEmails = new Set<string>();
    const batchPhones = new Set<string>();

    interface ValidatedImportRow {
      row_index: number;
      name: string;
      phone: string;
      email: string;
      voice: string;
      role: string;
      status: 'active' | 'inactive';
      is_valid: boolean;
      is_duplicate: boolean;
      duplicate_reason?: string;
      validation_error?: string;
    }

    const processedRows: ValidatedImportRow[] = [];
    let validCount = 0;
    let duplicateCount = 0;
    let errorCount = 0;

    for (let i = 0; i < parsedRows.length; i++) {
      const raw = parsedRows[i];
      // Find keys flexibly
      const name = (raw.name || raw.full_name || raw.amazina || raw['umunyamuryango'] || '').trim();
      const phone = (raw.phone || raw.telephone || raw.nimero || raw.phone_number || '').trim();
      const email = (raw.email || raw.imeli || '').trim();
      const voice = (raw.voice || raw.choir_voice || raw.ijwi || 'Choir Member').trim();
      const role = (raw.role || raw.choir_role || raw.inshingano || 'Member').trim();
      const rawStatus = (raw.status || raw.imimerere || 'active').trim().toLowerCase();
      const status: 'active' | 'inactive' = rawStatus === 'inactive' || rawStatus === 'ntakora' ? 'inactive' : 'active';

      const normEmail = normalizeEmail(email);
      const normPhone = normalizePhoneNumber(phone);

      if (!name || name.length < 2) {
        processedRows.push({
          row_index: i + 1,
          name: name || '[Izina rirabura]',
          phone,
          email,
          voice,
          role,
          status,
          is_valid: false,
          is_duplicate: false,
          validation_error: 'Izina rirakenewe (Name is required)',
        });
        errorCount++;
        continue;
      }

      // Check duplicates against DB
      let isDuplicate = false;
      let duplicateReason = '';

      if (normEmail && existingEmails.has(normEmail)) {
        isDuplicate = true;
        const match = existingEmails.get(normEmail);
        duplicateReason = `Imeli isanzwe ikoreshwa na: ${match.name}`;
      } else if (normPhone && existingPhones.has(normPhone)) {
        isDuplicate = true;
        const match = existingPhones.get(normPhone);
        duplicateReason = `Nimero ya telefone isanzwe yanditse kuri: ${match.name}`;
      } else if (normEmail && batchEmails.has(normEmail)) {
        // Duplicate inside this CSV
        isDuplicate = true;
        duplicateReason = `Imeli yisubiyemo muri iyi CSV`;
      } else if (normPhone && batchPhones.has(normPhone)) {
        // Duplicate phone inside this CSV
        isDuplicate = true;
        duplicateReason = `Telefone yisubiyemo muri iyi CSV`;
      }

      if (isDuplicate) {
        processedRows.push({
          row_index: i + 1,
          name,
          phone,
          email,
          voice,
          role,
          status,
          is_valid: false,
          is_duplicate: true,
          duplicate_reason: duplicateReason,
        });
        duplicateCount++;
        continue;
      }

      // Record in batch tracking
      if (normEmail) batchEmails.add(normEmail);
      if (normPhone) batchPhones.add(normPhone);

      processedRows.push({
        row_index: i + 1,
        name,
        phone,
        email,
        voice,
        role,
        status,
        is_valid: true,
        is_duplicate: false,
      });
      validCount++;
    }

    // PREVIEW MODE: return validation breakdown without writing to database
    if (preview) {
      return res.json({
        preview: true,
        total_rows: parsedRows.length,
        valid_count: validCount,
        duplicate_count: duplicateCount,
        error_count: errorCount,
        can_import: validCount > 0,
        rows: processedRows,
      });
    }

    // EXECUTION MODE: Insert valid rows in a transaction
    if (validCount === 0) {
      return res.status(400).json({
        error: 'Nta banyamuryango bashya bo kwinjiza babonetse (No valid non-duplicate records to import)',
        details: processedRows,
      });
    }

    const insertStmt = db.prepare(`
      INSERT INTO users (
        id, name, email, password_hash, phone, role, choir_voice, choir_role, status, is_disabled
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    let importedCount = 0;
    const importedMembers: any[] = [];

    db.exec('BEGIN TRANSACTION;');
    try {
      for (const row of processedRows) {
        if (!row.is_valid || row.is_duplicate) continue;

        const memberId = 'usr_imp_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
        const tempPassword = crypto.randomBytes(12).toString('hex');
        const passwordHash = hashPassword(tempPassword);
        const finalEmail = row.email || `imported.${memberId.substring(8)}@lalumiere.local`;
        const isDisabled = row.status === 'inactive' ? 1 : 0;

        insertStmt.run(
          memberId,
          row.name,
          finalEmail,
          passwordHash,
          row.phone || null,
          'choir_member',
          row.voice || 'Choir Member',
          row.role || 'Member',
          row.status,
          isDisabled
        );

        importedCount++;
        importedMembers.push({ id: memberId, name: row.name });
      }
      db.exec('COMMIT;');
    } catch (txErr: any) {
      db.exec('ROLLBACK;');
      throw txErr;
    }

    logActivity(
      req.user!.id,
      req.user!.name,
      req.user!.role,
      'IMPORT_MEMBERS_CSV',
      'users',
      undefined,
      `Imported ${importedCount} members from CSV (${duplicateCount} duplicates skipped, ${errorCount} errors)`
    );

    res.json({
      success: true,
      message: `Abaririmbyi ${importedCount} binjijwe neza muri sisitemu (${duplicateCount} bisubiramo basimbutswe)`,
      total_processed: parsedRows.length,
      imported_count: importedCount,
      duplicate_count: duplicateCount,
      error_count: errorCount,
      imported_members: importedMembers,
    });
  } catch (err: any) {
    console.error('Error importing members CSV:', err);
    res.status(500).json({ error: 'Habaye ikibazo mu kwinjiza abaririmbyi: ' + err.message });
  }
});

// -------------------------------------------------------------
// 5. UPDATE MEMBER DETAILS OR TOGGLE ACTIVE/INACTIVE (ADMIN ONLY)
// -------------------------------------------------------------
membersRouter.put('/:id', requireAdmin, (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, phone, email, choir_voice, choir_role, status, bio } = req.body;

    const existing = db.prepare('SELECT id, name, role, email, phone, status, is_disabled FROM users WHERE id = ?').get(id) as any;
    if (!existing) {
      return res.status(404).json({ error: 'Umunyamuryango ntabwo yabonetse (Member not found)' });
    }

    // Check email uniqueness if email is changed
    if (email && email.trim()) {
      const cleanEmail = normalizeEmail(email);
      const emailConflict = db.prepare('SELECT id, name FROM users WHERE LOWER(email) = ? AND id != ?').get(cleanEmail, id) as any;
      if (emailConflict) {
        return res.status(409).json({ error: `Iyi imeli (${cleanEmail}) ifitwe n'undi muntu: ${emailConflict.name}` });
      }
    }

    // Check phone uniqueness if phone is changed
    if (phone && phone.trim()) {
      const normPhone = normalizePhoneNumber(phone);
      const allPhones = db.prepare("SELECT id, name, phone FROM users WHERE id != ? AND phone IS NOT NULL AND TRIM(phone) != ''").all(id) as any[];
      const phoneConflict = allPhones.find(u => normalizePhoneNumber(u.phone) === normPhone);
      if (phoneConflict) {
        return res.status(409).json({ error: `Iyi telefone ifitwe n'undi muntu: ${phoneConflict.name}` });
      }
    }

    const newStatus = status === 'inactive' || status === 'active' ? status : (existing.status || 'active');
    const isDisabled = newStatus === 'inactive' ? 1 : 0;

    const rawVoice = req.body.voicePart !== undefined ? req.body.voicePart : choir_voice;
    let validatedVoice: string | null = null;
    if (rawVoice !== undefined && rawVoice !== null) {
      const trimmedVoice = String(rawVoice).trim();
      if (trimmedVoice.length > 0) {
        const match = VALID_VOICES.find(v => v.toLowerCase() === trimmedVoice.toLowerCase());
        validatedVoice = match || trimmedVoice;
      }
    }

    db.prepare(`
      UPDATE users
      SET name = COALESCE(?, name),
          phone = COALESCE(?, phone),
          email = COALESCE(?, email),
          choir_voice = COALESCE(?, choir_voice),
          choir_role = COALESCE(?, choir_role),
          status = ?,
          is_disabled = ?,
          bio = COALESCE(?, bio),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      name && typeof name === 'string' && name.trim() ? name.trim() : null,
      phone !== undefined ? (phone && String(phone).trim() ? String(phone).trim() : null) : null,
      email && typeof email === 'string' && email.trim() ? normalizeEmail(email) : null,
      validatedVoice,
      choir_role && typeof choir_role === 'string' && choir_role.trim() ? choir_role.trim() : null,
      newStatus,
      isDisabled,
      bio !== undefined ? (bio && String(bio).trim() ? String(bio).trim() : null) : null,
      id
    );

    logActivity(
      req.user!.id,
      req.user!.name,
      req.user!.role,
      'UPDATE_MEMBER',
      'users',
      id,
      `Updated member ${existing.name} (Status: ${newStatus})`
    );

    const updated = db.prepare(`
      SELECT id, name, email, phone, role, choir_voice, choir_role, status, is_disabled, updated_at
      FROM users WHERE id = ?
    `).get(id) as any;

    res.json({
      message: 'Amakuru y\'umunyamuryango yavuguruwe neza',
      member: updated,
    });
  } catch (err: any) {
    console.error('Error updating member:', err);
    res.status(500).json({ error: 'Habaye ikibazo mu kuvugurura umunyamuryango' });
  }
});

// -------------------------------------------------------------
// 6. GET SINGLE MEMBER ATTENDANCE HISTORY
// -------------------------------------------------------------
membersRouter.get('/:id/attendance', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const member = db.prepare('SELECT id, name, email, phone, choir_voice, choir_role, status, is_disabled FROM users WHERE id = ?').get(id) as any;
    if (!member) {
      return res.status(404).json({ error: 'Umunyamuryango ntabwo yabonetse' });
    }

    const history = db.prepare(`
      SELECT 
        s.id as session_id,
        s.title,
        s.activity_type,
        s.session_date,
        s.start_time,
        s.end_time,
        s.location,
        e.title as event_title,
        r.status,
        r.notes,
        r.marked_by,
        r.updated_at as marked_at
      FROM attendance_records r
      JOIN attendance_sessions s ON r.session_id = s.id
      LEFT JOIN events e ON s.event_id = e.id
      WHERE r.user_id = ? AND s.is_deleted = 0
      ORDER BY s.session_date DESC, s.created_at DESC
    `).all(id) as any[];

    const totalSessions = history.length;
    const present = history.filter(h => h.status === 'present').length;
    const late = history.filter(h => h.status === 'late').length;
    const excused = history.filter(h => h.status === 'excused').length;
    const absent = history.filter(h => h.status === 'absent').length;
    const attended = present + late;
    const eligible = totalSessions - excused;
    const percentage = eligible > 0 ? Math.round((attended / eligible) * 100) : 100;

    res.json({
      member: {
        id: member.id,
        name: member.name,
        email: member.email,
        phone: member.phone,
        choir_voice: member.choir_voice || 'Choir Member',
        choir_role: member.choir_role || 'Member',
        status: member.status || (member.is_disabled ? 'inactive' : 'active'),
      },
      summary: {
        total_sessions: totalSessions,
        present,
        late,
        excused,
        absent,
        attendance_percentage: percentage,
      },
      history,
    });
  } catch (err: any) {
    console.error('Error fetching member attendance history:', err);
    res.status(500).json({ error: 'Habaye ikibazo mu gushaka amateka y\'ubwitabire' });
  }
});

// -------------------------------------------------------------
// 7. UPDATE PRIVACY SETTINGS FOR CURRENT USER
// -------------------------------------------------------------
membersRouter.put('/privacy', requireAuth, (req: AuthRequest, res: Response) => {
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

    res.json({ success: true, message: 'Igenamiterere ry\'umutekano ryavuguruwe neza' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update privacy settings' });
  }
});

