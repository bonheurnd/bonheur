import { Router, Response } from 'express';
import { db, logActivity } from '../db.js';
import { requireAdmin, requireAuth, AuthRequest, isUserAdmin } from '../auth.js';
import { broadcastRealtimeEvent } from '../realtime.js';
import { buildCsvPayload, sanitizeCsvField, getDateSuffix } from '../export.js';

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
 * Excused absences do not penalize the percentage if configured, or can be counted cleanly.
 * Formula: ((present + late) / (total_recorded - excused > 0 ? total_recorded - excused : total_recorded)) * 100
 */
export function calculateAttendancePercentage(present: number, late: number, totalRecorded: number, excused = 0): number {
  if (totalRecorded <= 0) return 100;
  // Net sessions where attendance was expected (excluding excused)
  const eligible = totalRecorded - excused;
  if (eligible <= 0) return 100; // Excused for all
  const attended = present + late;
  return Math.min(100, Math.max(0, Math.round((attended / eligible) * 100)));
}

// -------------------------------------------------------------
// 1. GET ALL ATTENDANCE SESSIONS
// -------------------------------------------------------------
attendanceRouter.get('/sessions', requireAuth, (req: AuthRequest, res: Response) => {
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
});

// -------------------------------------------------------------
// 2. GET SINGLE ATTENDANCE SESSION WITH MEMBERS
// -------------------------------------------------------------
attendanceRouter.get('/sessions/:id', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
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
        SELECT * FROM attendance_records
        WHERE session_id = ? AND user_id = ?
      `).get(id, req.user!.id) as any;

      return res.json({
        session,
        my_record: myRecord || null,
      });
    }

    // Admin view: include all choir members and their marked status
    const choirMembers = db.prepare(`
      SELECT 
        u.id as user_id,
        u.name,
        u.email,
        u.phone,
        u.choir_voice,
        u.choir_role,
        u.avatar_url,
        r.id as record_id,
        r.status,
        r.notes,
        r.marked_by,
        r.updated_at as record_updated_at
      FROM users u
      LEFT JOIN attendance_records r ON u.id = r.user_id AND r.session_id = ?
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
    `).all(id) as any[];

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
});

// -------------------------------------------------------------
// 3. CREATE ATTENDANCE SESSION (ADMIN ONLY)
// -------------------------------------------------------------
attendanceRouter.post('/sessions', requireAdmin, (req: AuthRequest, res: Response) => {
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
      records, // Optional array of { user_id, status, notes }
    } = req.body;

    if (!title || !session_date) {
      return res.status(400).json({
        error: 'Umutwe w\'igikorwa n\'itariki birakenewe (Title and session date required)',
      });
    }

    const sessionId = 'att_sess_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const finalActivityType = ACTIVITY_TYPES.includes(activity_type) ? activity_type : 'rehearsal';

    db.prepare(`
      INSERT INTO attendance_sessions (
        id, title, activity_type, session_date, start_time, end_time, location, event_id, notes, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      sessionId,
      title.trim(),
      finalActivityType,
      session_date.trim(),
      start_time || '15:00',
      end_time || '18:00',
      location || 'ADEPR Nyanza',
      event_id || null,
      notes ? notes.trim() : null,
      req.user!.id
    );

    // If initial attendance records were provided, bulk insert them safely
    let insertedRecordsCount = 0;
    if (Array.isArray(records) && records.length > 0) {
      const insertRecordStmt = db.prepare(`
        INSERT INTO attendance_records (id, session_id, user_id, status, notes, marked_by)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(session_id, user_id) DO UPDATE SET
          status = excluded.status,
          notes = excluded.notes,
          marked_by = excluded.marked_by,
          updated_at = CURRENT_TIMESTAMP
      `);

      for (const rec of records) {
        if (!rec.user_id || !ATTENDANCE_STATUSES.includes(rec.status)) continue;
        const recId = 'att_rec_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
        insertRecordStmt.run(
          recId,
          sessionId,
          rec.user_id,
          rec.status,
          rec.notes || null,
          req.user!.id
        );
        insertedRecordsCount++;
      }
    }

    logActivity(
      req.user!.id,
      req.user!.name,
      req.user!.role,
      'CREATE_ATTENDANCE_SESSION',
      'attendance_sessions',
      sessionId,
      `Created attendance session "${title}" for ${session_date} (${insertedRecordsCount} members marked)`
    );

    broadcastRealtimeEvent('attendance_updated', {
      sessionId,
      action: 'created',
      date: session_date,
    });

    res.status(201).json({
      message: 'Ubwitabire bwashyizweho neza (Attendance session created)',
      id: sessionId,
      records_marked: insertedRecordsCount,
    });
  } catch (err: any) {
    console.error('Error creating attendance session:', err);
    res.status(500).json({ error: 'Habaye ikibazo mu kubika ubwitabire: ' + err.message });
  }
});

// -------------------------------------------------------------
// 4. UPDATE ATTENDANCE SESSION DETAILS (ADMIN ONLY)
// -------------------------------------------------------------
attendanceRouter.put('/sessions/:id', requireAdmin, (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
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
      title.trim(),
      finalActivityType,
      session_date.trim(),
      start_time || '15:00',
      end_time || '18:00',
      location || 'ADEPR Nyanza',
      event_id || null,
      notes ? notes.trim() : null,
      id
    );

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
});

// -------------------------------------------------------------
// 5. DELETE ATTENDANCE SESSION (ADMIN ONLY)
// -------------------------------------------------------------
attendanceRouter.delete('/sessions/:id', requireAdmin, (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const existing = db.prepare('SELECT title FROM attendance_sessions WHERE id = ?').get(id) as any;
    if (!existing) {
      return res.status(404).json({ error: 'Ubwitabire ntibubonetse' });
    }

    db.prepare('UPDATE attendance_sessions SET is_deleted = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(id);

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
// 6. RECORD / UPDATE MEMBER ATTENDANCE FOR A SESSION (ADMIN ONLY)
// -------------------------------------------------------------
attendanceRouter.post('/sessions/:id/records', requireAdmin, (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const session = db.prepare('SELECT id, title FROM attendance_sessions WHERE id = ? AND is_deleted = 0').get(id) as any;
    if (!session) {
      return res.status(404).json({ error: 'Ubwitabire ntibubonetse' });
    }

    const { records, user_id, status, notes } = req.body;

    const upsertStmt = db.prepare(`
      INSERT INTO attendance_records (id, session_id, user_id, status, notes, marked_by)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(session_id, user_id) DO UPDATE SET
        status = excluded.status,
        notes = excluded.notes,
        marked_by = excluded.marked_by,
        updated_at = CURRENT_TIMESTAMP
    `);

    let savedCount = 0;

    if (Array.isArray(records)) {
      for (const r of records) {
        if (!r.user_id || !ATTENDANCE_STATUSES.includes(r.status)) continue;
        const recordId = 'att_rec_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
        upsertStmt.run(recordId, id, r.user_id, r.status, r.notes || null, req.user!.id);
        savedCount++;
      }
    } else if (user_id && ATTENDANCE_STATUSES.includes(status)) {
      const recordId = 'att_rec_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
      upsertStmt.run(recordId, id, user_id, status, notes || null, req.user!.id);
      savedCount = 1;
    } else {
      return res.status(400).json({ error: 'Amakuru y\'ubwitabire si yo (Invalid records payload)' });
    }

    logActivity(
      req.user!.id,
      req.user!.name,
      req.user!.role,
      'MARK_ATTENDANCE',
      'attendance_records',
      id,
      `Marked attendance for ${savedCount} members in session "${session.title}"`
    );

    broadcastRealtimeEvent('attendance_updated', {
      sessionId: id,
      action: 'records_updated',
      count: savedCount,
    });

    res.json({
      success: true,
      message: `Ubwitabire bw'abaririmbyi ${savedCount} bwabitswe neza`,
      saved_count: savedCount,
    });
  } catch (err: any) {
    console.error('Error recording attendance:', err);
    res.status(500).json({ error: 'Habaye ikibazo mu kubika ubwitabire: ' + err.message });
  }
});

// -------------------------------------------------------------
// 7. GET OVERALL ATTENDANCE SUMMARY & LEADERBOARD (ADMIN ONLY)
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
        COUNT(r.id) as sessions_recorded,
        SUM(CASE WHEN r.status = 'present' THEN 1 ELSE 0 END) as present_count,
        SUM(CASE WHEN r.status = 'late' THEN 1 ELSE 0 END) as late_count,
        SUM(CASE WHEN r.status = 'excused' THEN 1 ELSE 0 END) as excused_count,
        SUM(CASE WHEN r.status = 'absent' THEN 1 ELSE 0 END) as absent_count
      FROM users u
      LEFT JOIN attendance_records r ON u.id = r.user_id
      LEFT JOIN attendance_sessions s ON r.session_id = s.id AND ${sessionFilter}
      WHERE u.role IN ('choir_member', 'member', 'admin', 'super_admin', 'content_admin', 'moderator')
        AND (u.is_disabled = 0 OR u.is_disabled IS NULL)
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
      return {
        ...m,
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
      GROUP BY COALESCE(u.choir_voice, 'Other')
      ORDER BY member_count DESC
    `).all(...params) as any[];

    const voiceStats = voiceBreakdown.map(v => ({
      ...v,
      rate: calculateAttendancePercentage(v.present_count, v.late_count, v.total_recorded, v.excused_count),
    }));

    // Overall choir attendance rate
    const globalTotals = memberSummaries.reduce(
      (acc, m) => {
        acc.present += m.present_count;
        acc.late += m.late_count;
        acc.excused += m.excused_count;
        acc.absent += m.absent_count;
        acc.recorded += m.sessions_recorded;
        return acc;
      },
      { present: 0, late: 0, excused: 0, absent: 0, recorded: 0 }
    );

    const overallRate = calculateAttendancePercentage(
      globalTotals.present,
      globalTotals.late,
      globalTotals.recorded,
      globalTotals.excused
    );

    res.json({
      total_sessions: totalSessions,
      total_members: memberSummaries.length,
      overall_rate: overallRate,
      totals: globalTotals,
      members: memberSummaries,
      voice_breakdown: voiceStats,
    });
  } catch (err: any) {
    console.error('Error calculating attendance summary:', err);
    res.status(500).json({ error: 'Habaye ikibazo mu kubara imibare y\'ubwitabire' });
  }
});

// -------------------------------------------------------------
// 8. GET AUTHENTICATED MEMBER'S OWN ATTENDANCE HISTORY
// -------------------------------------------------------------
attendanceRouter.get('/my-history', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

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
        r.created_at as marked_at
      FROM attendance_records r
      JOIN attendance_sessions s ON r.session_id = s.id
      LEFT JOIN events e ON s.event_id = e.id
      WHERE r.user_id = ? AND s.is_deleted = 0
      ORDER BY s.session_date DESC, s.created_at DESC
    `).all(userId) as any[];

    const present = history.filter(h => h.status === 'present').length;
    const late = history.filter(h => h.status === 'late').length;
    const excused = history.filter(h => h.status === 'excused').length;
    const absent = history.filter(h => h.status === 'absent').length;
    const totalRecorded = history.length;

    const percentage = calculateAttendancePercentage(present, late, totalRecorded, excused);

    res.json({
      summary: {
        total_recorded: totalRecorded,
        present,
        late,
        excused,
        absent,
        percentage,
      },
      history,
    });
  } catch (err: any) {
    console.error('Error fetching member attendance history:', err);
    res.status(500).json({ error: 'Habaye ikibazo mu gushaka amateka yawe y\'ubwitabire' });
  }
});

// -------------------------------------------------------------
// 9. EXPORT ATTENDANCE TO CSV (ADMIN ONLY)
// -------------------------------------------------------------
attendanceRouter.get('/export/csv', requireAdmin, (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate, sessionId } = req.query;

    let query = `
      SELECT 
        s.session_date,
        s.title as session_title,
        s.activity_type,
        s.location,
        u.name as member_name,
        u.email as member_email,
        u.phone as member_phone,
        COALESCE(u.choir_voice, 'Unassigned') as choir_voice,
        COALESCE(u.choir_role, 'Member') as choir_role,
        r.status,
        r.notes,
        r.created_at as marked_at
      FROM attendance_records r
      JOIN attendance_sessions s ON r.session_id = s.id
      JOIN users u ON r.user_id = u.id
      WHERE s.is_deleted = 0
    `;
    const params: any[] = [];

    if (sessionId) {
      query += ' AND s.id = ?';
      params.push(String(sessionId));
    }
    if (startDate) {
      query += ' AND s.session_date >= ?';
      params.push(String(startDate));
    }
    if (endDate) {
      query += ' AND s.session_date <= ?';
      params.push(String(endDate));
    }

    query += ' ORDER BY s.session_date DESC, u.name ASC';

    const records = db.prepare(query).all(...params) as any[];

    const headers = [
      'Itariki / Date',
      'Igikorwa / Session',
      'Ubwoko / Activity Type',
      'Ahantu / Location',
      'Amazina y\'Umuririmbyi / Member Name',
      'Imeli / Email',
      'Telefoni / Phone',
      'Ijwi / Voice Section',
      'Inshingano / Role',
      'Ubwitabire / Status',
      'Ibisobanuro / Notes',
      'Igihe Byandikiwe / Marked At',
    ];

    const rows = records.map(r => [
      sanitizeCsvField(r.session_date),
      sanitizeCsvField(r.session_title),
      sanitizeCsvField(r.activity_type),
      sanitizeCsvField(r.location),
      sanitizeCsvField(r.member_name),
      sanitizeCsvField(r.member_email),
      sanitizeCsvField(r.member_phone, true),
      sanitizeCsvField(r.choir_voice),
      sanitizeCsvField(r.choir_role),
      sanitizeCsvField(r.status.toUpperCase()),
      sanitizeCsvField(r.notes || ''),
      sanitizeCsvField(r.marked_at || ''),
    ]);

    const csvContent = buildCsvPayload(headers, rows);
    const filename = `la_lumiere_attendance_${getDateSuffix()}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csvContent);
  } catch (err: any) {
    console.error('Error exporting attendance CSV:', err);
    res.status(500).json({ error: 'Habaye ikibazo mu gusohora raporo ya CSV' });
  }
});
