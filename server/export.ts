import { Router, Response } from 'express';
import { db } from './db.js';
import { requireAdmin, AuthRequest, isUserAdmin } from './auth.js';

export const exportRouter = Router();

/**
 * Sanitizes untrusted CSV field values:
 * 1. Prevents CSV Formula Injection (DDE) by prefixing dangerous characters (=, +, -, @, \t, \r) with a single quote (')
 * 2. Preserves leading zeros in phone numbers (e.g. 078XXXXXXX) by prefixing with a single quote (')
 * 3. Removes null bytes and handles null/undefined safely
 */
export function sanitizeCsvField(val: any, isPhone: boolean = false): string {
  if (val === null || val === undefined) {
    return '';
  }
  let str = String(val).replace(/\0/g, '').trim();

  if (isPhone) {
    if (str.length > 0 && (str.startsWith('0') || str.startsWith('+'))) {
      return `'${str}`;
    }
    return str;
  }

  // Prevent formula execution in spreadsheet applications (Excel, LibreOffice, Google Sheets)
  if (/^[\=\+\-\@\t\r]/.test(str)) {
    return `'${str}`;
  }

  return str;
}

/**
 * Formats a CSV row by properly quoting fields and escaping internal quotation marks (" -> "")
 */
export function formatCsvRow(fields: string[]): string {
  return fields
    .map(field => {
      const escaped = field.replace(/"/g, '""');
      return `"${escaped}"`;
    })
    .join(',');
}

/**
 * Builds standard UTF-8 CSV content with UTF-8 BOM (\uFEFF) for Microsoft Excel compatibility
 */
export function buildCsvPayload(headers: string[], rows: string[][]): string {
  const BOM = '\uFEFF';
  const headerLine = formatCsvRow(headers);
  const dataLines = rows.map(r => formatCsvRow(r));
  return BOM + [headerLine, ...dataLines].join('\r\n') + '\r\n';
}

/**
 * Format current date string for file names (YYYY-MM-DD)
 */
function getDateSuffix(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// -------------------------------------------------------------
// EXPORT DATA RETRIEVAL FUNCTIONS (READING ACTUAL STORED DATA)
// -------------------------------------------------------------

function getMembersData(filters: any) {
  const { date_from, date_to, status, role, search } = filters;
  let query = `
    SELECT id, name, email, phone, role, choir_voice, choir_role,
           is_disabled, bio, created_at, updated_at
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

  if (date_from) {
    query += ` AND created_at >= ?`;
    params.push(date_from);
  }

  if (date_to) {
    query += ` AND created_at <= ?`;
    params.push(date_to + ' 23:59:59');
  }

  if (search && typeof search === 'string' && search.trim()) {
    const term = `%${search.trim()}%`;
    query += ` AND (name LIKE ? OR email LIKE ? OR phone LIKE ? OR choir_voice LIKE ? OR choir_role LIKE ?)`;
    params.push(term, term, term, term, term);
  }

  query += ` ORDER BY created_at DESC`;
  const records = db.prepare(query).all(...params) as any[];

  const headers = [
    'ID y\'Umunyamuryango (Member ID)',
    'Amazina Yose (Full Name)',
    'Telefone (Phone)',
    'Imeyili (Email)',
    'Inshingano Rusange (Role)',
    'Ijwi muri Korali (Voice Section)',
    'Umwanya muri Korali (Choir Position)',
    'Imiterere (Status)',
    'Amakuru Muri Make (Bio)',
    'Itariki yo Kwiyandikisha (Registration Date)',
    'Itariki yo Guhindura (Updated Date)',
  ];

  const rows = records.map(u => [
    sanitizeCsvField(u.id),
    sanitizeCsvField(u.name),
    sanitizeCsvField(u.phone, true),
    sanitizeCsvField(u.email),
    sanitizeCsvField(u.role),
    sanitizeCsvField(u.choir_voice || 'N/A'),
    sanitizeCsvField(u.choir_role || 'N/A'),
    sanitizeCsvField(u.is_disabled ? 'Yahagaritswe (Disabled)' : 'Arakora (Active)'),
    sanitizeCsvField(u.bio || ''),
    sanitizeCsvField(u.created_at || ''),
    sanitizeCsvField(u.updated_at || ''),
  ]);

  return { records, headers, rows, filename: `la-lumiere-members-${getDateSuffix()}.csv` };
}

function getDonationsData(filters: any) {
  const { date_from, date_to, status, provider, search } = filters;
  let query = `
    SELECT id, internal_reference, provider_reference, donor_name, donor_phone,
           donor_email, amount, currency, provider_slug, donation_purpose,
           status, failure_reason, is_anonymous, created_at, completed_at
    FROM payment_transactions
    WHERE 1=1
  `;
  const params: any[] = [];

  if (status && status !== 'all') {
    query += ` AND status = ?`;
    params.push(status);
  }

  if (provider && provider !== 'all') {
    query += ` AND provider_slug = ?`;
    params.push(provider);
  }

  if (date_from) {
    query += ` AND created_at >= ?`;
    params.push(date_from);
  }

  if (date_to) {
    query += ` AND created_at <= ?`;
    params.push(date_to + ' 23:59:59');
  }

  if (search && typeof search === 'string' && search.trim()) {
    const term = `%${search.trim()}%`;
    query += ` AND (internal_reference LIKE ? OR provider_reference LIKE ? OR donor_name LIKE ? OR donor_phone LIKE ? OR donation_purpose LIKE ?)`;
    params.push(term, term, term, term, term);
  }

  query += ` ORDER BY created_at DESC`;
  const records = db.prepare(query).all(...params) as any[];

  const headers = [
    'Nimero y\'Ubwishyu (Transaction Ref)',
    'Nimero ya Gateway (Provider Ref)',
    'Umugiraneza (Donor Name)',
    'Telefone (Donor Phone)',
    'Imeyili (Donor Email)',
    'Amafaranga (Amount)',
    'Ifaranga (Currency)',
    'Uburyo bwo Kwishyura (Payment Method)',
    'Impamvu y\'Inkunga (Donation Purpose)',
    'Imiterere y\'Ubwishyu (Payment Status)',
    'Impamvu yo Kunanirwa (Failure Reason)',
    'Inkunga y\'Ibanga (Anonymous)',
    'Itariki yo Gutangira (Transaction Date)',
    'Itariki byarangiye (Completed Date)',
  ];

  const rows = records.map(d => [
    sanitizeCsvField(d.internal_reference || d.id),
    sanitizeCsvField(d.provider_reference || ''),
    sanitizeCsvField(d.donor_name || (d.is_anonymous ? 'Umugiraneza utifuje kumenyekana' : 'N/A')),
    sanitizeCsvField(d.donor_phone, true),
    sanitizeCsvField(d.donor_email || ''),
    sanitizeCsvField(d.amount),
    sanitizeCsvField(d.currency || 'RWF'),
    sanitizeCsvField(d.provider_slug || 'mtn-momo'),
    sanitizeCsvField(d.donation_purpose || 'Inkunga ya Korali La Lumiere'),
    sanitizeCsvField(d.status),
    sanitizeCsvField(d.failure_reason || ''),
    sanitizeCsvField(d.is_anonymous ? 'Yego (Yes)' : 'Oya (No)'),
    sanitizeCsvField(d.created_at || ''),
    sanitizeCsvField(d.completed_at || ''),
  ]);

  return { records, headers, rows, filename: `la-lumiere-donations-${getDateSuffix()}.csv` };
}

function getEventsData(filters: any) {
  const { date_from, date_to, status, event_status, category, search, include_deleted } = filters;
  let query = `
    SELECT e.id, e.title, e.category, e.description, e.event_date,
           e.start_time, e.end_time, e.location, e.status, e.event_status,
           e.created_at, e.updated_at,
           (SELECT COUNT(*) FROM event_interested ei WHERE ei.event_id = e.id) as interested_count
    FROM events e
    WHERE 1=1
  `;
  const params: any[] = [];

  if (include_deleted !== 'true') {
    query += ` AND (e.is_deleted = 0 OR e.is_deleted IS NULL)`;
  }

  if (status && status !== 'all') {
    query += ` AND e.status = ?`;
    params.push(status);
  }

  if (event_status && event_status !== 'all') {
    query += ` AND e.event_status = ?`;
    params.push(event_status);
  }

  if (category && category !== 'all') {
    query += ` AND LOWER(e.category) = LOWER(?)`;
    params.push(String(category).trim());
  }

  if (date_from) {
    query += ` AND e.event_date >= ?`;
    params.push(date_from);
  }

  if (date_to) {
    query += ` AND e.event_date <= ?`;
    params.push(date_to);
  }

  if (search && typeof search === 'string' && search.trim()) {
    const term = `%${search.trim()}%`;
    query += ` AND (e.title LIKE ? OR e.location LIKE ? OR e.description LIKE ?)`;
    params.push(term, term, term);
  }

  query += ` ORDER BY e.event_date DESC, e.created_at DESC`;
  const records = db.prepare(query).all(...params) as any[];

  const headers = [
    'ID y\'Igikorwa (Event ID)',
    'Umutwe w\'Igikorwa (Event Title)',
    'Icyiciro (Category)',
    'Ubusobanuro (Description)',
    'Itariki y\'Igikorwa (Event Date)',
    'Isaha yo Gutangira (Start Time)',
    'Isaha yo Gusoza (End Time)',
    'Aho Kizabera (Location)',
    'Imiterere y\'Igikorwa (Event Status)',
    'Gushyirwa ku Karubanda (Publish Status)',
    'Abagaragaje Ubushake bwo Kwitabira (Interested RSVPs)',
    'Itariki Cyakoreweho (Created Date)',
    'Itariki Cyavuguruweho (Updated Date)',
  ];

  const rows = records.map(e => [
    sanitizeCsvField(e.id),
    sanitizeCsvField(e.title),
    sanitizeCsvField(e.category || 'Choir Practice'),
    sanitizeCsvField(e.description || ''),
    sanitizeCsvField(e.event_date),
    sanitizeCsvField(e.start_time || '15:00'),
    sanitizeCsvField(e.end_time || '18:00'),
    sanitizeCsvField(e.location || ''),
    sanitizeCsvField(e.event_status || 'upcoming'),
    sanitizeCsvField(e.status || 'published'),
    sanitizeCsvField(e.interested_count ?? 0),
    sanitizeCsvField(e.created_at || ''),
    sanitizeCsvField(e.updated_at || ''),
  ]);

  return { records, headers, rows, filename: `la-lumiere-events-${getDateSuffix()}.csv` };
}

function getSongsData(filters: any) {
  const { date_from, date_to, category, release_status, search } = filters;
  let query = `
    SELECT s.id, s.song_number, s.title, s.composer, s.category_id,
           sc.name as category_name, s.release_status, s.release_date,
           s.description, s.views_count, s.shares_count, s.status,
           s.created_at, s.updated_at,
           (SELECT COUNT(*) FROM audio_tracks at WHERE at.song_id = s.id AND (at.is_deleted = 0 OR at.is_deleted IS NULL)) as audio_count,
           (SELECT content FROM lyrics l WHERE l.song_id = s.id LIMIT 1) as lyrics,
           (SELECT solfa_notation FROM lyrics l WHERE l.song_id = s.id LIMIT 1) as solfa_notation
    FROM songs s
    LEFT JOIN song_categories sc ON s.category_id = sc.id
    WHERE (s.is_deleted = 0 OR s.is_deleted IS NULL)
  `;
  const params: any[] = [];

  if (category && category !== 'all') {
    query += ` AND (s.category_id = ? OR sc.slug = ?)`;
    params.push(category, category);
  }

  if (release_status && release_status !== 'all') {
    query += ` AND s.release_status = ?`;
    params.push(release_status);
  }

  if (date_from) {
    query += ` AND s.created_at >= ?`;
    params.push(date_from);
  }

  if (date_to) {
    query += ` AND s.created_at <= ?`;
    params.push(date_to + ' 23:59:59');
  }

  if (search && typeof search === 'string' && search.trim()) {
    const term = `%${search.trim()}%`;
    query += ` AND (s.title LIKE ? OR s.composer LIKE ? OR s.song_number LIKE ?)`;
    params.push(term, term, term);
  }

  query += ` ORDER BY s.created_at DESC`;
  const records = db.prepare(query).all(...params) as any[];

  const headers = [
    'ID y\'Indirimbo (Song ID)',
    'Nimero y\'Indirimbo (Song Number)',
    'Umutwe w\'Indirimbo (Title)',
    'Uwahimbye (Composer)',
    'Icyiciro (Category)',
    'Imiterere yo Gusohoka (Release Status)',
    'Itariki yo Gusohoka (Release Date)',
    'Amagambo y\'Indirimbo (Lyrics Preview)',
    'Amanota ya Sol-fa (Solfa Notation)',
    'Amajwi Ahari (Audio Tracks Count)',
    'Abarebye (Views Count)',
    'Abasangije (Shares Count)',
    'Imiterere (Status)',
    'Itariki Yashyiriweho (Created Date)',
  ];

  const rows = records.map(s => {
    // Clean lyrics preview for CSV (truncate and remove excessive newlines)
    const cleanLyrics = s.lyrics ? String(s.lyrics).substring(0, 150).replace(/\r?\n/g, ' ') + '...' : '';
    const cleanSolfa = s.solfa_notation ? String(s.solfa_notation).substring(0, 80).replace(/\r?\n/g, ' ') : '';

    return [
      sanitizeCsvField(s.id),
      sanitizeCsvField(s.song_number || ''),
      sanitizeCsvField(s.title),
      sanitizeCsvField(s.composer || 'Korali La Lumiere'),
      sanitizeCsvField(s.category_name || 'Indirimbo'),
      sanitizeCsvField(s.release_status || 'released'),
      sanitizeCsvField(s.release_date || ''),
      sanitizeCsvField(cleanLyrics),
      sanitizeCsvField(cleanSolfa),
      sanitizeCsvField(s.audio_count ?? 0),
      sanitizeCsvField(s.views_count ?? 0),
      sanitizeCsvField(s.shares_count ?? 0),
      sanitizeCsvField(s.status || 'published'),
      sanitizeCsvField(s.created_at || ''),
    ];
  });

  return { records, headers, rows, filename: `la-lumiere-songs-${getDateSuffix()}.csv` };
}

function getAttendanceData(filters: any) {
  const { date_from, date_to, event_id, search } = filters;
  let query = `
    SELECT ei.event_id, ei.user_id, ei.created_at as rsvp_date,
           e.title as event_title, e.event_date, e.location as event_location, e.category as event_category,
           u.name as user_name, u.email as user_email, u.phone as user_phone,
           u.role as user_role, u.choir_voice, u.choir_role
    FROM event_interested ei
    JOIN events e ON ei.event_id = e.id
    JOIN users u ON ei.user_id = u.id
    WHERE (e.is_deleted = 0 OR e.is_deleted IS NULL)
  `;
  const params: any[] = [];

  if (event_id && event_id !== 'all') {
    query += ` AND ei.event_id = ?`;
    params.push(event_id);
  }

  if (date_from) {
    query += ` AND ei.created_at >= ?`;
    params.push(date_from);
  }

  if (date_to) {
    query += ` AND ei.created_at <= ?`;
    params.push(date_to + ' 23:59:59');
  }

  if (search && typeof search === 'string' && search.trim()) {
    const term = `%${search.trim()}%`;
    query += ` AND (e.title LIKE ? OR u.name LIKE ? OR u.email LIKE ? OR u.phone LIKE ?)`;
    params.push(term, term, term, term);
  }

  query += ` ORDER BY ei.created_at DESC`;
  const records = db.prepare(query).all(...params) as any[];

  const headers = [
    'ID y\'Igikorwa (Event ID)',
    'Umutwe w\'Igikorwa (Event Title)',
    'Itariki y\'Igikorwa (Event Date)',
    'Aho Kizabera (Location)',
    'Icyiciro cy\'Igikorwa (Event Category)',
    'ID y\'Umunyamuryango (User ID)',
    'Amazina y\'Uwitabiriye (Member Name)',
    'Imeyili (Member Email)',
    'Telefone (Member Phone)',
    'Inshingano (User Role)',
    'Ijwi muri Korali (Voice Section)',
    'Itariki yo Kugaragaza Ubushake (RSVP Date)',
  ];

  const rows = records.map(r => [
    sanitizeCsvField(r.event_id),
    sanitizeCsvField(r.event_title),
    sanitizeCsvField(r.event_date),
    sanitizeCsvField(r.event_location || ''),
    sanitizeCsvField(r.event_category || ''),
    sanitizeCsvField(r.user_id),
    sanitizeCsvField(r.user_name),
    sanitizeCsvField(r.user_email),
    sanitizeCsvField(r.user_phone, true),
    sanitizeCsvField(r.user_role),
    sanitizeCsvField(r.choir_voice || 'N/A'),
    sanitizeCsvField(r.rsvp_date || ''),
  ]);

  return { records, headers, rows, filename: `la-lumiere-attendance-${getDateSuffix()}.csv` };
}

function getActivityLogsData(filters: any) {
  const { date_from, date_to, resource, action, search } = filters;
  let query = `
    SELECT id, user_id, user_name, user_role, action, resource,
           resource_id, details, created_at
    FROM activity_logs
    WHERE 1=1
  `;
  const params: any[] = [];

  if (resource && resource !== 'all') {
    query += ` AND resource = ?`;
    params.push(resource);
  }

  if (action && action !== 'all') {
    query += ` AND action = ?`;
    params.push(action);
  }

  if (date_from) {
    query += ` AND created_at >= ?`;
    params.push(date_from);
  }

  if (date_to) {
    query += ` AND created_at <= ?`;
    params.push(date_to + ' 23:59:59');
  }

  if (search && typeof search === 'string' && search.trim()) {
    const term = `%${search.trim()}%`;
    query += ` AND (details LIKE ? OR user_name LIKE ? OR action LIKE ?)`;
    params.push(term, term, term);
  }

  query += ` ORDER BY created_at DESC LIMIT 5000`;
  const records = db.prepare(query).all(...params) as any[];

  const headers = [
    'ID ya Log (Log ID)',
    'ID y\'Umuyobozi (User ID)',
    'Amazina y\'Umuyobozi (Admin Name)',
    'Inshingano (Role)',
    'Igikorwa Cyakozwe (Action)',
    'Urwego Cyakozweho (Resource)',
    'ID y\'Urwego (Resource ID)',
    'Ibisobanuro Birambuye (Details)',
    'Igihe Cyakoreweho (Timestamp)',
  ];

  const rows = records.map(l => [
    sanitizeCsvField(l.id),
    sanitizeCsvField(l.user_id || ''),
    sanitizeCsvField(l.user_name || 'System'),
    sanitizeCsvField(l.user_role || 'admin'),
    sanitizeCsvField(l.action),
    sanitizeCsvField(l.resource),
    sanitizeCsvField(l.resource_id || ''),
    sanitizeCsvField(l.details || ''),
    sanitizeCsvField(l.created_at || ''),
  ]);

  return { records, headers, rows, filename: `la-lumiere-activity-logs-${getDateSuffix()}.csv` };
}

function getPledgesData(filters: any) {
  const { date_from, date_to, search } = filters;
  let query = `
    SELECT id, donor_name, donor_phone, amount, message, created_at
    FROM donor_pledges
    WHERE 1=1
  `;
  const params: any[] = [];

  if (date_from) {
    query += ` AND created_at >= ?`;
    params.push(date_from);
  }

  if (date_to) {
    query += ` AND created_at <= ?`;
    params.push(date_to + ' 23:59:59');
  }

  if (search && typeof search === 'string' && search.trim()) {
    const term = `%${search.trim()}%`;
    query += ` AND (donor_name LIKE ? OR donor_phone LIKE ? OR message LIKE ?)`;
    params.push(term, term, term);
  }

  query += ` ORDER BY created_at DESC`;
  const records = db.prepare(query).all(...params) as any[];

  const headers = [
    'ID y\'Umuhigo (Pledge ID)',
    'Amazina y\'Umuhigirije (Donor Name)',
    'Telefone (Donor Phone)',
    'Amafaranga Yahizwe (Amount Pledged)',
    'Ubutumwa bwo Gutera Inkunga (Encouragement Message)',
    'Itariki (Date)',
  ];

  const rows = records.map(p => [
    sanitizeCsvField(p.id),
    sanitizeCsvField(p.donor_name),
    sanitizeCsvField(p.donor_phone, true),
    sanitizeCsvField(p.amount || 0),
    sanitizeCsvField(p.message || ''),
    sanitizeCsvField(p.created_at || ''),
  ]);

  return { records, headers, rows, filename: `la-lumiere-pledges-${getDateSuffix()}.csv` };
}

// Map of category names to handler functions
const CATEGORY_HANDLERS: Record<string, (filters: any) => { records: any[]; headers: string[]; rows: string[][]; filename: string }> = {
  members: getMembersData,
  users: getMembersData,
  donations: getDonationsData,
  payments: getDonationsData,
  events: getEventsData,
  songs: getSongsData,
  attendance: getAttendanceData,
  event_rsvps: getAttendanceData,
  activity_logs: getActivityLogsData,
  logs: getActivityLogsData,
  pledges: getPledgesData,
};

// -------------------------------------------------------------
// ROUTES
// -------------------------------------------------------------

/**
 * GET /api/admin/export/preview
 * Returns pre-export inspection details: record count, sample rows, headers, and date range
 */
exportRouter.get('/preview', requireAdmin, (req: AuthRequest, res: Response) => {
  try {
    const category = String(req.query.category || 'members').toLowerCase();
    const handler = CATEGORY_HANDLERS[category];

    if (!handler) {
      return res.status(400).json({
        error: `Icyiciro cyatoranyijwe "${category}" ntikizwi. Hitamo: members, donations, events, songs, attendance, activity_logs, pledges`,
      });
    }

    const { records, headers, rows, filename } = handler(req.query);
    const sampleRows = rows.slice(0, 3);

    res.json({
      success: true,
      category,
      filename,
      count: records.length,
      headers,
      sampleRows,
      isEmpty: records.length === 0,
      filters: {
        date_from: req.query.date_from || null,
        date_to: req.query.date_to || null,
        status: req.query.status || 'all',
        role: req.query.role || 'all',
        category: req.query.category || 'all',
      },
    });
  } catch (err: any) {
    console.error('Export preview error:', err);
    res.status(500).json({ error: err.message || 'Failed to preview export data' });
  }
});

/**
 * GET /api/admin/export/:category
 * Main streaming/downloading CSV endpoint
 */
exportRouter.get('/:category', requireAdmin, (req: AuthRequest, res: Response) => {
  try {
    const rawCategory = String(req.params.category || req.query.category || 'members').toLowerCase();
    // Support category ending in .csv (e.g. /api/admin/export/members.csv)
    const category = rawCategory.replace(/\.csv$/, '');
    const handler = CATEGORY_HANDLERS[category];

    if (!handler) {
      return res.status(400).json({
        error: `Icyiciro "${category}" ntabwo gishobora koherezwa muri CSV. Hitamo mu bikurikira: members, donations, events, songs, attendance, activity_logs, pledges.`,
      });
    }

    const { records, headers, rows, filename } = handler(req.query);

    const csvContent = buildCsvPayload(headers, rows);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    // Expose header so front-end can read filename if needed
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');

    res.status(200).send(csvContent);
  } catch (err: any) {
    console.error('CSV export generation error:', err);
    res.status(500).json({ error: err.message || 'Habaye ikosa mu gutegura dosiye ya CSV (Export failed)' });
  }
});
