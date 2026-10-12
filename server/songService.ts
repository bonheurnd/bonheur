/**
 * Song Management Service
 * 
 * Central backend service providing high-level management functions for choir songs,
 * with strict duplicate prevention using 'title' as a unique identifier.
 */

import { db as defaultDb, DbWrapper } from './db.js';
import {
  findExistingSongByTitle,
  upsertSongRecord,
  manageSongRecord,
  upsertSongByTitle,
  upsertSongRecords,
  parseSongDocumentToJSON,
  parseAndUpsertSongDocument,
  normalizeTitle,
  mapCategoryToId,
  normalizeCategoryName,
  resolveCategoryId,
  VALID_CATEGORIES,
  type SongRecordInput,
  type ManageSongRecordResult,
  type ParsedSongItem,
  type UpsertSongResult,
  type UpsertSongsReport,
  type DocumentImportSummary,
  type SongCategoryName
} from './songDocumentParser.js';

import {
  parseSixteenSongs,
  upsertSixteenSongs,
  RAW_16_SONGS_DOCUMENT_TEXT
} from './parse16SongsUtility.js';

export {
  // Core single-song management function (Requirement 4)
  upsertSongRecord,
  manageSongRecord,
  upsertSongByTitle,
  findExistingSongByTitle,

  // Batch / Bulk import functions
  upsertSongRecords,
  parseSongDocumentToJSON,
  parseAndUpsertSongDocument,
  parseSixteenSongs,
  upsertSixteenSongs,
  RAW_16_SONGS_DOCUMENT_TEXT,

  // Normalization and helper functions
  normalizeTitle,
  mapCategoryToId,
  normalizeCategoryName,
  resolveCategoryId,
  VALID_CATEGORIES,

  // Types
  type SongRecordInput,
  type ManageSongRecordResult,
  type ParsedSongItem,
  type UpsertSongResult,
  type UpsertSongsReport,
  type DocumentImportSummary,
  type SongCategoryName
};

/**
 * Service function to manage a song record.
 * Accepts a song object and uses its 'title' as a unique identifier.
 * Checks the database for an existing song with the same title:
 * - If found: updates the existing record (preserving existing IDs and metadata).
 * - If not found: performs a new insertion to ensure zero duplicates are created.
 */
export function manageSong(
  song: SongRecordInput | ParsedSongItem | Record<string, any>,
  dbService: DbWrapper = defaultDb
): ManageSongRecordResult {
  return upsertSongRecord(song, dbService);
}
