import { Router, Response } from 'express';
import { db, logActivity } from '../db.js';
import { requireAdmin, requireAuth, AuthRequest, isUserAdmin } from '../auth.js';
import { broadcastRealtimeEvent } from '../realtime.js';
import { isEmailServiceConfigured } from '../email.js';

export const remindersRouter = Router();

export interface ReminderConfig {
  id: string;
  event_id: string;
  reminder_type: '24h' | '2h' | '1h' | 'custom';
  minutes_before: number;
  target_audience: 'all_members' | 'choir_members' | 'interested_only';
  custom_message?: string;
  channels: string[]; // ['in_app', 'email']
  is_enabled: boolean;
  status: 'scheduled' | 'sent' | 'cancelled';
}

/**
 * Standard Rwanda Timezone is CAT (UTC+2)
 */
export function parseEventDateTime(eventDate: string, startTime = '15:00'): Date {
  // If eventDate is in format YYYY-MM-DD
  const dateStr = eventDate.includes('T') ? eventDate.split('T')[0] : eventDate;
  const timeStr = startTime.includes(':') ? startTime : '15:00';
  // Assume Rwandan Time (UTC+02:00)
  return new Date(`${dateStr}T${timeStr}:00+02:00`);
}

// -------------------------------------------------------------
// 1. GET ALL REMINDERS FOR AN EVENT OR GLOBAL
// -------------------------------------------------------------
remindersRouter.get('/', requireAdmin, (req: AuthRequest, res: Response) => {
  try {
    const { event_id } = req.query;

    let query = `
      SELECT 
        r.*,
        e.title as event_title,
        e.event_date,
        e.start_time,
        e.location,
        e.category as event_category,
        (SELECT COUNT(*) FROM reminder_logs l WHERE l.reminder_id = r.id) as delivered_count
      FROM event_reminders r
      JOIN events e ON r.event_id = e.id
      WHERE (e.is_deleted = 0 OR e.is_deleted IS NULL)
    `;
    const params: any[] = [];

    if (event_id) {
      query += ' AND r.event_id = ?';
      params.push(String(event_id));
    }

    query += ' ORDER BY e.event_date ASC, r.created_at DESC';

    const reminders = db.prepare(query).all(...params) as any[];

    const formatted = reminders.map(r => ({
      ...r,
      is_enabled: Boolean(r.is_enabled),
      channels: typeof r.channels === 'string' ? JSON.parse(r.channels || '["in_app"]') : r.channels,
    }));

    res.json(formatted);
  } catch (err: any) {
    console.error('Error fetching reminders:', err);
    res.status(500).json({ error: 'Habaye ikibazo mu gushaka ubutumwa bw\'integuza' });
  }
});

// -------------------------------------------------------------
// 2. GET UPCOMING EVENT REMINDERS (FOR MEMBERS & USERS)
// -------------------------------------------------------------
remindersRouter.get('/upcoming-alerts', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const userRole = req.user?.role;
    const isChoirMember = userRole === 'choir_member' || userRole === 'member' || isUserAdmin(userRole);

    // Get upcoming events within next 7 days
    const events = db.prepare(`
      SELECT 
        e.id,
        e.title,
        e.event_date,
        e.start_time,
        e.location,
        e.category,
        e.description,
        (SELECT COUNT(*) FROM event_interested ei WHERE ei.event_id = e.id AND ei.user_id = ?) as is_interested,
        (SELECT COUNT(*) FROM event_interested ei WHERE ei.event_id = e.id) as interested_count
      FROM events e
      WHERE (e.is_deleted = 0 OR e.is_deleted IS NULL)
        AND e.event_date >= date('now')
      ORDER BY e.event_date ASC, e.start_time ASC
      LIMIT 10
    `).all(userId) as any[];

    // Match with any scheduled reminders
    const alerts = events.map(evt => {
      const eventTime = parseEventDateTime(evt.event_date, evt.start_time);
      const now = new Date();
      const diffMs = eventTime.getTime() - now.getTime();
      const diffHours = Math.round(diffMs / (1000 * 60 * 60));
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

      return {
        ...evt,
        is_interested: Boolean(evt.is_interested),
        hours_remaining: diffHours,
        days_remaining: diffDays,
        is_happening_soon: diffHours <= 48 && diffHours >= 0,
      };
    });

    res.json(alerts);
  } catch (err: any) {
    console.error('Error fetching upcoming alerts:', err);
    res.status(500).json({ error: 'Habaye ikibazo mu gushaka integuza z\'ibikorwa' });
  }
});

// -------------------------------------------------------------
// 3. CREATE REMINDER FOR AN EVENT (ADMIN ONLY)
// -------------------------------------------------------------
remindersRouter.post('/', requireAdmin, (req: AuthRequest, res: Response) => {
  try {
    const {
      event_id,
      reminder_type, // '24h', '2h', '1h', 'custom'
      minutes_before, // 1440, 120, 60
      target_audience, // 'all_members', 'choir_members', 'interested_only'
      custom_message,
      channels, // ['in_app', 'email']
      is_enabled,
    } = req.body;

    if (!event_id) {
      return res.status(400).json({ error: 'Hitamo igikorwa (Event ID is required)' });
    }

    const event = db.prepare('SELECT id, title, event_date FROM events WHERE id = ? AND (is_deleted = 0 OR is_deleted IS NULL)').get(event_id) as any;
    if (!event) {
      return res.status(404).json({ error: 'Igikorwa ntikibonetse (Event not found)' });
    }

    // Default minutes mapping
    let minutes = typeof minutes_before === 'number' ? minutes_before : 1440;
    if (reminder_type === '24h') minutes = 1440;
    else if (reminder_type === '2h') minutes = 120;
    else if (reminder_type === '1h') minutes = 60;

    // Prevent exact duplicates for same event, audience, and minutes
    const existing = db.prepare(`
      SELECT id FROM event_reminders
      WHERE event_id = ? AND minutes_before = ? AND target_audience = ? AND status != 'cancelled'
    `).get(event_id, minutes, target_audience || 'all_members');

    if (existing) {
      return res.status(409).json({
        error: 'Iyi nteguza yari isanzweho kuri iki gikorwa (A reminder with this timeframe already exists)',
      });
    }

    const id = 'rem_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const finalChannels = Array.isArray(channels) && channels.length > 0 ? channels : ['in_app'];

    db.prepare(`
      INSERT INTO event_reminders (
        id, event_id, reminder_type, minutes_before, target_audience,
        custom_message, channels, is_enabled, status, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'scheduled', ?)
    `).run(
      id,
      event_id,
      reminder_type || '24h',
      minutes,
      target_audience || 'all_members',
      custom_message ? custom_message.trim() : null,
      JSON.stringify(finalChannels),
      is_enabled !== false ? 1 : 0,
      req.user!.id
    );

    logActivity(
      req.user!.id,
      req.user!.name,
      req.user!.role,
      'CREATE_EVENT_REMINDER',
      'event_reminders',
      id,
      `Created reminder for event "${event.title}" (${minutes} min before)`
    );

    broadcastRealtimeEvent('reminders_updated', {
      id,
      eventId: event_id,
      action: 'created',
    });

    res.status(201).json({
      message: 'Integuza yateguwe neza (Reminder scheduled)',
      id,
    });
  } catch (err: any) {
    console.error('Error creating event reminder:', err);
    res.status(500).json({ error: 'Habaye ikibazo mu gutegura integuza: ' + err.message });
  }
});

// -------------------------------------------------------------
// 4. UPDATE REMINDER (ADMIN ONLY)
// -------------------------------------------------------------
remindersRouter.put('/:id', requireAdmin, (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const {
      reminder_type,
      minutes_before,
      target_audience,
      custom_message,
      channels,
      is_enabled,
      status,
    } = req.body;

    const existing = db.prepare('SELECT id, event_id FROM event_reminders WHERE id = ?').get(id) as any;
    if (!existing) {
      return res.status(404).json({ error: 'Integuza ntibonetse' });
    }

    let minutes = typeof minutes_before === 'number' ? minutes_before : 1440;
    if (reminder_type === '24h') minutes = 1440;
    else if (reminder_type === '2h') minutes = 120;
    else if (reminder_type === '1h') minutes = 60;

    const finalChannels = Array.isArray(channels) ? channels : ['in_app'];

    db.prepare(`
      UPDATE event_reminders
      SET reminder_type = ?,
          minutes_before = ?,
          target_audience = ?,
          custom_message = ?,
          channels = ?,
          is_enabled = ?,
          status = COALESCE(?, status),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      reminder_type || '24h',
      minutes,
      target_audience || 'all_members',
      custom_message ? custom_message.trim() : null,
      JSON.stringify(finalChannels),
      is_enabled !== false ? 1 : 0,
      status || null,
      id
    );

    broadcastRealtimeEvent('reminders_updated', { id, action: 'updated' });

    res.json({ message: 'Integuza yavuguruwe neza' });
  } catch (err: any) {
    console.error('Error updating reminder:', err);
    res.status(500).json({ error: 'Habaye ikibazo mu kuvugurura integuza' });
  }
});

// -------------------------------------------------------------
// 5. TRIGGER / SEND REMINDER MANUALLY OR TEST (ADMIN ONLY)
// -------------------------------------------------------------
remindersRouter.post('/:id/send-now', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const reminder = db.prepare(`
      SELECT r.*, e.title as event_title, e.event_date, e.start_time, e.location
      FROM event_reminders r
      JOIN events e ON r.event_id = e.id
      WHERE r.id = ?
    `).get(id) as any;

    if (!reminder) {
      return res.status(404).json({ error: 'Integuza ntibonetse' });
    }

    const result = await executeReminderDelivery(reminder, req.user!.name);

    res.json({
      success: true,
      message: `Integuza yoherejwe neza ku bantu ${result.deliveredCount}`,
      result,
    });
  } catch (err: any) {
    console.error('Error triggering reminder:', err);
    res.status(500).json({ error: 'Habaye ikibazo mu kohereza integuza: ' + err.message });
  }
});

// -------------------------------------------------------------
// 6. DELETE REMINDER (ADMIN ONLY)
// -------------------------------------------------------------
remindersRouter.delete('/:id', requireAdmin, (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM event_reminders WHERE id = ?').run(id);

    broadcastRealtimeEvent('reminders_updated', { id, action: 'deleted' });

    res.json({ message: 'Integuza yakuweho neza' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to delete reminder' });
  }
});

// -------------------------------------------------------------
// 7. GET REMINDER LOGS (ADMIN ONLY)
// -------------------------------------------------------------
remindersRouter.get('/logs', requireAdmin, (req: AuthRequest, res: Response) => {
  try {
    const { reminder_id } = req.query;
    let query = `
      SELECT 
        l.*,
        u.name as recipient_name,
        u.email as recipient_email,
        e.title as event_title
      FROM reminder_logs l
      LEFT JOIN users u ON l.recipient_id = u.id
      LEFT JOIN events e ON l.event_id = e.id
    `;
    const params: any[] = [];
    if (reminder_id) {
      query += ' WHERE l.reminder_id = ?';
      params.push(String(reminder_id));
    }
    query += ' ORDER BY l.sent_at DESC LIMIT 100';

    const logs = db.prepare(query).all(...params) as any[];
    res.json(logs);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch reminder logs' });
  }
});

/**
 * Dispatches a reminder to all eligible recipients safely
 */
export async function executeReminderDelivery(
  reminder: any,
  triggeredBy = 'System Scheduler'
): Promise<{ deliveredCount: number; channelsUsed: string[] }> {
  const eventId = reminder.event_id;
  const eventTitle = reminder.event_title || 'Igikorwa cya Korali';
  const eventDate = reminder.event_date || '';
  const startTime = reminder.start_time || '15:00';
  const location = reminder.location || 'ADEPR Nyanza';

  const channels: string[] = typeof reminder.channels === 'string'
    ? JSON.parse(reminder.channels || '["in_app"]')
    : (reminder.channels || ['in_app']);

  // Resolve target audience
  let recipients: { id: string; name: string; email: string; phone?: string }[] = [];

  if (reminder.target_audience === 'interested_only') {
    recipients = db.prepare(`
      SELECT u.id, u.name, u.email, u.phone
      FROM users u
      JOIN event_interested ei ON u.id = ei.user_id
      WHERE ei.event_id = ? AND (u.is_disabled = 0 OR u.is_disabled IS NULL)
    `).all(eventId) as any[];
  } else if (reminder.target_audience === 'choir_members') {
    recipients = db.prepare(`
      SELECT id, name, email, phone
      FROM users
      WHERE role IN ('choir_member', 'member', 'admin', 'super_admin', 'content_admin', 'moderator')
        AND (is_disabled = 0 OR is_disabled IS NULL)
    `).all() as any[];
  } else {
    // all members & registered users
    recipients = db.prepare(`
      SELECT id, name, email, phone
      FROM users
      WHERE (is_disabled = 0 OR is_disabled IS NULL)
    `).all() as any[];
  }

  const notificationTitle = `Integuza: ${eventTitle}`;
  const notificationBody = reminder.custom_message ||
    `Ntucikwe n'igikorwa "${eventTitle}" kuri ${eventDate} saa ${startTime} ahitwa ${location}.`;

  const insertNotifStmt = db.prepare(`
    INSERT INTO notifications (id, user_id, title, body, type, link, is_read, created_at)
    VALUES (?, ?, ?, ?, 'announcement', ?, 0, CURRENT_TIMESTAMP)
  `);

  const insertLogStmt = db.prepare(`
    INSERT INTO reminder_logs (id, reminder_id, event_id, recipient_id, channel, status, sent_at)
    VALUES (?, ?, ?, ?, ?, 'delivered', CURRENT_TIMESTAMP)
  `);

  let deliveredCount = 0;

  for (const user of recipients) {
    // 1. In-App Notification
    if (channels.includes('in_app')) {
      const notifId = 'notif_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
      insertNotifStmt.run(
        notifId,
        user.id,
        notificationTitle,
        notificationBody,
        `?event=${encodeURIComponent(eventId)}`
      );

      const logId = 'log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
      insertLogStmt.run(logId, reminder.id, eventId, user.id, 'in_app');
      deliveredCount++;
    }
  }

  // Mark reminder as sent
  db.prepare(`
    UPDATE event_reminders
    SET status = 'sent', updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(reminder.id);

  // Broadcast real-time SSE
  broadcastRealtimeEvent('event_reminder', {
    reminderId: reminder.id,
    eventId,
    title: notificationTitle,
    body: notificationBody,
    eventDate,
    location,
  });

  console.log(`[Event Reminder] Delivered reminder "${notificationTitle}" to ${deliveredCount} recipients (Triggered by: ${triggeredBy})`);

  return { deliveredCount, channelsUsed: channels };
}

/**
 * Periodic Scheduler Worker
 * Runs every 2 minutes to check upcoming events and trigger due reminders
 */
let schedulerInterval: NodeJS.Timeout | null = null;

export function startReminderScheduler(): void {
  if (schedulerInterval) return; // Prevent duplicate scheduler instances

  console.log('[Reminder Scheduler] Initializing automated choir event reminder background runner...');

  const checkDueReminders = async () => {
    try {
      // Find all scheduled & enabled reminders for events that haven't passed
      const activeReminders = db.prepare(`
        SELECT 
          r.*,
          e.title as event_title,
          e.event_date,
          e.start_time,
          e.location
        FROM event_reminders r
        JOIN events e ON r.event_id = e.id
        WHERE r.is_enabled = 1
          AND r.status = 'scheduled'
          AND (e.is_deleted = 0 OR e.is_deleted IS NULL)
          AND e.event_date >= date('now', '-1 day')
      `).all() as any[];

      const now = new Date();

      for (const rem of activeReminders) {
        const eventDate = parseEventDateTime(rem.event_date, rem.start_time);
        const minutesUntilEvent = (eventDate.getTime() - now.getTime()) / (1000 * 60);

        // If the current time is within or past the minutes_before threshold, but event hasn't happened yet
        if (minutesUntilEvent <= rem.minutes_before && minutesUntilEvent >= -30) {
          console.log(`[Reminder Scheduler] Due reminder triggered for "${rem.event_title}" (in ${Math.round(minutesUntilEvent)} mins)`);
          await executeReminderDelivery(rem, 'Automated Scheduler');
        }
      }
    } catch (err) {
      console.error('[Reminder Scheduler] Error in background check:', err);
    }
  };

  // Run initial check after 10 seconds, then every 2 minutes (120,000ms)
  setTimeout(checkDueReminders, 10000);
  schedulerInterval = setInterval(checkDueReminders, 120000);
}

export function stopReminderScheduler(): void {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
  }
}
