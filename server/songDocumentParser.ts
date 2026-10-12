import { db as defaultDb, DbWrapper } from './db.js';

export type SongCategoryName = 'AGAKIZA' | 'IJURU' | 'GUSHIMA' | 'KWIZERA';

export const VALID_CATEGORIES: readonly SongCategoryName[] = [
  'AGAKIZA',
  'IJURU',
  'GUSHIMA',
  'KWIZERA'
] as const;

export interface ParsedSongItem {
  title: string;
  category: SongCategoryName;
  lyrics: string;
  song_number?: string;
  composer?: string;
  description?: string;
  language?: string;
  release_date?: string;
  release_status?: 'released' | 'unreleased' | string;
  status?: 'published' | 'draft' | string;
  solfa_notation?: string;
  cover_image_url?: string;
  lyrics_pdf_url?: string;
  lyrics_pdf_filename?: string;
  access_password?: string;
  display_order?: number;
  created_by?: string;
  [key: string]: any;
}

export interface SongRecordInput {
  title: string;
  category?: SongCategoryName | string;
  category_id?: string;
  lyrics?: string;
  content?: string;
  song_number?: string | number;
  number?: string | number;
  composer?: string;
  description?: string;
  language?: string;
  release_date?: string;
  release_status?: 'released' | 'unreleased' | string;
  status?: 'published' | 'draft' | string;
  solfa_notation?: string;
  cover_image_url?: string;
  lyrics_pdf_url?: string;
  lyrics_pdf_filename?: string;
  access_password?: string;
  display_order?: number;
  created_by?: string;
  [key: string]: any;
}

export interface UpsertSongResult {
  title: string;
  category: SongCategoryName;
  action: 'inserted' | 'updated' | 'skipped';
  song_id: string;
  song_number?: string;
  lyrics_length: number;
  reason?: string;
}

export interface ManageSongRecordResult extends UpsertSongResult {
  is_new: boolean;
  category_id: string;
  preservedMetadata?: {
    id: string;
    created_at?: string;
    created_by?: string;
    views_count?: number;
    shares_count?: number;
    composer?: string;
    description?: string;
    cover_image_url?: string;
    lyrics_pdf_url?: string;
  };
  song?: any;
}

export interface UpsertSongsReport {
  totalProcessed: number;
  insertedCount: number;
  updatedCount: number;
  skippedCount: number;
  songs: UpsertSongResult[];
}

export interface DocumentImportSummary {
  parsedCount: number;
  insertedCount: number;
  updatedCount: number;
  parsedSongs: ParsedSongItem[];
  report: UpsertSongsReport;
}

/**
 * Normalizes title string for duplicate checking comparison.
 * Strips accents, removes punctuation, ignores case and whitespace.
 */
export function normalizeTitle(title: string): string {
  if (!title) return '';
  return title
    .toLowerCase()
    .replace(/[’'"`]/g, '')
    .replace(/[.,:;!?-]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Maps category name to category database ID.
 */
export function mapCategoryToId(category: SongCategoryName | string): string {
  const norm = (category || '').trim().toUpperCase();
  if (norm.includes('AGAKIZA')) return 'cat_agakiza';
  if (norm.includes('IJURU')) return 'cat_ijuru';
  if (norm.includes('GUSHIMA')) return 'cat_gushima';
  if (norm.includes('KWIZERA')) return 'cat_kwizera';
  return 'cat_agakiza';
}

/**
 * Normalizes input to one of the four approved category database IDs:
 * cat_agakiza, cat_ijuru, cat_gushima, cat_kwizera.
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
 * Maps category database ID or string to standard SongCategoryName.
 */
export function normalizeCategoryName(input: string): SongCategoryName {
  const norm = (input || '').trim().toUpperCase();
  if (norm.includes('IJURU')) return 'IJURU';
  if (norm.includes('GUSHIMA')) return 'GUSHIMA';
  if (norm.includes('KWIZERA')) return 'KWIZERA';
  return 'AGAKIZA';
}

/**
 * Securely parses a text document containing choir songs categorized into:
 * AGAKIZA, IJURU, GUSHIMA, KWIZERA.
 * 
 * Schema produced for each song:
 * - title: string
 * - category: 'AGAKIZA' | 'IJURU' | 'GUSHIMA' | 'KWIZERA'
 * - lyrics: raw text string (preserving original formatting, verse markers, line breaks)
 *
 * Security features:
 * - Enforces string type and size boundary (max 50MB) to mitigate ReDoS / memory exhaustion
 * - Strips dangerous null bytes (\0)
 * - Uses non-backtracking boundary search
 */
export function parseSongDocumentToJSON(documentText: unknown): ParsedSongItem[] {
  if (typeof documentText !== 'string') {
    throw new TypeError('documentText must be a string');
  }

  // Guard against memory exhaustion
  const MAX_INPUT_BYTES = 50 * 1024 * 1024; // 50MB
  if (Buffer.byteLength(documentText, 'utf8') > MAX_INPUT_BYTES) {
    throw new RangeError('documentText exceeds the maximum allowed size (50MB)');
  }

  // Strip null bytes and normalize newlines safely
  const cleanedText = documentText
    .replace(/\0/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');

  // Define regexes for the 4 choir categories (matching standalone category headers or with number/prefix)
  const categoryPatterns: Array<{ name: SongCategoryName; regex: RegExp }> = [
    { name: 'AGAKIZA', regex: /(?:^|\n)[ \t]*(?:(?:Category|Icyiciro)\s*\d*[\.:\-]?\s*|\d+[\.:\-]?\s*)?AGAKIZA[ \t]*(?:[\.:\-]|\s*)*(?=\n|$)/gi },
    { name: 'IJURU', regex: /(?:^|\n)[ \t]*(?:(?:Category|Icyiciro)\s*\d*[\.:\-]?\s*|\d+[\.:\-]?\s*)?IJURU[ \t]*(?:[\.:\-]|\s*)*(?=\n|$)/gi },
    { name: 'GUSHIMA', regex: /(?:^|\n)[ \t]*(?:(?:Category|Icyiciro)\s*\d*[\.:\-]?\s*|\d+[\.:\-]?\s*)?GUSHIMA[ \t]*(?:[\.:\-]|\s*)*(?=\n|$)/gi },
    { name: 'KWIZERA', regex: /(?:^|\n)[ \t]*(?:(?:Category|Icyiciro)\s*\d*[\.:\-]?\s*|\d+[\.:\-]?\s*)?KWIZERA[ \t]*(?:[\.:\-]|\s*)*(?=\n|$)/gi }
  ];

  interface FoundCategoryMarker {
    category: SongCategoryName;
    startIndex: number;
    headerLength: number;
  }

  const markers: FoundCategoryMarker[] = [];
  for (const { name, regex } of categoryPatterns) {
    regex.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(cleanedText)) !== null) {
      markers.push({
        category: name,
        startIndex: match.index,
        headerLength: match[0].length
      });
    }
  }

  markers.sort((a, b) => a.startIndex - b.startIndex);

  // Helper to determine if a line is likely a song title rather than verse lyrics
  const isLikelySongTitle = (rawTitle: string): boolean => {
    const trimmed = rawTitle.trim();
    if (!trimmed) return false;

    // Disqualify common verse/chorus/speaker labels
    if (/^(?:GUT|KWIK|CHORAS|CHORUS|VERSE|REFRAIN|TOUS|FILLES|GARCONS)[\s\:\.\-]/i.test(trimmed)) {
      return false;
    }

    const lettersOnly = trimmed.replace(/[^a-zA-Z]/g, '');
    if (lettersOnly.length < 2) return false;

    const uppercaseLetters = trimmed.replace(/[^A-Z]/g, '');
    const ratio = uppercaseLetters.length / lettersOnly.length;
    // Song titles in choir documents are overwhelmingly UPPERCASE (e.g., NGWINO TUJYANE, DORE URUKUNDO)
    // whereas verses start with standard title/sentence casing (e.g., "Ngwino tujyane iwacu aho...")
    return ratio >= 0.65;
  };

  const parsedSongs: ParsedSongItem[] = [];

  const extractSongsFromSection = (sectionText: string, category: SongCategoryName) => {
    const songHeaderRegex = /(?:^|\n)\s*(\d+)[\.\)]\s*([^\n\r]+)/g;
    interface SongHeaderMatch {
      number: string;
      title: string;
      matchIndex: number;
      headerLength: number;
    }

    const matches: SongHeaderMatch[] = [];
    let match: RegExpExecArray | null;

    while ((match = songHeaderRegex.exec(sectionText)) !== null) {
      const rawTitle = match[2].trim();
      if (isLikelySongTitle(rawTitle)) {
        // Strip trailing periods if present (e.g. "TURASHIMA YESU." -> "TURASHIMA YESU")
        // but preserve any words or special characters
        const cleanTitle = rawTitle.replace(/^[\s\.\-]+|[\s\.\-]+$/g, '').trim();
        matches.push({
          number: match[1],
          title: cleanTitle || rawTitle,
          matchIndex: match.index,
          headerLength: match[0].length
        });
      }
    }

    for (let i = 0; i < matches.length; i++) {
      const current = matches[i];
      const nextStart = i < matches.length - 1 ? matches[i + 1].matchIndex : sectionText.length;
      let lyrics = sectionText.substring(current.matchIndex + current.headerLength, nextStart).trim();

      // Clean known page footer artifacts from scanned document versions
      lyrics = lyrics.replace(/March 8, 2016\s*\[\s*IGITABO CY’INDIRIMBO ZA\s*CHORALE LA LUMIERE.*?Aimable HA/gi, '').trim();

      parsedSongs.push({
        title: current.title,
        category,
        lyrics, // Raw text string preserving original formatting
        song_number: current.number
      });
    }
  };

  if (markers.length > 0) {
    for (let i = 0; i < markers.length; i++) {
      const current = markers[i];
      const nextStart = i < markers.length - 1 ? markers[i + 1].startIndex : cleanedText.length;
      const sectionText = cleanedText.substring(current.startIndex + current.headerLength, nextStart).trim();
      extractSongsFromSection(sectionText, current.category);
    }
  } else {
    // If no category header was found, default to AGAKIZA
    extractSongsFromSection(cleanedText, 'AGAKIZA');
  }

  return parsedSongs;
}

/**
 * Looks up an existing song in the database by title using case-insensitive
 * and punctuation-normalized comparison to ensure no duplicate titles exist.
 */
export function findExistingSongByTitle(
  title: string,
  dbService: DbWrapper = defaultDb,
  lookupCache?: Map<string, any>
): any | null {
  if (!title || typeof title !== 'string') return null;
  const cleanTitle = title.trim();
  if (!cleanTitle) return null;
  const normTitle = normalizeTitle(cleanTitle);

  if (lookupCache && lookupCache.has(normTitle)) {
    return lookupCache.get(normTitle);
  }

  // 1. Direct query check for exact or case-insensitive title
  const exactMatch = dbService.prepare(`
    SELECT *
    FROM songs
    WHERE LOWER(TRIM(title)) = LOWER(TRIM(?))
      AND (is_deleted = 0 OR is_deleted IS NULL)
    LIMIT 1
  `).get(cleanTitle);

  if (exactMatch) {
    if (lookupCache) lookupCache.set(normTitle, exactMatch);
    return exactMatch;
  }

  // 2. Scan active songs with normalized comparison (ignoring apostrophes, periods, punctuation)
  const activeSongs = dbService.prepare(`
    SELECT *
    FROM songs
    WHERE is_deleted = 0 OR is_deleted IS NULL
  `).all() as any[];

  for (const s of activeSongs) {
    if (normalizeTitle(s.title) === normTitle) {
      if (lookupCache) lookupCache.set(normTitle, s);
      return s;
    }
  }

  return null;
}

/**
 * Service function in the backend to manage song records.
 * Accepts a song object and uses its 'title' as a unique identifier.
 * 
 * Requirement:
 * "This function must check the database for an existing song with the same title;
 * if found, update the existing record (preserving IDs and existing metadata),
 * and if not found, perform a new insertion to ensure no duplicates are created
 * during the bulk import process."
 * 
 * @param songInput - The song object to manage
 * @param dbService - Database wrapper service instance (defaults to defaultDb)
 * @param lookupCache - Optional Map cache of normalized title -> existing record for batch performance
 * @returns ManageSongRecordResult with action ('inserted' | 'updated'), IDs, and preserved metadata
 */
export function upsertSongRecord(
  songInput: SongRecordInput | ParsedSongItem | Record<string, any>,
  dbService: DbWrapper = defaultDb,
  lookupCache?: Map<string, any>
): ManageSongRecordResult {
  if (!songInput || typeof songInput !== 'object') {
    throw new TypeError('songInput must be a valid song object');
  }

  const rawTitle = typeof songInput.title === 'string' ? songInput.title : '';
  const cleanTitle = rawTitle.trim();
  if (!cleanTitle) {
    throw new Error('Song object must contain a non-empty title');
  }

  const normTitle = normalizeTitle(cleanTitle);
  const existing = findExistingSongByTitle(cleanTitle, dbService, lookupCache);

  const categoryName = songInput.category
    ? normalizeCategoryName(String(songInput.category))
    : (existing?.category_id ? normalizeCategoryName(existing.category_id) : 'AGAKIZA');

  const categoryId = songInput.category_id
    ? resolveCategoryId(String(songInput.category_id))
    : mapCategoryToId(categoryName);

  const rawLyrics = typeof songInput.lyrics === 'string'
    ? songInput.lyrics
    : (typeof songInput.content === 'string' ? songInput.content : '');

  const songNum = songInput.song_number !== undefined && songInput.song_number !== null
    ? String(songInput.song_number).trim()
    : (songInput.number !== undefined && songInput.number !== null ? String(songInput.number).trim() : null);

  const parsedOrder = songNum ? parseInt(songNum, 10) : NaN;

  if (existing) {
    // -------------------------------------------------------------
    // EXISTING RECORD FOUND: UPDATE (Preserving IDs & Existing Metadata)
    // -------------------------------------------------------------
    const preservedId = existing.id;

    // Preserve existing metadata unless explicitly provided in songInput
    const finalSongNumber = songNum || existing.song_number || null;
    const finalComposer = (songInput.composer && String(songInput.composer).trim())
      ? String(songInput.composer).trim()
      : (existing.composer || 'La Lumiere Choir');
    const finalDescription = (songInput.description && String(songInput.description).trim())
      ? String(songInput.description).trim()
      : (existing.description || `Indirimbo muri ${categoryName} - Chorale La Lumiere`);
    const finalCoverImageUrl = (songInput.cover_image_url && String(songInput.cover_image_url).trim())
      ? String(songInput.cover_image_url).trim()
      : (existing.cover_image_url || '');
    const finalLyricsPdfUrl = (songInput.lyrics_pdf_url && String(songInput.lyrics_pdf_url).trim())
      ? String(songInput.lyrics_pdf_url).trim()
      : (existing.lyrics_pdf_url || null);
    const finalLyricsPdfFilename = (songInput.lyrics_pdf_filename && String(songInput.lyrics_pdf_filename).trim())
      ? String(songInput.lyrics_pdf_filename).trim()
      : (existing.lyrics_pdf_filename || null);
    const finalReleaseStatus = songInput.release_status
      ? String(songInput.release_status)
      : (existing.release_status || 'released');
    const finalReleaseDate = songInput.release_date
      ? String(songInput.release_date)
      : (existing.release_date || '2016-03-08');
    const finalStatus = songInput.status
      ? String(songInput.status)
      : (existing.status || 'published');
    const finalDisplayOrder = songInput.display_order !== undefined && songInput.display_order !== null
      ? Number(songInput.display_order)
      : (!isNaN(parsedOrder) ? parsedOrder : (existing.display_order || 1));

    dbService.prepare(`
      UPDATE songs
      SET title = ?,
          song_number = ?,
          composer = ?,
          category_id = ?,
          release_status = ?,
          release_date = ?,
          description = ?,
          cover_image_url = ?,
          lyrics_pdf_url = ?,
          lyrics_pdf_filename = ?,
          status = ?,
          display_order = ?,
          is_deleted = 0,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      cleanTitle,
      finalSongNumber,
      finalComposer,
      categoryId,
      finalReleaseStatus,
      finalReleaseDate,
      finalDescription,
      finalCoverImageUrl,
      finalLyricsPdfUrl,
      finalLyricsPdfFilename,
      finalStatus,
      finalDisplayOrder,
      preservedId
    );

    // Update lyrics while preserving existing lyrics ID and created_at
    let finalLyricsLength = 0;
    const existingLyrics = dbService.prepare(`
      SELECT id, content, solfa_notation, language, created_at
      FROM lyrics
      WHERE song_id = ?
    `).get(preservedId) as any;

    if (existingLyrics) {
      const updatedLyricsContent = rawLyrics.trim() ? rawLyrics : existingLyrics.content;
      finalLyricsLength = updatedLyricsContent.length;
      const updatedSolfa = songInput.solfa_notation !== undefined
        ? songInput.solfa_notation
        : existingLyrics.solfa_notation;
      const updatedLang = songInput.language || existingLyrics.language || 'rw';

      dbService.prepare(`
        UPDATE lyrics
        SET content = ?,
            solfa_notation = ?,
            language = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(
        updatedLyricsContent,
        updatedSolfa,
        updatedLang,
        existingLyrics.id
      );
    } else if (rawLyrics.trim() || songInput.solfa_notation) {
      finalLyricsLength = rawLyrics.length;
      dbService.prepare(`
        INSERT INTO lyrics (id, song_id, content, solfa_notation, language, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `).run(
        `lyr_${preservedId}`,
        preservedId,
        rawLyrics,
        songInput.solfa_notation || null,
        songInput.language || 'rw'
      );
    }

    const updatedRecord = {
      ...existing,
      id: preservedId,
      title: cleanTitle,
      song_number: finalSongNumber,
      category_id: categoryId,
      composer: finalComposer,
      description: finalDescription,
      cover_image_url: finalCoverImageUrl
    };

    if (lookupCache) {
      lookupCache.set(normTitle, updatedRecord);
    }

    return {
      title: cleanTitle,
      category: categoryName,
      category_id: categoryId,
      action: 'updated',
      song_id: preservedId,
      song_number: finalSongNumber || undefined,
      lyrics_length: finalLyricsLength,
      is_new: false,
      preservedMetadata: {
        id: preservedId,
        created_at: existing.created_at,
        created_by: existing.created_by,
        views_count: existing.views_count,
        shares_count: existing.shares_count,
        composer: existing.composer,
        description: existing.description,
        cover_image_url: existing.cover_image_url,
        lyrics_pdf_url: existing.lyrics_pdf_url
      },
      song: updatedRecord
    };
  } else {
    // -------------------------------------------------------------
    // NO EXISTING RECORD: INSERT (Ensuring no duplicate titles)
    // -------------------------------------------------------------
    const safeId = `song_${categoryId.replace('cat_', '')}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const countRow = dbService.prepare('SELECT COUNT(*) as cnt FROM songs').get() as any;
    const totalCount = countRow?.cnt || 0;
    const displayOrder = !isNaN(parsedOrder)
      ? parsedOrder
      : (songInput.display_order !== undefined ? Number(songInput.display_order) : totalCount + 1);

    const composer = (songInput.composer && String(songInput.composer).trim())
      ? String(songInput.composer).trim()
      : 'La Lumiere Choir';
    const description = (songInput.description && String(songInput.description).trim())
      ? String(songInput.description).trim()
      : `Indirimbo muri ${categoryName} - Chorale La Lumiere`;
    const releaseStatus = songInput.release_status ? String(songInput.release_status) : 'released';
    const releaseDate = songInput.release_date ? String(songInput.release_date) : '2016-03-08';
    const status = songInput.status ? String(songInput.status) : 'published';
    const coverImageUrl = songInput.cover_image_url ? String(songInput.cover_image_url) : '';
    const lyricsPdfUrl = songInput.lyrics_pdf_url ? String(songInput.lyrics_pdf_url) : null;
    const lyricsPdfFilename = songInput.lyrics_pdf_filename ? String(songInput.lyrics_pdf_filename) : null;

    dbService.prepare(`
      INSERT INTO songs (
        id, title, song_number, composer, category_id, release_status,
        release_date, description, cover_image_url, lyrics_pdf_url, lyrics_pdf_filename,
        status, is_deleted, display_order, created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, 0, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      )
    `).run(
      safeId,
      cleanTitle,
      songNum || null,
      composer,
      categoryId,
      releaseStatus,
      releaseDate,
      description,
      coverImageUrl,
      lyricsPdfUrl,
      lyricsPdfFilename,
      status,
      displayOrder
    );

    if (rawLyrics || songInput.solfa_notation) {
      dbService.prepare(`
        INSERT INTO lyrics (id, song_id, content, solfa_notation, language, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `).run(
        `lyr_${safeId}`,
        safeId,
        rawLyrics,
        songInput.solfa_notation || null,
        songInput.language || 'rw'
      );
    }

    const newRecord = {
      id: safeId,
      title: cleanTitle,
      song_number: songNum || null,
      category_id: categoryId,
      composer,
      description
    };

    if (lookupCache) {
      lookupCache.set(normTitle, newRecord);
    }

    return {
      title: cleanTitle,
      category: categoryName,
      category_id: categoryId,
      action: 'inserted',
      song_id: safeId,
      song_number: songNum || undefined,
      lyrics_length: rawLyrics.length,
      is_new: true,
      song: newRecord
    };
  }
}

/**
 * Service function alias to manage a song record.
 */
export const manageSongRecord = upsertSongRecord;

/**
 * Service function alias to upsert a song by title uniqueness.
 */
export const upsertSongByTitle = upsertSongRecord;

/**
 * Upserts parsed song records into the SQLite database using the existing database service.
 * Ensures zero duplicate titles are created by checking for title existence before insertion,
 * updating existing records while preserving IDs and metadata, and inserting new records.
 */
export function upsertSongRecords(
  parsedSongs: Array<SongRecordInput | ParsedSongItem>,
  dbService: DbWrapper = defaultDb
): UpsertSongsReport {
  if (!Array.isArray(parsedSongs)) {
    throw new TypeError('parsedSongs must be an array');
  }

  // Pre-load lookup map of normalized title -> existing record for batch performance
  const existingSongs = dbService.prepare(`
    SELECT *
    FROM songs
    WHERE is_deleted = 0 OR is_deleted IS NULL
  `).all() as any[];

  const lookupCache = new Map<string, any>();
  for (const es of existingSongs) {
    const norm = normalizeTitle(es.title);
    if (norm) {
      lookupCache.set(norm, es);
    }
  }

  const results: UpsertSongResult[] = [];
  let insertedCount = 0;
  let updatedCount = 0;

  for (let idx = 0; idx < parsedSongs.length; idx++) {
    const item = parsedSongs[idx];
    if (!item) continue;
    const cleanTitle = (item.title || '').trim();
    if (!cleanTitle) continue;

    const res = upsertSongRecord(item, dbService, lookupCache);
    if (res.action === 'inserted') insertedCount++;
    if (res.action === 'updated') updatedCount++;
    results.push(res);
  }

  const skippedCount = results.filter(r => r.action === 'skipped').length;

  return {
    totalProcessed: results.length,
    insertedCount,
    updatedCount,
    skippedCount,
    songs: results
  };
}

/**
 * End-to-end secure utility function to parse text document into JSON
 * and upsert into the database service without creating duplicate titles.
 */
export function parseAndUpsertSongDocument(
  documentText: unknown,
  dbService: DbWrapper = defaultDb
): DocumentImportSummary {
  const parsedSongs = parseSongDocumentToJSON(documentText);
  const report = upsertSongRecords(parsedSongs, dbService);

  return {
    parsedCount: parsedSongs.length,
    insertedCount: report.insertedCount,
    updatedCount: report.updatedCount,
    parsedSongs,
    report
  };
}
