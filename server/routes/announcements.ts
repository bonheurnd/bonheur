import { Router, Response } from 'express';
import { db, logActivity } from '../db.js';
import { requireAdmin, optionalAuth, AuthRequest, isUserAdmin } from '../auth.js';
import { broadcastRealtimeEvent } from '../realtime.js';

export const announcementsRouter = Router();

export const ANNOUNCEMENT_CATEGORIES = ['general', 'rehearsal', 'event', 'urgent', 'worship'] as const;
export const ANNOUNCEMENT_VISIBILITIES = ['public', 'members_only', 'admin_only'] as const;
export const ANNOUNCEMENT_STATUSES = ['published', 'draft', 'archived'] as const;
export const ANNOUNCEMENT_PRIORITIES = ['normal', 'important', 'urgent'] as const;

// -------------------------------------------------------------
// 1. PUBLIC & MEMBER ANNOUNCEMENTS FEED
// -------------------------------------------------------------
announcementsRouter.get('/', optionalAuth, (req: AuthRequest, res: Response) => {
  try {
    const { category, search } = req.query;
    const userRole = req.user?.role;
    const isAdmin = isUserAdmin(userRole);
    const isMember = userRole === 'choir_member' || userRole === 'member' || isAdmin;

    let query = `
      SELECT 
        a.id,
        a.title,
        a.content,
        a.category,
        a.image_url,
        a.status,
        a.visibility,
        a.is_pinned,
        a.priority,
        COALESCE(a.publish_date, a.created_at) as publish_date,
        a.expires_at,
        a.created_at,
        a.updated_at,
        u.name as author_name
      FROM announcements a
      LEFT JOIN users u ON a.created_by = u.id
      WHERE (a.is_deleted = 0 OR a.is_deleted IS NULL)
    `;
    const params: any[] = [];

    if (!isAdmin) {
      // Non-admins can only see published and non-expired announcements whose publish date has arrived
      query += `
        AND a.status = 'published'
        AND (a.publish_date IS NULL OR a.publish_date <= datetime('now'))
        AND (a.expires_at IS NULL OR a.expires_at >= datetime('now'))
      `;

      if (isMember) {
        // Members see public and members_only announcements
        query += " AND a.visibility IN ('public', 'members_only')";
      } else {
        // Public visitors see ONLY public announcements
        query += " AND (a.visibility = 'public' OR a.visibility IS NULL)";
      }
    }

    if (category && category !== 'all') {
      query += ' AND a.category = ?';
      params.push(String(category));
    }

    if (search) {
      query += ' AND (a.title LIKE ? OR a.content LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    // Sort pinned first, then newest
    query += `
      ORDER BY 
        COALESCE(a.is_pinned, 0) DESC,
        COALESCE(a.publish_date, a.created_at) DESC
    `;

    const announcements = db.prepare(query).all(...params) as any[];
    res.json(announcements);
  } catch (err: any) {
    console.error('Error fetching announcements:', err);
    res.status(500).json({ error: 'Habaye ikibazo mu gushaka amatangazo' });
  }
});

// -------------------------------------------------------------
// 2. GET SINGLE ANNOUNCEMENT (WITH ACCESS CHECK)
// -------------------------------------------------------------
announcementsRouter.get('/:id', optionalAuth, (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const announcement = db.prepare(`
      SELECT 
        a.*,
        u.name as author_name
      FROM announcements a
      LEFT JOIN users u ON a.created_by = u.id
      WHERE a.id = ? AND (a.is_deleted = 0 OR a.is_deleted IS NULL)
    `).get(id) as any;

    if (!announcement) {
      return res.status(404).json({ error: 'Itangazo ntiribonetse' });
    }

    const userRole = req.user?.role;
    const isAdmin = isUserAdmin(userRole);
    const isMember = userRole === 'choir_member' || userRole === 'member' || isAdmin;

    if (!isAdmin) {
      if (announcement.status !== 'published') {
        return res.status(403).json({ error: 'Iri tangazo ntabwo rirasohoka' });
      }
      if (announcement.visibility === 'admin_only') {
        return res.status(403).json({ error: 'Ntabwo wemerewe kubona iri tangazo' });
      }
      if (announcement.visibility === 'members_only' && !isMember) {
        return res.status(403).json({ error: 'Iri tangazo rigenewe gusa abaririmbyi ba korali' });
      }
    }

    res.json(announcement);
  } catch (err: any) {
    console.error('Error fetching announcement detail:', err);
    res.status(500).json({ error: 'Habaye ikibazo mu gushaka itangazo' });
  }
});

// -------------------------------------------------------------
// 3. ADMIN LIST (ALL STATUSES: PUBLISHED, DRAFTS, ARCHIVED)
// -------------------------------------------------------------
announcementsRouter.get('/admin/all', requireAdmin, (req: AuthRequest, res: Response) => {
  try {
    const { status, category, visibility } = req.query;

    let query = `
      SELECT 
        a.*,
        u.name as author_name
      FROM announcements a
      LEFT JOIN users u ON a.created_by = u.id
      WHERE (a.is_deleted = 0 OR a.is_deleted IS NULL)
    `;
    const params: any[] = [];

    if (status && status !== 'all') {
      query += ' AND a.status = ?';
      params.push(String(status));
    }
    if (category && category !== 'all') {
      query += ' AND a.category = ?';
      params.push(String(category));
    }
    if (visibility && visibility !== 'all') {
      query += ' AND a.visibility = ?';
      params.push(String(visibility));
    }

    query += ' ORDER BY COALESCE(a.is_pinned, 0) DESC, a.created_at DESC';

    const announcements = db.prepare(query).all(...params) as any[];
    res.json(announcements);
  } catch (err: any) {
    console.error('Error fetching admin announcements:', err);
    res.status(500).json({ error: 'Failed to fetch admin announcements' });
  }
});

// -------------------------------------------------------------
// 4. CREATE ANNOUNCEMENT (ADMIN ONLY)
// -------------------------------------------------------------
announcementsRouter.post('/', requireAdmin, (req: AuthRequest, res: Response) => {
  try {
    const {
      title,
      content,
      category,
      image_url,
      status, // 'published', 'draft', 'archived'
      visibility, // 'public', 'members_only', 'admin_only'
      is_pinned,
      priority, // 'normal', 'important', 'urgent'
      publish_date,
      expires_at,
    } = req.body;

    if (!title || !content) {
      return res.status(400).json({
        error: 'Umutwe n\'ubutumwa birakenewe (Title and content required)',
      });
    }

    const id = 'ann_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const finalStatus = ANNOUNCEMENT_STATUSES.includes(status) ? status : 'published';
    const finalVisibility = ANNOUNCEMENT_VISIBILITIES.includes(visibility) ? visibility : 'public';
    const finalCategory = ANNOUNCEMENT_CATEGORIES.includes(category) ? category : 'general';
    const finalPriority = ANNOUNCEMENT_PRIORITIES.includes(priority) ? priority : 'normal';
    const isPinned = Boolean(is_pinned) ? 1 : 0;
    const isActive = finalStatus === 'published' ? 1 : 0;

    db.prepare(`
      INSERT INTO announcements (
        id, title, content, category, image_url, status, visibility, is_pinned, priority,
        publish_date, expires_at, is_active, is_deleted, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
    `).run(
      id,
      title.trim(),
      content.trim(),
      finalCategory,
      image_url || null,
      finalStatus,
      finalVisibility,
      isPinned,
      finalPriority,
      publish_date || new Date().toISOString(),
      expires_at || null,
      isActive,
      req.user!.id
    );

    logActivity(
      req.user!.id,
      req.user!.name,
      req.user!.role,
      'CREATE_ANNOUNCEMENT',
      'announcements',
      id,
      `Created announcement "${title}" (${finalStatus}, ${finalVisibility})`
    );

    broadcastRealtimeEvent('announcements_updated', {
      id,
      action: 'created',
      status: finalStatus,
    });

    res.status(201).json({
      message: 'Itangazo ryashyizwemo neza (Announcement created)',
      id,
    });
  } catch (err: any) {
    console.error('Error creating announcement:', err);
    res.status(500).json({ error: 'Habaye ikibazo mu gushyiraho itangazo: ' + err.message });
  }
});

// -------------------------------------------------------------
// 5. UPDATE ANNOUNCEMENT (ADMIN ONLY)
// -------------------------------------------------------------
announcementsRouter.put('/:id', requireAdmin, (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const {
      title,
      content,
      category,
      image_url,
      status,
      visibility,
      is_pinned,
      priority,
      publish_date,
      expires_at,
    } = req.body;

    const existing = db.prepare('SELECT id, title FROM announcements WHERE id = ?').get(id) as any;
    if (!existing) {
      return res.status(404).json({ error: 'Itangazo ntiribonetse' });
    }

    const finalStatus = ANNOUNCEMENT_STATUSES.includes(status) ? status : 'published';
    const finalVisibility = ANNOUNCEMENT_VISIBILITIES.includes(visibility) ? visibility : 'public';
    const finalCategory = ANNOUNCEMENT_CATEGORIES.includes(category) ? category : 'general';
    const finalPriority = ANNOUNCEMENT_PRIORITIES.includes(priority) ? priority : 'normal';
    const isPinned = Boolean(is_pinned) ? 1 : 0;
    const isActive = finalStatus === 'published' ? 1 : 0;

    db.prepare(`
      UPDATE announcements
      SET title = ?,
          content = ?,
          category = ?,
          image_url = ?,
          status = ?,
          visibility = ?,
          is_pinned = ?,
          priority = ?,
          publish_date = ?,
          expires_at = ?,
          is_active = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      title.trim(),
      content.trim(),
      finalCategory,
      image_url || null,
      finalStatus,
      finalVisibility,
      isPinned,
      finalPriority,
      publish_date || null,
      expires_at || null,
      isActive,
      id
    );

    logActivity(
      req.user!.id,
      req.user!.name,
      req.user!.role,
      'UPDATE_ANNOUNCEMENT',
      'announcements',
      id,
      `Updated announcement "${title}"`
    );

    broadcastRealtimeEvent('announcements_updated', {
      id,
      action: 'updated',
      status: finalStatus,
    });

    res.json({ message: 'Itangazo ryavuguruwe neza (Announcement updated)' });
  } catch (err: any) {
    console.error('Error updating announcement:', err);
    res.status(500).json({ error: 'Habaye ikibazo mu kuvugurura itangazo' });
  }
});

// -------------------------------------------------------------
// 6. TOGGLE PINNED STATUS (ADMIN ONLY)
// -------------------------------------------------------------
announcementsRouter.patch('/:id/pin', requireAdmin, (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { is_pinned } = req.body;
    const pinValue = is_pinned ? 1 : 0;

    db.prepare('UPDATE announcements SET is_pinned = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(pinValue, id);

    broadcastRealtimeEvent('announcements_updated', { id, action: 'pinned_changed' });

    res.json({ success: true, is_pinned: pinValue });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update pin status' });
  }
});

// -------------------------------------------------------------
// 7. ARCHIVE ANNOUNCEMENT (ADMIN ONLY)
// -------------------------------------------------------------
announcementsRouter.patch('/:id/archive', requireAdmin, (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    db.prepare(`
      UPDATE announcements 
      SET status = 'archived', is_active = 0, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).run(id);

    logActivity(req.user!.id, req.user!.name, req.user!.role, 'ARCHIVE_ANNOUNCEMENT', 'announcements', id, `Archived announcement ${id}`);

    broadcastRealtimeEvent('announcements_updated', { id, action: 'archived' });

    res.json({ message: 'Itangazo ryabitswe mu bubiko (Announcement archived)' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to archive announcement' });
  }
});

// -------------------------------------------------------------
// 8. SOFT-DELETE ANNOUNCEMENT (ADMIN ONLY)
// -------------------------------------------------------------
announcementsRouter.delete('/:id', requireAdmin, (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    db.prepare('UPDATE announcements SET is_deleted = 1, is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(id);

    logActivity(req.user!.id, req.user!.name, req.user!.role, 'DELETE_ANNOUNCEMENT', 'announcements', id, `Soft-deleted announcement ${id}`);

    broadcastRealtimeEvent('announcements_updated', { id, action: 'deleted' });

    res.json({ message: 'Itangazo ryasibwe neza' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete announcement' });
  }
});

// -------------------------------------------------------------
// 9. UPDATE STATUS (ADMIN ONLY)
// -------------------------------------------------------------
announcementsRouter.patch('/:id/status', requireAdmin, (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const finalStatus = ANNOUNCEMENT_STATUSES.includes(status) ? status : 'published';
    const isActive = finalStatus === 'published' ? 1 : 0;

    db.prepare('UPDATE announcements SET status = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(finalStatus, isActive, id);

    logActivity(req.user!.id, req.user!.name, req.user!.role, 'STATUS_CHANGE', 'announcements', id, `Changed announcement status to ${finalStatus}`);

    broadcastRealtimeEvent('announcements_updated', { id, action: 'status_changed', status: finalStatus });

    res.json({ message: `Imimerere y'itangazo yahinduwe kuri ${finalStatus}`, status: finalStatus });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update status' });
  }
});

