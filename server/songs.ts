import express, { Request, Response, Router } from 'express';
import bcrypt from 'bcryptjs';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
// @ts-ignore
import mammoth from 'mammoth';
import { db, logActivity } from './db.js';
import { requireAdmin, optionalAuth, isUserAdmin, AuthRequest } from './auth.js';

export const songsRouter: Router = express.Router();

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), 'public', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const sanitizedBase = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 40);
    cb(null, `${sanitizedBase}-${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB max
});

/**
 * Normalizes input to one of the four approved categories:
 * 1. AGAKIZA (cat_agakiza)
 * 2. IJURU (cat_ijuru)
 * 3. GUSHIMA (cat_gushima)
 * 4. KWIZERA (cat_kwizera)
 */
export function resolveCategoryId(input?: string | null): string {
  if (!input) return 'cat_agakiza';
  const clean = input.trim().toLowerCase();
  if (clean.includes('agakiza') || clean === '1' || clean === 'cat_agakiza') return 'cat_agakiza';
  if (clean.includes('ijuru') || clean === '2' || clean === 'cat_ijuru') return 'cat_ijuru';
  if (clean.includes('gushima') || clean === '3' || clean === 'cat_gushima') return 'cat_gushima';
  if (clean.includes('kwizera') || clean === '4' || clean === 'cat_kwizera') return 'cat_kwizera';
  return 'cat_agakiza';
}

/**
 * Extracts songs from document raw text and structures them under the 4 categories
 */
export function parseSongsFromDocumentText(text: string): Array<{
  song_number: string;
  title: string;
  lyrics: string;
  category: string;
}> {
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  const categoryHeaders = [
    { cat: 'AGAKIZA', regex: /(?:^|\n)\s*(?:Category\s*\d*[\.:\-]?\s*)?AGAKIZA[^\n]*/gi },
    { cat: 'IJURU', regex: /(?:^|\n)\s*(?:Category\s*\d*[\.:\-]?\s*)?IJURU[^\n]*/gi },
    { cat: 'GUSHIMA', regex: /(?:^|\n)\s*(?:Category\s*\d*[\.:\-]?\s*)?GUSHIMA[^\n]*/gi },
    { cat: 'KWIZERA', regex: /(?:^|\n)\s*(?:Category\s*\d*[\.:\-]?\s*)?KWIZERA[^\n]*/gi },
  ];

  const foundMarkers: Array<{ category: string; index: number; headerLength: number }> = [];
  for (const c of categoryHeaders) {
    let m: RegExpExecArray | null;
    while ((m = c.regex.exec(normalized)) !== null) {
      foundMarkers.push({
        category: c.cat,
        index: m.index,
        headerLength: m[0].length,
      });
    }
  }

  foundMarkers.sort((a, b) => a.index - b.index);

  const songs: Array<{ song_number: string; title: string; lyrics: string; category: string }> = [];

  const isLikelySongTitle = (raw: string): boolean => {
    const lettersOnly = raw.replace(/[^a-zA-Z]/g, '');
    if (lettersOnly.length < 2) return false;
    const uppercaseLetters = raw.replace(/[^A-Z]/g, '');
    const ratio = uppercaseLetters.length / lettersOnly.length;
    return ratio >= 0.65;
  };

  const extractFromSection = (sectionText: string, category: string) => {
    const songHeaderRegex = /(?:^|\n)\s*(\d+)[\.\)]\s*([^\n\r]+)/g;
    const matches: Array<{ number: string; title: string; index: number; headerLength: number }> = [];
    let m: RegExpExecArray | null;
    while ((m = songHeaderRegex.exec(sectionText)) !== null) {
      const rawTitle = m[2].trim();
      if (isLikelySongTitle(rawTitle)) {
        matches.push({
          number: m[1],
          title: rawTitle,
          index: m.index,
          headerLength: m[0].length,
        });
      }
    }

    for (let i = 0; i < matches.length; i++) {
      const cur = matches[i];
      const nextStart = i < matches.length - 1 ? matches[i + 1].index : sectionText.length;
      let lyrics = sectionText.substring(cur.index + cur.headerLength, nextStart).trim();
      lyrics = lyrics.replace(/March 8, 2016\s*\[.*?Aimable HA/gi, '').trim();
      songs.push({
        song_number: cur.number,
        title: cur.title,
        lyrics,
        category,
      });
    }
  };

  if (foundMarkers.length > 0) {
    for (let i = 0; i < foundMarkers.length; i++) {
      const cur = foundMarkers[i];
      const nextStart = i < foundMarkers.length - 1 ? foundMarkers[i + 1].index : normalized.length;
      const sectionText = normalized.substring(cur.index + cur.headerLength, nextStart).trim();
      extractFromSection(sectionText, cur.category);
    }
  } else {
    extractFromSection(normalized, 'AGAKIZA');
  }

  return songs;
}

// -------------------------------------------------------------
// 1. GET ALL SONGS (Public & Admin with Filtering and Search)
// -------------------------------------------------------------
songsRouter.get('/', optionalAuth, (req: AuthRequest, res: Response) => {
  try {
    const { search, category, status, sort, include_deleted } = req.query;
    const isAdmin = isUserAdmin(req.user?.role);

    let query = `
      SELECT s.id, s.title, s.song_number, s.composer, s.category_id, s.release_status,
             s.release_date, s.description, s.cover_image_url, s.views_count, s.display_order,
             s.status, s.is_deleted, s.created_at, s.updated_at,
             sc.name as category_name, sc.slug as category_slug,
             (SELECT COUNT(*) FROM audio_tracks at WHERE at.song_id = s.id AND (at.is_deleted = 0 OR at.is_deleted IS NULL)) as audio_count,
             (SELECT COUNT(*) FROM comments c WHERE c.song_id = s.id AND (c.is_deleted = 0 OR c.is_deleted IS NULL)) as comments_count
      FROM songs s
      LEFT JOIN song_categories sc ON s.category_id = sc.id
      WHERE 1=1
    `;
    const params: any[] = [];

    // Deleted filter: normal users NEVER see deleted songs. Admins see them only if requested.
    if (isAdmin && include_deleted === 'true') {
      // show all including deleted
    } else {
      query += ` AND (s.is_deleted = 0 OR s.is_deleted IS NULL)`;
    }

    // Published status: normal users ONLY see published songs
    if (!isAdmin) {
      query += ` AND (s.status = 'published' OR s.status IS NULL)`;
    } else if (status && status !== 'all') {
      query += ` AND s.status = ?`;
      params.push(status);
    }

    // Category filter
    if (category && category !== 'all') {
      query += ` AND (s.category_id = ? OR sc.slug = ? OR sc.name = ?)`;
      params.push(category, category, category);
    }

    // Full search across Song Number, Title, Composer, and Lyrics
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

    // Sort order
    if (sort === 'popular') {
      query += ` ORDER BY s.views_count DESC, sc.display_order ASC, CAST(s.song_number AS INTEGER) ASC`;
    } else if (sort === 'number') {
      query += ` ORDER BY CAST(s.song_number AS INTEGER) ASC, s.song_number ASC`;
    } else if (sort === 'oldest') {
      query += ` ORDER BY s.created_at ASC`;
    } else if (sort === 'newest') {
      query += ` ORDER BY s.created_at DESC`;
    } else {
      // Default: Book Order (Category Display Order, then Song Number, then ID)
      query += ` ORDER BY sc.display_order ASC, CAST(s.song_number AS INTEGER) ASC, s.display_order ASC, s.id ASC`;
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
      is_unreleased: s.release_status === 'unreleased',
    }));

    res.json(result);
  } catch (err: any) {
    console.error('Failed to query songs:', err);
    res.status(500).json({ error: 'Habaye ikosa mu gushaka indirimbo (Failed to query songs)' });
  }
});

// -------------------------------------------------------------
// 2. GET CATEGORIES WITH LIVE SONG COUNTS
// -------------------------------------------------------------
songsRouter.get('/categories', (req: Request, res: Response) => {
  try {
    const categories = db.prepare(`
      SELECT sc.*, COUNT(s.id) as song_count
      FROM song_categories sc
      LEFT JOIN songs s ON sc.id = s.category_id AND (s.is_deleted = 0 OR s.is_deleted IS NULL) AND (s.status = 'published' OR s.status IS NULL)
      GROUP BY sc.id
      ORDER BY sc.display_order ASC
    `).all();
    res.json(categories);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// -------------------------------------------------------------
// 3. GET ADMIN DASHBOARD SONG STATS (Requirement 15)
// -------------------------------------------------------------
songsRouter.get('/admin/stats', requireAdmin, (req: AuthRequest, res: Response) => {
  try {
    const totalSongs = db.prepare('SELECT COUNT(*) as count FROM songs WHERE (is_deleted = 0 OR is_deleted IS NULL)').get() as any;
    const publishedSongs = db.prepare("SELECT COUNT(*) as count FROM songs WHERE (is_deleted = 0 OR is_deleted IS NULL) AND (status = 'published' OR status IS NULL)").get() as any;
    const unpublishedSongs = db.prepare("SELECT COUNT(*) as count FROM songs WHERE (is_deleted = 0 OR is_deleted IS NULL) AND status = 'draft'").get() as any;
    const deletedSongs = db.prepare('SELECT COUNT(*) as count FROM songs WHERE is_deleted = 1').get() as any;

    const catAgakiza = db.prepare("SELECT COUNT(*) as count FROM songs WHERE (is_deleted = 0 OR is_deleted IS NULL) AND category_id = 'cat_agakiza'").get() as any;
    const catIjuru = db.prepare("SELECT COUNT(*) as count FROM songs WHERE (is_deleted = 0 OR is_deleted IS NULL) AND category_id = 'cat_ijuru'").get() as any;
    const catGushima = db.prepare("SELECT COUNT(*) as count FROM songs WHERE (is_deleted = 0 OR is_deleted IS NULL) AND category_id = 'cat_gushima'").get() as any;
    const catKwizera = db.prepare("SELECT COUNT(*) as count FROM songs WHERE (is_deleted = 0 OR is_deleted IS NULL) AND category_id = 'cat_kwizera'").get() as any;

    res.json({
      totalSongs: totalSongs?.count || 0,
      publishedSongs: publishedSongs?.count || 0,
      unpublishedSongs: unpublishedSongs?.count || 0,
      deletedSongs: deletedSongs?.count || 0,
      songsInAgakiza: catAgakiza?.count || 0,
      songsInIjuru: catIjuru?.count || 0,
      songsInGushima: catGushima?.count || 0,
      songsInKwizera: catKwizera?.count || 0,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch song stats' });
  }
});

// -------------------------------------------------------------
// 4. GET SINGLE SONG DETAILS WITH LYRICS (Requirement 11)
// -------------------------------------------------------------
songsRouter.get('/:id', optionalAuth, (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const song = db.prepare(`
      SELECT s.*, sc.name as category_name, sc.slug as category_slug
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
      return res.status(404).json({ error: 'Indirimbo ntibonetse cyangwa ntiyemerewe kurebwa (Song unpublished or draft)' });
    }

    // Increment view count
    db.prepare('UPDATE songs SET views_count = views_count + 1 WHERE id = ?').run(id);

    const audioTracks = db.prepare(`
      SELECT * FROM audio_tracks
      WHERE song_id = ? AND (is_deleted = 0 OR is_deleted IS NULL)
      ORDER BY created_at ASC
    `).all(id) as any[];

    const lyricsRow = db.prepare('SELECT * FROM lyrics WHERE song_id = ?').get(id) as any;

    let lyricsContent = lyricsRow?.content || '';
    let isLocked = false;

    if (song.release_status === 'unreleased') {
      let hasAccess = isAdmin;
      if (!hasAccess && req.user) {
        const grant = db.prepare('SELECT id FROM protected_content_access WHERE song_id = ? AND user_id = ?').get(id, req.user.id);
        if (grant) hasAccess = true;
      }
      if (!hasAccess) {
        isLocked = true;
        lyricsContent = '';
      }
    }

    res.json({
      ...song,
      lyrics: lyricsContent,
      solfa_notation: lyricsRow?.solfa_notation || '',
      is_locked: isLocked,
      audio_tracks: audioTracks,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch song details' });
  }
});

// -------------------------------------------------------------
// 5. POST: ADD NEW SONG (Requirement 4, Admin Only)
// -------------------------------------------------------------
songsRouter.post('/', requireAdmin, (req: AuthRequest, res: Response) => {
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
      audio_tracks,
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Umutwe w\'indirimbo urakenewe (Song title is required)' });
    }

    const songId = 'song_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const pwdHash = access_password && access_password.trim() ? bcrypt.hashSync(access_password.trim(), 10) : null;
    const finalStatus = status === 'draft' ? 'draft' : 'published';
    const finalReleaseStatus = release_status === 'unreleased' ? 'unreleased' : 'released';
    const finalCategoryId = resolveCategoryId(category_id);

    const parsedNum = parseInt(song_number, 10);
    const nextOrderRow = db.prepare('SELECT COALESCE(MAX(display_order), 0) + 1 as next_order FROM songs WHERE category_id = ?').get(finalCategoryId) as any;
    const displayOrder = !isNaN(parsedNum) ? parsedNum : (nextOrderRow?.next_order || 1);

    db.prepare(`
      INSERT INTO songs (
        id, title, song_number, composer, category_id, release_status,
        release_date, description, cover_image_url, access_password_hash,
        status, is_deleted, created_by, display_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
    `).run(
      songId,
      title.trim(),
      song_number ? String(song_number).trim() : null,
      composer?.trim() || 'La Lumiere Choir',
      finalCategoryId,
      finalReleaseStatus,
      release_date || new Date().toISOString().split('T')[0],
      description?.trim() || '',
      cover_image_url || '',
      pwdHash,
      finalStatus,
      req.user!.id,
      displayOrder
    );

    // Insert lyrics
    if ((lyrics && lyrics.trim()) || (solfa_notation && solfa_notation.trim())) {
      db.prepare(`
        INSERT INTO lyrics (id, song_id, content, solfa_notation, language)
        VALUES (?, ?, ?, ?, ?)
      `).run('lyr_' + Date.now(), songId, lyrics?.trim() || '', solfa_notation?.trim() || null, language || 'rw');
    }

    // Insert audio tracks if supplied
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

    logActivity(
      req.user!.id,
      req.user!.name,
      req.user!.role,
      'CREATE_SONG',
      'songs',
      songId,
      `Added song "${title.trim()}" (Number: ${song_number || 'N/A'}, Category: ${finalCategoryId}, Status: ${finalStatus})`
    );

    res.status(201).json({
      message: 'Indirimbo yongewemo neza (Song created successfully)',
      songId,
      song: {
        id: songId,
        title: title.trim(),
        song_number: song_number ? String(song_number).trim() : null,
        category_id: finalCategoryId,
        status: finalStatus,
      },
    });
  } catch (err: any) {
    console.error('Failed to create song:', err);
    res.status(500).json({ error: err.message || 'Habaye ikosa mu kubika indirimbo' });
  }
});

// -------------------------------------------------------------
// 6. PUT: EDIT SONG (Requirement 5, Admin Only)
// -------------------------------------------------------------
songsRouter.put('/:id', requireAdmin, (req: AuthRequest, res: Response) => {
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
      language,
    } = req.body;

    const existingSong = db.prepare('SELECT id FROM songs WHERE id = ?').get(id);
    if (!existingSong) {
      return res.status(404).json({ error: 'Indirimbo ntibonetse mu gitabo (Song not found)' });
    }

    const finalCategoryId = category_id !== undefined ? resolveCategoryId(category_id) : undefined;
    const parsedNum = parseInt(song_number, 10);
    const orderNum = !isNaN(parsedNum) ? parsedNum : 0;

    let pwdUpdateClause = '';
    const params: any[] = [
      title?.trim(),
      song_number ? String(song_number).trim() : null,
      composer?.trim() || 'La Lumiere Choir',
      finalCategoryId || null,
      release_status || 'released',
      release_date || null,
      description || '',
      cover_image_url || '',
      status || 'published',
      orderNum,
      orderNum,
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
          display_order = CASE WHEN ? > 0 THEN ? ELSE display_order END,
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

    logActivity(
      req.user!.id,
      req.user!.name,
      req.user!.role,
      'UPDATE_SONG',
      'songs',
      id,
      `Updated song "${title || id}" (Number: ${song_number || 'N/A'}, Category: ${finalCategoryId})`
    );

    res.json({
      success: true,
      message: 'Indirimbo yavuguruwe neza muri database (Song updated successfully)',
      id,
    });
  } catch (err: any) {
    console.error('Failed to update song:', err);
    res.status(500).json({ error: 'Habaye ikosa mu kuvugurura indirimbo' });
  }
});

// -------------------------------------------------------------
// 7. DELETE: SOFT-DELETE SONG (Requirement 6, Admin Only)
// -------------------------------------------------------------
songsRouter.delete('/:id', requireAdmin, (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const existing = db.prepare('SELECT id, title FROM songs WHERE id = ?').get(id) as any;
    if (!existing) {
      return res.status(404).json({ error: 'Indirimbo ntibonetse (Song not found)' });
    }

    db.prepare('UPDATE songs SET is_deleted = 1, deleted_at = CURRENT_TIMESTAMP WHERE id = ?').run(id);

    logActivity(
      req.user!.id,
      req.user!.name,
      req.user!.role,
      'DELETE_SONG',
      'songs',
      id,
      `Soft-deleted song "${existing.title}"`
    );

    res.json({
      success: true,
      message: 'Indirimbo yasibwe neza yimurirwa mu bubiko (Song archived successfully)',
      id,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to delete song' });
  }
});

// -------------------------------------------------------------
// 8. POST: RESTORE SOFT-DELETED SONG (Admin Only)
// -------------------------------------------------------------
songsRouter.post('/:id/restore', requireAdmin, (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    db.prepare('UPDATE songs SET is_deleted = 0, deleted_at = NULL WHERE id = ?').run(id);

    logActivity(req.user!.id, req.user!.name, req.user!.role, 'RESTORE_SONG', 'songs', id, `Restored song ${id}`);

    res.json({
      success: true,
      message: 'Indirimbo yagaruwe neza mu gitabo cy\'indirimbo (Song restored successfully)',
      id,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to restore song' });
  }
});

// -------------------------------------------------------------
// 9. PATCH: TOGGLE STATUS (Published vs Draft) (Requirement 7)
// -------------------------------------------------------------
songsRouter.patch('/:id/status', requireAdmin, (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'published' | 'draft'

    if (!['published', 'draft'].includes(status)) {
      return res.status(400).json({ error: 'Imimerere itemewe (Invalid status: must be published or draft)' });
    }

    db.prepare('UPDATE songs SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(status, id);

    logActivity(req.user!.id, req.user!.name, req.user!.role, 'STATUS_CHANGE', 'songs', id, `Changed song status to ${status}`);

    res.json({
      success: true,
      message: `Imimerere y'indirimbo yahinduwe kuri ${status}`,
      status,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update song status' });
  }
});

// -------------------------------------------------------------
// 10. POST: BATCH / WORD (.docx) IMPORTER (Requirement 1 & 14)
// -------------------------------------------------------------
songsRouter.post('/import', requireAdmin, upload.single('file'), async (req: AuthRequest, res: Response) => {
  try {
    let rawText = '';
    let parsedSongList: Array<{
      song_number: string;
      title: string;
      lyrics: string;
      category: string;
      status?: string;
    }> = [];

    if (req.file) {
      const ext = path.extname(req.file.originalname).toLowerCase();
      if (ext === '.docx') {
        const result = await mammoth.extractRawText({ path: req.file.path });
        rawText = result.value || '';
      } else if (ext === '.json') {
        const fileContent = fs.readFileSync(req.file.path, 'utf8');
        try {
          const jsonSongs = JSON.parse(fileContent);
          if (Array.isArray(jsonSongs)) {
            parsedSongList = jsonSongs.map((s: any) => ({
              song_number: String(s.song_number || s.number || ''),
              title: s.title || '',
              lyrics: s.lyrics || s.content || '',
              category: s.category || s.category_name || s.category_id || 'AGAKIZA',
              status: s.status || 'published',
            }));
          }
        } catch (e) {
          rawText = fileContent;
        }
      } else {
        rawText = fs.readFileSync(req.file.path, 'utf8');
      }

      try {
        fs.unlinkSync(req.file.path);
      } catch (e) {}
    } else if (req.body.text && typeof req.body.text === 'string') {
      rawText = req.body.text;
    } else if (Array.isArray(req.body.songs)) {
      parsedSongList = req.body.songs;
    } else {
      return res.status(400).json({ error: 'Nta dosiye cyangwa inyandiko yoherejwe (No file or text provided)' });
    }

    if (rawText && parsedSongList.length === 0) {
      parsedSongList = parseSongsFromDocumentText(rawText);
    }

    if (parsedSongList.length === 0) {
      return res.status(400).json({
        error: 'Nta ndirimbo zabonetse mu nyandiko (No songs found). Suzuma niba harimo ibyiciro 4 (AGAKIZA, IJURU, GUSHIMA, KWIZERA) n\'indirimbo zanditse nka: 1. UMUTWE.',
      });
    }

    const existingSongs = db.prepare(`
      SELECT s.id, LOWER(TRIM(s.title)) as norm_title, s.song_number, s.category_id
      FROM songs s
      WHERE (s.is_deleted = 0 OR s.is_deleted IS NULL)
    `).all() as any[];

    const importedSongs: any[] = [];
    const skippedSongs: any[] = [];

    for (const item of parsedSongList) {
      const cleanTitle = (item.title || '').trim();
      if (!cleanTitle) continue;

      const normTitle = cleanTitle.toLowerCase();
      const songNumber = (item.song_number || '').trim();
      const catId = resolveCategoryId(item.category);
      const cleanLyrics = (item.lyrics || '').trim();

      // Duplicate check: title and category match
      const isDuplicate = existingSongs.some(es => {
        return es.norm_title === normTitle && (es.category_id === catId || !es.category_id);
      });

      if (isDuplicate) {
        skippedSongs.push({
          title: cleanTitle,
          song_number: songNumber,
          category: catId,
          reason: 'Duplicate: indirimbo isanzwe mu gitabo',
        });
        continue;
      }

      const newSongId = 'song_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
      const parsedNum = parseInt(songNumber, 10);
      const displayOrder = !isNaN(parsedNum) ? parsedNum : (existingSongs.length + importedSongs.length + 1);

      db.prepare(`
        INSERT INTO songs (
          id, title, song_number, composer, category_id, release_status,
          release_date, description, cover_image_url, access_password_hash,
          status, is_deleted, created_by, display_order
        ) VALUES (?, ?, ?, ?, ?, 'released', ?, '', '', NULL, ?, 0, ?, ?)
      `).run(
        newSongId,
        cleanTitle,
        songNumber || null,
        'La Lumiere Choir',
        catId,
        new Date().toISOString().split('T')[0],
        item.status === 'draft' ? 'draft' : 'published',
        req.user!.id,
        displayOrder
      );

      if (cleanLyrics) {
        db.prepare(`
          INSERT INTO lyrics (id, song_id, content, language)
          VALUES (?, ?, ?, 'rw')
        `).run('lyr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7), newSongId, cleanLyrics);
      }

      importedSongs.push({
        id: newSongId,
        title: cleanTitle,
        song_number: songNumber,
        category_id: catId,
        status: item.status === 'draft' ? 'draft' : 'published',
      });

      existingSongs.push({
        id: newSongId,
        norm_title: normTitle,
        song_number: songNumber,
        category_id: catId,
      });
    }

    logActivity(
      req.user!.id,
      req.user!.name,
      req.user!.role,
      'IMPORT_SONGS',
      'songs',
      'batch_import',
      `Imported ${importedSongs.length} songs, skipped ${skippedSongs.length} duplicates`
    );

    const totalCountRow = db.prepare('SELECT COUNT(*) as count FROM songs WHERE (is_deleted = 0 OR is_deleted IS NULL)').get() as any;

    res.json({
      success: true,
      message: `Hashyizwemo indirimbo nshya ${importedSongs.length}. Hasimbutswe ${skippedSongs.length} zisanzwemo.`,
      importedCount: importedSongs.length,
      skippedCount: skippedSongs.length,
      importedSongs,
      skippedSongs,
      totalSongsInDb: totalCountRow?.count || 0,
    });
  } catch (err: any) {
    console.error('Song import error:', err);
    res.status(500).json({ error: err.message || 'Habaye ikosa mu kwinjiza indirimbo' });
  }
});
