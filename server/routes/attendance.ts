import { Router, Response } from 'express';
import { db, logActivity } from '../db.js';
import { requireAdmin, requireAuth, AuthRequest, isUserAdmin } from '../auth.js';
import { broadcastRealtimeEvent } from '../realtime.js';
import { buildCsvPayload, sanitizeCsvField, getDateSuffix } from '../export.js';
import {
  readAttendanceJson,
  writeAttendanceJson,
  createSessionInJson,
  toggleMemberStatusInJson,
  saveBulkRecordsInJson,
  getChoirMembersList,
  ATTENDANCE_JSON_PATH,
  AttendanceStatus as JsonStatus,
} from '../attendanceStorage.js';

export const attendanceRouter = Router();

/**
 * Valid attendance statuses
 */
export const ATTENDANCE_STATUSES = ['present', 'absent', 'excused', 'late'] as const;
export type AttendanceStatus = typeof ATTENDANCE_STATUSES[number];

export const ACTIVITY_TYPES = ['rehearsal', 'sunday_service', 'concert', 'meeting', 'special_event', 'other'] as const;

/**
 * Calculate attendance percentage:
 * (Present + Late) / Total Recorded * 100
 * Excused absences do not penalize the percentage if configured.
 */
export function calculateAttendancePercentage(present: number, late: number, totalRecorded: number, excused = 0): number {
  if (totalRecorded <= 0) return 100;
  const eligible = totalRecorded - excused;
  if (eligible <= 0) return 100;
  const attended = present + late;
  return Math.min(100, Math.max(0, Math.round((attended / eligible) * 100)));
}

// -------------------------------------------------------------
// HELPER: GET ALL SESSIONS
// -------------------------------------------------------------
function handleGetAllSessions(req: AuthRequest, res: Response) {
  try {
    const { startDate, endDate, activityType, search } = req.query;
    let query = `
      SELECT 
        s.id,
        s.title,
        s.activity_type,
        s.session_date,
        s.start_time,
        s.end_time,
        s.location,
        s.event_id,
        s.notes,
        s.created_by,
        s.created_at,
        s.updated_at,
        e.title as event_title,
        COUNT(r.id) as total_marked,
        SUM(CASE WHEN r.status = 'present' THEN 1 ELSE 0 END) as present_count,
        SUM(CASE WHEN r.status = 'late' THEN 1 ELSE 0 END) as late_count,
        SUM(CASE WHEN r.status = 'excused' THEN 1 ELSE 0 END) as excused_count,
        SUM(CASE WHEN r.status = 'absent' THEN 1 ELSE 0 END) as absent_count
      FROM attendance_sessions s
      LEFT JOIN events e ON s.event_id = e.id
      LEFT JOIN attendance_records r ON s.id = r.session_id
      WHERE s.is_deleted = 0
    `;
    const params: any[] = [];

    if (startDate) {
      query += ' AND s.session_date >= ?';
      params.push(String(startDate));
    }
    if (endDate) {
      query += ' AND s.session_date <= ?';
      params.push(String(endDate));
    }
    if (activityType && activityType !== 'all') {
      query += ' AND s.activity_type = ?';
      params.push(String(activityType));
    }
    if (search) {
      query += ' AND (s.title LIKE ? OR s.location LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    query += `
      GROUP BY s.id
      ORDER BY s.session_date DESC, s.created_at DESC
    `;

    const sessions = db.prepare(query).all(...params) as any[];

    // If user is not admin, attach their personal attendance record for each session
    const isAdmin = isUserAdmin(req.user?.role);
    if (!isAdmin && req.user?.id) {
      const userRecords = db.prepare(`
        SELECT session_id, status, notes
        FROM attendance_records
        WHERE user_id = ?
      `).all(req.user.id) as any[];

      const userRecordMap = new Map(userRecords.map(r => [r.session_id, r]));

      const filtered = sessions.map(s => {
        const myRecord = userRecordMap.get(s.id);
        return {
          ...s,
          my_status: myRecord?.status || 'unmarked',
          my_notes: myRecord?.notes || null,
        };
      });

      return res.json(filtered);
    }

    res.json(sessions);
  } catch (err: any) {
    console.error('Error fetching attendance sessions:', err);
    res.status(500).json({ error: 'Habaye ikibazo mu gushaka amalisiti y\'ubwitabire' });
  }
}

// -------------------------------------------------------------
// HELPER: GET SINGLE SESSION WITH MEMBER STATUS
// -------------------------------------------------------------
function handleGetSessionDetails(req: AuthRequest, res: Response) {
  try {
    const id = req.params.id || String(req.query.session_id || req.query.activity_id);
    const session = db.prepare(`
      SELECT s.*, e.title as event_title
      FROM attendance_sessions s
      LEFT JOIN events e ON s.event_id = e.id
      WHERE s.id = ? AND s.is_deleted = 0
    `).get(id) as any;

    if (!session) {
      return res.status(404).json({ error: 'Ubwitabire ntibubonetse (Session not found)' });
    }

    const isAdmin = isUserAdmin(req.user?.role);

    // If member, only return session with their own record
    if (!isAdmin) {
      const myRecord = db.prepare(`
        SELECT r.*
        FROM attendance_records r
        WHERE r.session_id = ? AND r.user_id = ?
      `).get(id, req.user!.id) as any;

      return res.json({
        session,
        my_record: myRecord || null,
      });
    }

    // Admin view: include all choir members and their marked status
    const includeInactive = req.query.include_inactive === 'true' || req.query.status === 'all';
    let membersQuery = `
      SELECT 
        u.id as user_id,
        u.name,
        u.email,
        u.phone,
        u.choir_voice,
        u.choir_role,
        u.avatar_url,
        u.status as membership_status,
        u.is_disabled,
        r.id as record_id,
        r.status,
        r.notes,
        r.marked_by,
        r.updated_at as record_updated_at
      FROM users u
      LEFT JOIN attendance_records r ON u.id = r.user_id AND r.session_id = ?
      WHERE u.role IN ('choir_member', 'member', 'admin', 'super_admin', 'content_admin', 'moderator')
    `;

    if (!includeInactive) {
      membersQuery += ` AND (u.status = 'active' OR u.status IS NULL) AND (u.is_disabled = 0 OR u.is_disabled IS NULL)`;
    }

    membersQuery += `
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

    const choirMembers = db.prepare(membersQuery).all(id) as any[];

    // Calculate quick counts
    const marked = choirMembers.filter(m => m.status);
    const present = choirMembers.filter(m => m.status === 'present').length;
    const late = choirMembers.filter(m => m.status === 'late').length;
    const excused = choirMembers.filter(m => m.status === 'excused').length;
    const absent = choirMembers.filter(m => m.status === 'absent').length;

    res.json({
      session,
      members: choirMembers,
      stats: {
        total_members: choirMembers.length,
        marked_count: marked.length,
        unmarked_count: choirMembers.length - marked.length,
        present,
        late,
        excused,
        absent,
        attendance_rate: calculateAttendancePercentage(present, late, marked.length, excused),
      },
    });
  } catch (err: any) {
    console.error('Error fetching session details:', err);
    res.status(500).json({ error: 'Habaye ikibazo mu gushaka amakuru y\'ubwitabire' });
  }
}

// -------------------------------------------------------------
// HELPER: CREATE SESSION
// -------------------------------------------------------------
function handleCreateSession(req: AuthRequest, res: Response) {
  try {
    const {
      title,
      activity_type,
      session_date,
      start_time,
      end_time,
      location,
      event_id,
      notes,
      records,
    } = req.body;

    if (!title || !session_date) {
      return res.status(400).json({
        error: 'Umutwe w\'igikorwa n\'itariki birakenewe (Title and session date required)',
      });
    }

    // Create session in persistent JSON file and SQLite
    const createdSession = createSessionInJson({
      title,
      session_date,
      activity_type,
      start_time,
      end_time,
      location,
      event_id,
      notes,
      adminId: req.user!.id,
    });

    let insertedRecordsCount = 0;
    if (Array.isArray(records) && records.length > 0) {
      const bulkRes = saveBulkRecordsInJson(createdSession.id, records, req.user!.id);
      insertedRecordsCount = bulkRes.saved_count;
    }

    logActivity(
      req.user!.id,
      req.user!.name,
      req.user!.role,
      'CREATE_ATTENDANCE_SESSION',
      'attendance_sessions',
      createdSession.id,
      `Created attendance session "${title}" for ${session_date} (${insertedRecordsCount} members marked)`
    );

    broadcastRealtimeEvent('attendance_updated', {
      sessionId: createdSession.id,
      action: 'created',
      date: session_date,
    });

    res.status(201).json({
      message: 'Ubwitabire bwashyizweho neza (Attendance session created)',
      id: createdSession.id,
      session: createdSession,
      records_marked: insertedRecordsCount,
    });
  } catch (err: any) {
    console.error('Error creating attendance session:', err);
    res.status(500).json({ error: 'Habaye ikibazo mu kubika ubwitabire: ' + err.message });
  }
}

// -------------------------------------------------------------
// HELPER: UPDATE SESSION DETAILS
// -------------------------------------------------------------
function handleUpdateSession(req: AuthRequest, res: Response) {
  try {
    const id = req.params.id;
    const { title, activity_type, session_date, start_time, end_time, location, event_id, notes } = req.body;

    const existing = db.prepare('SELECT id FROM attendance_sessions WHERE id = ? AND is_deleted = 0').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Ubwitabire ntibubonetse' });
    }

    const finalActivityType = ACTIVITY_TYPES.includes(activity_type) ? activity_type : 'rehearsal';

    db.prepare(`
      UPDATE attendance_sessions
      SET title = ?,
          activity_type = ?,
          session_date = ?,
          start_time = ?,
          end_time = ?,
          location = ?,
          event_id = ?,
          notes = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      title ? title.trim() : 'Session',
      finalActivityType,
      session_date ? session_date.trim() : new Date().toISOString().slice(0, 10),
      start_time || '15:00',
      end_time || '18:00',
      location || 'ADEPR Nyanza',
      event_id || null,
      notes ? notes.trim() : null,
      id
    );

    // Update in JSON file
    try {
      const store = readAttendanceJson();
      const sess = store.sessions.find(s => s.id === id);
      if (sess) {
        if (title) sess.title = title.trim();
        if (activity_type) sess.activity_type = activity_type;
        if (session_date) sess.session_date = session_date.trim();
        if (start_time) sess.start_time = start_time;
        if (end_time) sess.end_time = end_time;
        if (location) sess.location = location;
        if (event_id !== undefined) sess.event_id = event_id;
        if (notes !== undefined) sess.notes = notes;
        sess.updated_at = new Date().toISOString();
        writeAttendanceJson(store);
      }
    } catch (e) {
      console.warn('[Attendance] JSON session update warning:', e);
    }

    logActivity(
      req.user!.id,
      req.user!.name,
      req.user!.role,
      'UPDATE_ATTENDANCE_SESSION',
      'attendance_sessions',
      id,
      `Updated attendance session "${title}"`
    );

    broadcastRealtimeEvent('attendance_updated', {
      sessionId: id,
      action: 'updated',
    });

    res.json({ message: 'Ubwitabire bwavuguruwe neza (Session updated)' });
  } catch (err: any) {
    console.error('Error updating session:', err);
    res.status(500).json({ error: 'Habaye ikibazo mu kuvugurura ubwitabire' });
  }
}

// -------------------------------------------------------------
// HELPER: SAVE SESSION RECORDS (BULK)
// -------------------------------------------------------------
function handleSaveSessionRecords(req: AuthRequest, res: Response) {
  try {
    const id = req.params.id || String(req.body.session_id || req.body.activity_id);
    const session = db.prepare('SELECT id, title FROM attendance_sessions WHERE id = ? AND is_deleted = 0').get(id) as any;
    if (!session) {
      return res.status(404).json({ error: 'Ubwitabire ntibubonetse (Session not found)' });
    }

    const { records, user_id, status, notes } = req.body;
    let recordsToSave: Array<{ user_id: string; status: AttendanceStatus; notes?: string }> = [];

    if (Array.isArray(records)) {
      recordsToSave = records
        .filter(r => r && r.user_id && ATTENDANCE_STATUSES.includes(r.status))
        .map(r => ({
          user_id: r.user_id,
          status: r.status,
          notes: r.notes || '',
        }));
    } else if (user_id && ATTENDANCE_STATUSES.includes(status)) {
      recordsToSave = [{ user_id, status, notes: notes || '' }];
    } else {
      return res.status(400).json({ error: 'Amakuru y\'ubwitabire si yo (Invalid records payload)' });
    }

    // Save atomically into ./data/attendance.json AND SQLite
    const bulkRes = saveBulkRecordsInJson(id, recordsToSave as any, req.user!.id);

    logActivity(
      req.user!.id,
      req.user!.name,
      req.user!.role,
      'MARK_ATTENDANCE',
      'attendance_records',
      id,
      `Marked attendance for ${bulkRes.saved_count} members in session "${session.title}"`
    );

    broadcastRealtimeEvent('attendance_updated', {
      sessionId: id,
      action: 'records_updated',
      count: bulkRes.saved_count,
    });

    res.json({
      success: true,
      message: `Ubwitabire bw'abaririmbyi ${bulkRes.saved_count} bwabitswe neza muri JSON na Database`,
      saved_count: bulkRes.saved_count,
    });
  } catch (err: any) {
    console.error('Error recording attendance:', err);
    res.status(500).json({ error: 'Habaye ikibazo mu kubika ubwitabire: ' + err.message });
  }
}

// -------------------------------------------------------------
// 0. ROOT ENDPOINTS (/api/attendance)
// -------------------------------------------------------------
attendanceRouter.get('/', requireAuth, (req: AuthRequest, res: Response) => {
  const { session_id, activity_id, member_id, user_id } = req.query;
  if (session_id || activity_id) {
    req.params.id = String(session_id || activity_id);
    return handleGetSessionDetails(req, res);
  }
  if (member_id || user_id) {
    return handleGetMemberAttendanceHistory(req, res);
  }
  return handleGetAllSessions(req, res);
});

attendanceRouter.post('/', requireAdmin, (req: AuthRequest, res: Response) => {
  if (req.body.records && (req.body.session_id || req.body.activity_id)) {
    req.params.id = String(req.body.session_id || req.body.activity_id);
    return handleSaveSessionRecords(req, res);
  }
  return handleCreateSession(req, res);
});

attendanceRouter.put('/:id', requireAdmin, (req: AuthRequest, res: Response) => {
  return handleUpdateSession(req, res);
});

// -------------------------------------------------------------
// 1. SESSIONS SUB-ROUTES
// -------------------------------------------------------------
attendanceRouter.get('/sessions', requireAuth, handleGetAllSessions);
attendanceRouter.get('/sessions/:id', requireAuth, handleGetSessionDetails);
attendanceRouter.post('/sessions', requireAdmin, handleCreateSession);
attendanceRouter.put('/sessions/:id', requireAdmin, handleUpdateSession);
attendanceRouter.post('/sessions/:id/records', requireAdmin, handleSaveSessionRecords);

// Delete session
attendanceRouter.delete('/sessions/:id', requireAdmin, (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const existing = db.prepare('SELECT title FROM attendance_sessions WHERE id = ?').get(id) as any;
    if (!existing) {
      return res.status(404).json({ error: 'Ubwitabire ntibubonetse' });
    }

    db.prepare('UPDATE attendance_sessions SET is_deleted = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(id);

    try {
      const store = readAttendanceJson();
      const sess = store.sessions.find(s => s.id === id);
      if (sess) {
        sess.is_deleted = true;
        sess.updated_at = new Date().toISOString();
        writeAttendanceJson(store);
      }
    } catch (e) {
      console.warn('[Attendance] JSON session delete notice:', e);
    }

    logActivity(
      req.user!.id,
      req.user!.name,
      req.user!.role,
      'DELETE_ATTENDANCE_SESSION',
      'attendance_sessions',
      id,
      `Deleted attendance session "${existing.title}"`
    );

    broadcastRealtimeEvent('attendance_updated', {
      sessionId: id,
      action: 'deleted',
    });

    res.json({ message: 'Ubwitabire bwasibwe neza (Session deleted)' });
  } catch (err: any) {
    console.error('Error deleting session:', err);
    res.status(500).json({ error: 'Habaye ikibazo mu gusiba ubwitabire' });
  }
});

// -------------------------------------------------------------
// 2. LIST MEMBERS FOR ATTENDANCE
// -------------------------------------------------------------
attendanceRouter.get('/members', requireAdmin, (req: AuthRequest, res: Response) => {
  try {
    const { sessionId, session_id, activity_id, status } = req.query;
    const targetSessionId = sessionId || session_id || activity_id;

    let query = `
      SELECT 
        u.id as user_id,
        u.name,
        u.email,
        u.phone,
        u.choir_voice,
        u.choir_role,
        u.avatar_url,
        u.status as membership_status,
        u.is_disabled
      FROM users u
      WHERE u.role IN ('choir_member', 'member', 'admin', 'super_admin', 'content_admin', 'moderator')
    `;

    if (status === 'active') {
      query += ` AND (u.status = 'active' OR u.status IS NULL) AND (u.is_disabled = 0 OR u.is_disabled IS NULL)`;
    } else if (status === 'inactive') {
      query += ` AND (u.status = 'inactive' OR u.is_disabled = 1)`;
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

    const members = db.prepare(query).all() as any[];

    if (targetSessionId) {
      const records = db.prepare(`
        SELECT user_id, status, notes
        FROM attendance_records
        WHERE session_id = ?
      `).all(String(targetSessionId)) as any[];

      const recordMap = new Map(records.map(r => [r.user_id, r]));

      const membersWithStatus = members.map(m => {
        const rec = recordMap.get(m.user_id);
        const isInactive = m.membership_status === 'inactive' || m.is_disabled === 1;
        return {
          ...m,
          status: rec ? rec.status : 'absent',
          is_present: rec?.status === 'present',
          notes: rec ? rec.notes : '',
          membership_status: isInactive ? 'inactive' : 'active',
        };
      });

      return res.json({
        session_id: targetSessionId,
        members: membersWithStatus,
        count: membersWithStatus.length,
      });
    }

    res.json({
      members: members.map(m => ({
        ...m,
        membership_status: (m.membership_status === 'inactive' || m.is_disabled === 1) ? 'inactive' : 'active',
      })),
      count: members.length,
    });
  } catch (err: any) {
    console.error('Error fetching attendance members:', err);
    res.status(500).json({ error: 'Habaye ikibazo mu gushaka abaririmbyi' });
  }
});

// -------------------------------------------------------------
// 3. TOGGLE ATTENDANCE STATUS (PRESENT / ABSENT / LATE)
// -------------------------------------------------------------
const handleToggleStatus = (req: AuthRequest, res: Response) => {
  try {
    const sessionId = req.body.session_id || req.body.activity_id || req.params.sessionId;
    const userId = req.body.user_id || req.params.userId;
    const { status, notes } = req.body;

    if (!sessionId || !userId) {
      return res.status(400).json({ error: 'session_id na user_id birakenewe (session_id and user_id required)' });
    }

    const { record, session } = toggleMemberStatusInJson({
      sessionId,
      userId,
      targetStatus: status,
      notes,
      adminId: req.user!.id,
    });

    broadcastRealtimeEvent('attendance_updated', {
      sessionId,
      action: 'member_status_toggled',
      userId,
      status: record.status,
    });

    res.json({
      success: true,
      message: `Imimerere yahinduwe kuri: ${record.status}`,
      record,
      session_id: sessionId,
      user_id: userId,
      status: record.status,
    });
  } catch (err: any) {
    console.error('Error toggling attendance status:', err);
    res.status(500).json({ error: err.message || 'Habaye ikibazo mu guhindura imimerere y\'ubwitabire' });
  }
};

attendanceRouter.post('/toggle-status', requireAdmin, handleToggleStatus);
attendanceRouter.put('/toggle-status', requireAdmin, handleToggleStatus);
attendanceRouter.patch('/sessions/:sessionId/members/:userId/status', requireAdmin, handleToggleStatus);

// -------------------------------------------------------------
// 4. GET RAW PERSISTENT JSON STORE (ADMIN ONLY)
// -------------------------------------------------------------
attendanceRouter.get('/json', requireAdmin, (req: AuthRequest, res: Response) => {
  try {
    const store = readAttendanceJson();
    res.json({
      file_path: ATTENDANCE_JSON_PATH,
      total_sessions: store.sessions.length,
      last_updated: store.last_updated,
      store,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to read attendance.json' });
  }
});

attendanceRouter.get('/data', requireAdmin, (req: AuthRequest, res: Response) => {
  try {
    const store = readAttendanceJson();
    res.json(store);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to read attendance data' });
  }
});

// -------------------------------------------------------------
// 5. MEMBER ATTENDANCE HISTORY
// -------------------------------------------------------------
function handleGetMemberAttendanceHistory(req: AuthRequest, res: Response) {
  try {
    const userId = req.params.id || String(req.query.member_id || req.query.user_id || req.user?.id);
    const member = db.prepare('SELECT id, name, email, phone, choir_voice, choir_role, status, is_disabled FROM users WHERE id = ?').get(userId) as any;
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
    `).all(userId) as any[];

    const totalSessions = history.length;
    const present = history.filter(h => h.status === 'present').length;
    const late = history.filter(h => h.status === 'late').length;
    const excused = history.filter(h => h.status === 'excused').length;
    const absent = history.filter(h => h.status === 'absent').length;
    const attended = present + late;
    const eligible = totalSessions - excused;
    const percentage = eligible > 0 ? Math.round((attended / eligible) * 100) : 100;

    res.json({
      member,
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
    console.error('Error fetching member history:', err);
    res.status(500).json({ error: 'Habaye ikibazo mu gushaka amateka y\'ubwitabire' });
  }
}

attendanceRouter.get('/my-history', requireAuth, (req: AuthRequest, res: Response) => {
  return handleGetMemberAttendanceHistory(req, res);
});
attendanceRouter.get('/history/:id', requireAuth, handleGetMemberAttendanceHistory);

// -------------------------------------------------------------
// 6. SUMMARY & LEADERBOARD (ADMIN ONLY)
// -------------------------------------------------------------
attendanceRouter.get('/summary', requireAdmin, (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate, voice } = req.query;

    let sessionFilter = 's.is_deleted = 0';
    const params: any[] = [];
    if (startDate) {
      sessionFilter += ' AND s.session_date >= ?';
      params.push(String(startDate));
    }
    if (endDate) {
      sessionFilter += ' AND s.session_date <= ?';
      params.push(String(endDate));
    }

    const totalSessionsRow = db.prepare(`
      SELECT COUNT(*) as count FROM attendance_sessions s WHERE ${sessionFilter}
    `).get(...params) as any;
    const totalSessions = totalSessionsRow?.count || 0;

    // Per member statistics
    let memberQuery = `
      SELECT 
        u.id as user_id,
        u.name,
        u.email,
        u.phone,
        u.choir_voice,
        u.choir_role,
        u.avatar_url,
        u.status as membership_status,
        u.is_disabled,
        COUNT(r.id) as sessions_recorded,
        SUM(CASE WHEN r.status = 'present' THEN 1 ELSE 0 END) as present_count,
        SUM(CASE WHEN r.status = 'late' THEN 1 ELSE 0 END) as late_count,
        SUM(CASE WHEN r.status = 'excused' THEN 1 ELSE 0 END) as excused_count,
        SUM(CASE WHEN r.status = 'absent' THEN 1 ELSE 0 END) as absent_count
      FROM users u
      LEFT JOIN attendance_records r ON u.id = r.user_id
      LEFT JOIN attendance_sessions s ON r.session_id = s.id AND ${sessionFilter}
      WHERE u.role IN ('choir_member', 'member', 'admin', 'super_admin', 'content_admin', 'moderator')
    `;

    const memberParams = [...params];
    if (voice && voice !== 'all') {
      memberQuery += ' AND u.choir_voice = ?';
      memberParams.push(String(voice));
    }

    memberQuery += `
      GROUP BY u.id
      ORDER BY 
        (CAST(SUM(CASE WHEN r.status IN ('present', 'late') THEN 1 ELSE 0 END) AS REAL) / 
          NULLIF(COUNT(r.id) - SUM(CASE WHEN r.status = 'excused' THEN 1 ELSE 0 END), 0)) DESC,
        u.name ASC
    `;

    const memberRows = db.prepare(memberQuery).all(...memberParams) as any[];

    const memberSummaries = memberRows.map(m => {
      const rec = m.sessions_recorded || 0;
      const pres = m.present_count || 0;
      const late = m.late_count || 0;
      const exc = m.excused_count || 0;
      const abs = m.absent_count || 0;
      const isInactive = m.membership_status === 'inactive' || m.is_disabled === 1;
      return {
        ...m,
        status: isInactive ? 'inactive' : 'active',
        sessions_recorded: rec,
        present_count: pres,
        late_count: late,
        excused_count: exc,
        absent_count: abs,
        percentage: calculateAttendancePercentage(pres, late, rec, exc),
      };
    });

    // Voice section breakdown
    const voiceBreakdown = db.prepare(`
      SELECT 
        COALESCE(u.choir_voice, 'Other') as section,
        COUNT(DISTINCT u.id) as member_count,
        SUM(CASE WHEN r.status = 'present' THEN 1 ELSE 0 END) as present_count,
        SUM(CASE WHEN r.status = 'late' THEN 1 ELSE 0 END) as late_count,
        SUM(CASE WHEN r.status = 'excused' THEN 1 ELSE 0 END) as excused_count,
        SUM(CASE WHEN r.status = 'absent' THEN 1 ELSE 0 END) as absent_count,
        COUNT(r.id) as total_recorded
      FROM users u
      LEFT JOIN attendance_records r ON u.id = r.user_id
      LEFT JOIN attendance_sessions s ON r.session_id = s.id AND ${sessionFilter}
      WHERE u.role IN ('choir_member', 'member', 'admin', 'super_admin', 'content_admin', 'moderator')
        AND (u.status = 'active' OR u.status IS NULL) AND (u.is_disabled = 0 OR u.is_disabled IS NULL)
      GROUP BY COALESCE(u.choir_voice, 'Other')
      ORDER BY member_count DESC
    `).all(...params) as any[];

    const totalActiveMembers = (db.prepare(`
      SELECT COUNT(*) as count FROM users
      WHERE role IN ('choir_member', 'member', 'admin', 'super_admin', 'content_admin', 'moderator')
        AND (status = 'active' OR status IS NULL) AND (is_disabled = 0 OR is_disabled IS NULL)
    `).get() as any)?.count || 0;

    const overallPresent = memberSummaries.reduce((acc, m) => acc + m.present_count, 0);
    const overallLate = memberSummaries.reduce((acc, m) => acc + m.late_count, 0);
    const overallExcused = memberSummaries.reduce((acc, m) => acc + m.excused_count, 0);
    const overallAbsent = memberSummaries.reduce((acc, m) => acc + m.absent_count, 0);
    const overallRecorded = memberSummaries.reduce((acc, m) => acc + m.sessions_recorded, 0);

    res.json({
      total_sessions: totalSessions,
      total_members: totalActiveMembers,
      overall_rate: calculateAttendancePercentage(overallPresent, overallLate, overallRecorded, overallExcused),
      totals: {
        present: overallPresent,
        late: overallLate,
        excused: overallExcused,
        absent: overallAbsent,
        recorded: overallRecorded,
      },
      members: memberSummaries,
      voice_breakdown: voiceBreakdown.map(v => ({
        ...v,
        rate: calculateAttendancePercentage(v.present_count, v.late_count, v.total_recorded, v.excused_count),
      })),
    });
  } catch (err: any) {
    console.error('Error calculating attendance summary:', err);
    res.status(500).json({ error: 'Habaye ikibazo mu kubara imibare y\'ubwitabire' });
  }
});

// -------------------------------------------------------------
// 7. EXPORT ATTENDANCE TO CSV
// -------------------------------------------------------------
attendanceRouter.get('/export/csv', (req, res: Response) => {
  try {
    const { sessionId, startDate, endDate } = req.query;

    let headers: string[] = [];
    let rows: string[][] = [];
    let filename = `la-lumiere-attendance-${getDateSuffix()}.csv`;

    if (sessionId) {
      const session = db.prepare(`
        SELECT s.*, e.title as event_title
        FROM attendance_sessions s
        LEFT JOIN events e ON s.event_id = e.id
        WHERE s.id = ?
      `).get(String(sessionId)) as any;

      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      filename = `la-lumiere-attendance-${session.session_date}-${session.title.replace(/[^a-zA-Z0-9]/g, '_')}.csv`;

      headers = ['Member Name', 'Choir Voice', 'Choir Role', 'Phone', 'Attendance Status', 'Notes', 'Session Date', 'Activity Type', 'Location', 'Marked By'];

      const records = db.prepare(`
        SELECT 
          u.name,
          COALESCE(u.choir_voice, 'Choir Member') as choir_voice,
          COALESCE(u.choir_role, 'Member') as choir_role,
          u.phone,
          COALESCE(r.status, 'unmarked') as status,
          COALESCE(r.notes, '') as notes,
          s.session_date,
          s.activity_type,
          s.location,
          COALESCE(admin.name, 'Admin') as marked_by_name
        FROM users u
        LEFT JOIN attendance_records r ON u.id = r.user_id AND r.session_id = ?
        LEFT JOIN attendance_sessions s ON s.id = ?
        LEFT JOIN users admin ON r.marked_by = admin.id
        WHERE u.role IN ('choir_member', 'member', 'admin', 'super_admin', 'content_admin', 'moderator')
        ORDER BY u.name ASC
      `).all(String(sessionId), String(sessionId)) as any[];

      rows = records.map(r => [
        sanitizeCsvField(r.name),
        sanitizeCsvField(r.choir_voice),
        sanitizeCsvField(r.choir_role),
        sanitizeCsvField(r.phone, true),
        sanitizeCsvField(r.status.toUpperCase()),
        sanitizeCsvField(r.notes),
        sanitizeCsvField(r.session_date),
        sanitizeCsvField(r.activity_type),
        sanitizeCsvField(r.location),
        sanitizeCsvField(r.marked_by_name),
      ]);
    } else {
      headers = ['Session Date', 'Session Title', 'Activity Type', 'Location', 'Total Present', 'Total Late', 'Total Excused', 'Total Absent', 'Total Marked', 'Attendance Rate (%)'];

      let query = `
        SELECT 
          s.session_date,
          s.title,
          s.activity_type,
          s.location,
          SUM(CASE WHEN r.status = 'present' THEN 1 ELSE 0 END) as present_count,
          SUM(CASE WHEN r.status = 'late' THEN 1 ELSE 0 END) as late_count,
          SUM(CASE WHEN r.status = 'excused' THEN 1 ELSE 0 END) as excused_count,
          SUM(CASE WHEN r.status = 'absent' THEN 1 ELSE 0 END) as absent_count,
          COUNT(r.id) as total_marked
        FROM attendance_sessions s
        LEFT JOIN attendance_records r ON s.id = r.session_id
        WHERE s.is_deleted = 0
      `;
      const params: any[] = [];
      if (startDate) {
        query += ' AND s.session_date >= ?';
        params.push(String(startDate));
      }
      if (endDate) {
        query += ' AND s.session_date <= ?';
        params.push(String(endDate));
      }
      query += `
        GROUP BY s.id
        ORDER BY s.session_date DESC
      `;

      const sessions = db.prepare(query).all(...params) as any[];

      rows = sessions.map(s => {
        const rate = calculateAttendancePercentage(s.present_count, s.late_count, s.total_marked, s.excused_count);
        return [
          sanitizeCsvField(s.session_date),
          sanitizeCsvField(s.title),
          sanitizeCsvField(s.activity_type),
          sanitizeCsvField(s.location),
          String(s.present_count || 0),
          String(s.late_count || 0),
          String(s.excused_count || 0),
          String(s.absent_count || 0),
          String(s.total_marked || 0),
          `${rate}%`,
        ];
      });
    }

    const payload = buildCsvPayload(headers, rows);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(payload);
  } catch (err: any) {
    console.error('Error generating attendance CSV export:', err);
    res.status(500).json({ error: 'Failed to export attendance CSV' });
  }
});
