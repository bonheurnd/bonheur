import fs from 'fs';
import path from 'path';
import { db } from './db.js';

export const DATA_DIR = path.join(process.cwd(), 'data');
export const ATTENDANCE_JSON_PATH = path.join(DATA_DIR, 'attendance.json');

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';
export const VALID_STATUSES: AttendanceStatus[] = ['present', 'absent', 'late', 'excused'];

export interface JsonAttendanceRecord {
  id: string;
  session_id: string;
  user_id: string;
  name?: string;
  choir_voice?: string;
  choir_role?: string;
  status: AttendanceStatus;
  notes?: string;
  marked_by?: string;
  created_at: string;
  updated_at: string;
}

export interface JsonAttendanceSession {
  id: string;
  title: string;
  activity_type: string;
  session_date: string;
  start_time: string;
  end_time: string;
  location: string;
  event_id?: string | null;
  notes?: string | null;
  created_by?: string;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
  records: Record<string, JsonAttendanceRecord>; // keyed by user_id
}

export interface AttendanceJsonStore {
  version: number;
  last_updated: string;
  sessions: JsonAttendanceSession[];
}

/**
 * Ensures data directory exists
 */
function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

/**
 * Atomic write to JSON file using a temp file and rename
 */
export function writeAttendanceJson(store: AttendanceJsonStore): void {
  ensureDataDir();
  store.last_updated = new Date().toISOString();
  const tmpFile = `${ATTENDANCE_JSON_PATH}.tmp.${Date.now()}`;
  try {
    fs.writeFileSync(tmpFile, JSON.stringify(store, null, 2), 'utf-8');
    fs.renameSync(tmpFile, ATTENDANCE_JSON_PATH);
  } catch (err) {
    if (fs.existsSync(tmpFile)) {
      try { fs.unlinkSync(tmpFile); } catch {}
    }
    throw err;
  }
}

/**
 * Reads attendance.json from disk.
 * If file does not exist, seeds it from current SQLite database records
 * so existing data is never wiped.
 */
export function readAttendanceJson(): AttendanceJsonStore {
  ensureDataDir();
  if (fs.existsSync(ATTENDANCE_JSON_PATH)) {
    try {
      const raw = fs.readFileSync(ATTENDANCE_JSON_PATH, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.sessions)) {
        return parsed as AttendanceJsonStore;
      }
    } catch (err) {
      console.error('[AttendanceStorage] Error reading attendance.json, attempting backup & reload:', err);
      try {
        fs.copyFileSync(ATTENDANCE_JSON_PATH, `${ATTENDANCE_JSON_PATH}.bak.${Date.now()}`);
      } catch {}
    }
  }

  // File does not exist or was empty/corrupted: seed from SQLite
  const store: AttendanceJsonStore = {
    version: 1,
    last_updated: new Date().toISOString(),
    sessions: [],
  };

  try {
    const dbSessions = db.prepare(`
      SELECT * FROM attendance_sessions
      WHERE is_deleted = 0
      ORDER BY session_date DESC, created_at DESC
    `).all() as any[];

    for (const sess of dbSessions) {
      const dbRecords = db.prepare(`
        SELECT r.*, u.name, u.choir_voice, u.choir_role
        FROM attendance_records r
        LEFT JOIN users u ON r.user_id = u.id
        WHERE r.session_id = ?
      `).all(sess.id) as any[];

      const recordsMap: Record<string, JsonAttendanceRecord> = {};
      for (const r of dbRecords) {
        recordsMap[r.user_id] = {
          id: r.id,
          session_id: r.session_id,
          user_id: r.user_id,
          name: r.name || 'Member',
          choir_voice: r.choir_voice || 'Choir Member',
          choir_role: r.choir_role || 'Member',
          status: (VALID_STATUSES.includes(r.status) ? r.status : 'present') as AttendanceStatus,
          notes: r.notes || '',
          marked_by: r.marked_by || 'admin',
          created_at: r.created_at || new Date().toISOString(),
          updated_at: r.updated_at || new Date().toISOString(),
        };
      }

      store.sessions.push({
        id: sess.id,
        title: sess.title,
        activity_type: sess.activity_type || 'rehearsal',
        session_date: sess.session_date,
        start_time: sess.start_time || '15:00',
        end_time: sess.end_time || '18:00',
        location: sess.location || 'ADEPR Nyanza',
        event_id: sess.event_id || null,
        notes: sess.notes || null,
        created_by: sess.created_by || 'admin',
        created_at: sess.created_at || new Date().toISOString(),
        updated_at: sess.updated_at || new Date().toISOString(),
        is_deleted: Boolean(sess.is_deleted),
        records: recordsMap,
      });
    }
  } catch (err) {
    console.warn('[AttendanceStorage] SQLite seeding notice:', err);
  }

  // Save the initialized store to ./data/attendance.json
  try {
    writeAttendanceJson(store);
  } catch (err) {
    console.error('[AttendanceStorage] Failed to write initial attendance.json:', err);
  }

  return store;
}

/**
 * Returns all active choir members from users table
 */
export function getChoirMembersList() {
  try {
    return db.prepare(`
      SELECT 
        u.id,
        u.name,
        u.email,
        u.phone,
        u.choir_voice,
        u.choir_role,
        u.avatar_url,
        u.role
      FROM users u
      WHERE u.role IN ('choir_member', 'member', 'admin', 'super_admin', 'content_admin', 'moderator')
        AND (u.is_disabled = 0 OR u.is_disabled IS NULL)
      ORDER BY 
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
    `).all() as any[];
  } catch (err) {
    console.error('[AttendanceStorage] Error querying choir members:', err);
    return [];
  }
}

/**
 * Creates a new session in attendance.json and syncs to SQLite
 */
export function createSessionInJson(params: {
  title: string;
  session_date: string;
  activity_type?: string;
  start_time?: string;
  end_time?: string;
  location?: string;
  event_id?: string | null;
  notes?: string | null;
  adminId: string;
}): JsonAttendanceSession {
  const store = readAttendanceJson();
  const sessionId = 'att_sess_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
  const now = new Date().toISOString();

  const newSession: JsonAttendanceSession = {
    id: sessionId,
    title: params.title.trim(),
    activity_type: params.activity_type || 'rehearsal',
    session_date: params.session_date.trim(),
    start_time: params.start_time || '15:00',
    end_time: params.end_time || '18:00',
    location: params.location || 'ADEPR Nyanza',
    event_id: params.event_id || null,
    notes: params.notes ? params.notes.trim() : null,
    created_by: params.adminId,
    created_at: now,
    updated_at: now,
    is_deleted: false,
    records: {},
  };

  store.sessions.unshift(newSession);
  writeAttendanceJson(store);

  // Sync to SQLite
  try {
    db.prepare(`
      INSERT INTO attendance_sessions (
        id, title, activity_type, session_date, start_time, end_time, location, event_id, notes, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      newSession.id,
      newSession.title,
      newSession.activity_type,
      newSession.session_date,
      newSession.start_time,
      newSession.end_time,
      newSession.location,
      newSession.event_id,
      newSession.notes,
      newSession.created_by
    );
  } catch (e) {
    console.warn('[AttendanceStorage] SQLite session sync warning:', e);
  }

  return newSession;
}

/**
 * Toggles or sets a member's attendance status in attendance.json and syncs to SQLite
 * Cycle if no targetStatus given: 'present' -> 'late' -> 'absent' -> 'present'
 */
export function toggleMemberStatusInJson(params: {
  sessionId: string;
  userId: string;
  targetStatus?: AttendanceStatus;
  notes?: string;
  adminId: string;
}): { record: JsonAttendanceRecord; session: JsonAttendanceSession } {
  const store = readAttendanceJson();
  const session = store.sessions.find(s => s.id === params.sessionId && !s.is_deleted);
  if (!session) {
    throw new Error(`Attendance session "${params.sessionId}" not found`);
  }

  const existingRec = session.records[params.userId];
  let newStatus: AttendanceStatus;

  if (params.targetStatus && VALID_STATUSES.includes(params.targetStatus)) {
    newStatus = params.targetStatus;
  } else if (existingRec) {
    // Cycle toggle: present -> late -> absent -> present
    if (existingRec.status === 'present') newStatus = 'late';
    else if (existingRec.status === 'late') newStatus = 'absent';
    else if (existingRec.status === 'absent') newStatus = 'present';
    else newStatus = 'present';
  } else {
    // First time marking defaults to present
    newStatus = 'present';
  }

  // Lookup member details for nice metadata in JSON
  const member = db.prepare('SELECT name, choir_voice, choir_role FROM users WHERE id = ?').get(params.userId) as any;
  const now = new Date().toISOString();
  const recId = existingRec ? existingRec.id : 'att_rec_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);

  const updatedRecord: JsonAttendanceRecord = {
    id: recId,
    session_id: params.sessionId,
    user_id: params.userId,
    name: member?.name || existingRec?.name || 'Member',
    choir_voice: member?.choir_voice || existingRec?.choir_voice || 'Choir Member',
    choir_role: member?.choir_role || existingRec?.choir_role || 'Member',
    status: newStatus,
    notes: params.notes !== undefined ? params.notes : (existingRec?.notes || ''),
    marked_by: params.adminId,
    created_at: existingRec?.created_at || now,
    updated_at: now,
  };

  session.records[params.userId] = updatedRecord;
  session.updated_at = now;
  writeAttendanceJson(store);

  // Sync to SQLite
  try {
    db.prepare(`
      INSERT INTO attendance_records (id, session_id, user_id, status, notes, marked_by)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(session_id, user_id) DO UPDATE SET
        status = excluded.status,
        notes = excluded.notes,
        marked_by = excluded.marked_by,
        updated_at = CURRENT_TIMESTAMP
    `).run(
      updatedRecord.id,
      updatedRecord.session_id,
      updatedRecord.user_id,
      updatedRecord.status,
      updatedRecord.notes || null,
      updatedRecord.marked_by
    );
  } catch (e) {
    console.warn('[AttendanceStorage] SQLite record sync warning:', e);
  }

  return { record: updatedRecord, session };
}

/**
 * Saves a batch of attendance records for a session into attendance.json and syncs to SQLite
 */
export function saveBulkRecordsInJson(
  sessionId: string,
  records: Array<{ user_id: string; status: AttendanceStatus; notes?: string }>,
  adminId: string
): { saved_count: number; session: JsonAttendanceSession } {
  const store = readAttendanceJson();
  const session = store.sessions.find(s => s.id === sessionId && !s.is_deleted);
  if (!session) {
    throw new Error(`Attendance session "${sessionId}" not found`);
  }

  const now = new Date().toISOString();
  let savedCount = 0;

  const insertRecordStmt = db.prepare(`
    INSERT INTO attendance_records (id, session_id, user_id, status, notes, marked_by)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(session_id, user_id) DO UPDATE SET
      status = excluded.status,
      notes = excluded.notes,
      marked_by = excluded.marked_by,
      updated_at = CURRENT_TIMESTAMP
  `);

  for (const r of records) {
    if (!r.user_id || !VALID_STATUSES.includes(r.status)) continue;

    const existingRec = session.records[r.user_id];
    const recId = existingRec ? existingRec.id : 'att_rec_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const member = db.prepare('SELECT name, choir_voice, choir_role FROM users WHERE id = ?').get(r.user_id) as any;

    const record: JsonAttendanceRecord = {
      id: recId,
      session_id: sessionId,
      user_id: r.user_id,
      name: member?.name || existingRec?.name || 'Member',
      choir_voice: member?.choir_voice || existingRec?.choir_voice || 'Choir Member',
      choir_role: member?.choir_role || existingRec?.choir_role || 'Member',
      status: r.status,
      notes: r.notes || '',
      marked_by: adminId,
      created_at: existingRec?.created_at || now,
      updated_at: now,
    };

    session.records[r.user_id] = record;
    savedCount++;

    try {
      insertRecordStmt.run(
        record.id,
        record.session_id,
        record.user_id,
        record.status,
        record.notes || null,
        record.marked_by
      );
    } catch (e) {
      console.warn('[AttendanceStorage] SQLite bulk record sync notice:', e);
    }
  }

  session.updated_at = now;
  writeAttendanceJson(store);

  return { saved_count: savedCount, session };
}

