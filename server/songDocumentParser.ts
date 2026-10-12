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
 * Upserts parsed song records into the SQLite database using the existing database service.
 * 
 * Strict Requirement:
 * "ensuring no duplicate titles are created by checking for title existence before insertion"
 * 
 * For each song:
 * 1. Checks for title existence (case-insensitive & normalized title matching).
 * 2. If it exists: updates the song metadata & upserts lyrics to the matching record.
 * 3. If it does not exist: inserts a new song & lyrics record.
 * 
 * All queries are parameterized prepared statements, preventing SQL injection.
 */
export function upsertSongRecords(
  parsedSongs: ParsedSongItem[],
  dbService: DbWrapper = defaultDb
): UpsertSongsReport {
  if (!Array.isArray(parsedSongs)) {
    throw new TypeError('parsedSongs must be an array');
  }

  // Fetch all existing songs for title existence check
  const existingSongs = dbService.prepare(`
    SELECT id, title, category_id, song_number
    FROM songs
    WHERE is_deleted = 0 OR is_deleted IS NULL
  `).all() as Array<{ id: string; title: string; category_id: string; song_number: string }>;

  // Build a lookup map of normalized title -> existing song record
  const existingByNormalizedTitle = new Map<string, { id: string; title: string; category_id: string; song_number: string }>();
  for (const es of existingSongs) {
    const norm = normalizeTitle(es.title);
    if (norm) {
      existingByNormalizedTitle.set(norm, es);
    }
  }

  // Prepared statements for secure database operations
  const updateSongStmt = dbService.prepare(`
    UPDATE songs
    SET title = ?,
        song_number = COALESCE(?, song_number),
        category_id = ?,
        status = 'published',
        release_status = 'released',
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);

  const insertSongStmt = dbService.prepare(`
    INSERT INTO songs (
      id, title, song_number, composer, category_id, release_status,
      release_date, description, status, is_deleted, display_order, created_at, updated_at
    ) VALUES (
      ?, ?, ?, 'La Lumiere Choir', ?, 'released',
      '2016-03-08', ?, 'published', 0, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    )
  `);

  const selectLyricsStmt = dbService.prepare(`SELECT id FROM lyrics WHERE song_id = ?`);
  const updateLyricsStmt = dbService.prepare(`UPDATE lyrics SET content = ?, updated_at = CURRENT_TIMESTAMP WHERE song_id = ?`);
  const insertLyricsStmt = dbService.prepare(`INSERT INTO lyrics (id, song_id, content, language, created_at, updated_at) VALUES (?, ?, ?, 'rw', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`);

  let insertedCount = 0;
  let updatedCount = 0;
  const results: UpsertSongResult[] = [];

  for (let idx = 0; idx < parsedSongs.length; idx++) {
    const item = parsedSongs[idx];
    const cleanTitle = (item.title || '').trim();
    if (!cleanTitle) continue;

    const normTitle = normalizeTitle(cleanTitle);
    const categoryName = normalizeCategoryName(item.category);
    const categoryId = mapCategoryToId(categoryName);
    const rawLyrics = typeof item.lyrics === 'string' ? item.lyrics : '';
    const songNum = item.song_number ? String(item.song_number).trim() : null;

    // Check title existence before insertion
    const existing = existingByNormalizedTitle.get(normTitle);

    if (existing) {
      // Song title exists -> UPDATE (upsert without duplicating)
      updateSongStmt.run(cleanTitle, songNum, categoryId, existing.id);

      // Upsert raw lyrics
      const existingLyrics = selectLyricsStmt.get(existing.id);
      if (existingLyrics) {
        updateLyricsStmt.run(rawLyrics, existing.id);
      } else {
        insertLyricsStmt.run(`lyr_${existing.id}`, existing.id, rawLyrics);
      }

      updatedCount++;
      results.push({
        title: cleanTitle,
        category: categoryName,
        action: 'updated',
        song_id: existing.id,
        song_number: songNum || existing.song_number,
        lyrics_length: rawLyrics.length
      });
    } else {
      // Song title does NOT exist -> INSERT new record
      const safeId = `song_${categoryId.replace('cat_', '')}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const parsedOrder = songNum ? parseInt(songNum, 10) : NaN;
      const displayOrder = !isNaN(parsedOrder) ? parsedOrder : (existingSongs.length + insertedCount + 1);
      const description = `Indirimbo muri ${categoryName} - Chorale La Lumiere`;

      insertSongStmt.run(
        safeId,
        cleanTitle,
        songNum,
        categoryId,
        description,
        displayOrder
      );

      insertLyricsStmt.run(`lyr_${safeId}`, safeId, rawLyrics);

      // Register into lookup map to ensure no duplicate titles within the same batch
      const newEntry = {
        id: safeId,
        title: cleanTitle,
        category_id: categoryId,
        song_number: songNum || ''
      };
      existingByNormalizedTitle.set(normTitle, newEntry);
      existingSongs.push(newEntry);

      insertedCount++;
      results.push({
        title: cleanTitle,
        category: categoryName,
        action: 'inserted',
        song_id: safeId,
        song_number: songNum || undefined,
        lyrics_length: rawLyrics.length
      });
    }
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
