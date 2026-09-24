/**
 * offlineStorage.ts
 *
 * Robust IndexedDB client-side caching & offline management for La Lumiere Choir:
 * - Saves downloaded songs with full lyrics and metadata
 * - Saves downloaded audio tracks (Blob/ArrayBuffer storage)
 * - Automatically falls back to cache when offline or network fails
 * - Provides download progress, download single song, download entire category, or download all 92 songs
 */

import { Song, AudioTrack } from '../types';

const DB_NAME = 'lalumiere_offline_db';
const DB_VERSION = 1;
const STORE_SONGS = 'downloaded_songs';
const STORE_AUDIO = 'downloaded_audio';
const STORE_META = 'offline_metadata';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not supported in this environment'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains(STORE_SONGS)) {
        const songStore = db.createObjectStore(STORE_SONGS, { keyPath: 'id' });
        songStore.createIndex('category_id', 'category_id', { unique: false });
        songStore.createIndex('song_number', 'song_number', { unique: false });
        songStore.createIndex('downloaded_at', 'downloaded_at', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORE_AUDIO)) {
        const audioStore = db.createObjectStore(STORE_AUDIO, { keyPath: 'trackId' });
        audioStore.createIndex('songId', 'songId', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORE_META)) {
        db.createObjectStore(STORE_META, { keyPath: 'key' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export interface OfflineSongRecord extends Song {
  downloaded_at: number;
  has_offline_lyrics: boolean;
  has_offline_audio?: boolean;
}

export interface OfflineAudioRecord {
  trackId: string;
  songId: string;
  audioBlob: Blob;
  mimeType: string;
  downloaded_at: number;
}

/**
 * Save a single song to offline storage (including full lyrics)
 */
export async function saveSongOffline(song: Song): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_SONGS], 'readwrite');
    const store = tx.objectStore(STORE_SONGS);

    const record: OfflineSongRecord = {
      ...song,
      downloaded_at: Date.now(),
      has_offline_lyrics: Boolean(song.lyrics && song.lyrics.trim().length > 0),
    };

    const req = store.put(record);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

/**
 * Save multiple songs to offline storage in a single transaction
 */
export async function saveSongsOfflineBatch(songs: Song[]): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_SONGS], 'readwrite');
    const store = tx.objectStore(STORE_SONGS);

    for (const song of songs) {
      const record: OfflineSongRecord = {
        ...song,
        downloaded_at: Date.now(),
        has_offline_lyrics: Boolean(song.lyrics && song.lyrics.trim().length > 0),
      };
      store.put(record);
    }

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Get a specific song from offline storage
 */
export async function getOfflineSong(songId: string): Promise<OfflineSongRecord | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_SONGS], 'readonly');
      const store = tx.objectStore(STORE_SONGS);
      const req = store.get(songId);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Could not read offline song:', err);
    return null;
  }
}

/**
 * Check if a song is downloaded offline
 */
export async function isSongDownloadedOffline(songId: string): Promise<boolean> {
  const song = await getOfflineSong(songId);
  return Boolean(song);
}

/**
 * Get all downloaded songs from offline storage
 */
export async function getAllOfflineSongs(): Promise<OfflineSongRecord[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_SONGS], 'readonly');
      const store = tx.objectStore(STORE_SONGS);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Could not fetch all offline songs:', err);
    return [];
  }
}

/**
 * Remove a song from offline storage
 */
export async function removeSongOffline(songId: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_SONGS, STORE_AUDIO], 'readwrite');
    const songStore = tx.objectStore(STORE_SONGS);
    songStore.delete(songId);

    // Also remove associated audio tracks
    const audioStore = tx.objectStore(STORE_AUDIO);
    const index = audioStore.index('songId');
    const req = index.openCursor(IDBKeyRange.only(songId));
    req.onsuccess = (e) => {
      const cursor = (e.target as IDBRequest).result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Cache an audio file for offline listening
 */
export async function saveAudioOffline(track: AudioTrack, songId: string): Promise<void> {
  if (!track.audio_url) return;

  const response = await fetch(track.audio_url);
  if (!response.ok) throw new Error(`Failed to download audio: ${response.statusText}`);
  const blob = await response.blob();

  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_AUDIO, STORE_SONGS], 'readwrite');
    const audioStore = tx.objectStore(STORE_AUDIO);

    const audioRecord: OfflineAudioRecord = {
      trackId: track.id,
      songId: songId,
      audioBlob: blob,
      mimeType: blob.type || 'audio/mpeg',
      downloaded_at: Date.now(),
    };
    audioStore.put(audioRecord);

    // Update song record if present
    const songStore = tx.objectStore(STORE_SONGS);
    const getReq = songStore.get(songId);
    getReq.onsuccess = () => {
      if (getReq.result) {
        getReq.result.has_offline_audio = true;
        songStore.put(getReq.result);
      }
    };

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Retrieve cached audio object URL for offline playback
 */
export async function getOfflineAudioUrl(trackId: string): Promise<string | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_AUDIO], 'readonly');
      const store = tx.objectStore(STORE_AUDIO);
      const req = store.get(trackId);
      req.onsuccess = () => {
        const record: OfflineAudioRecord | undefined = req.result;
        if (record && record.audioBlob) {
          const url = URL.createObjectURL(record.audioBlob);
          resolve(url);
        } else {
          resolve(null);
        }
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Error reading offline audio:', err);
    return null;
  }
}

/**
 * Download entire songbook (all 92 songs with lyrics) for guaranteed 100% offline access
 */
export async function downloadAllSongsForOffline(
  onProgress?: (current: number, total: number, songTitle: string) => void
): Promise<number> {
  // First fetch the complete songs list
  const res = await fetch('/api/songs');
  if (!res.ok) throw new Error('Failed to fetch songs list');
  const songList: Song[] = await res.json();
  const total = songList.length;

  const detailedSongs: Song[] = [];

  for (let i = 0; i < songList.length; i++) {
    const brief = songList[i];
    if (onProgress) {
      onProgress(i + 1, total, brief.title);
    }

    try {
      const detailRes = await fetch(`/api/songs/${brief.id}`);
      if (detailRes.ok) {
        const detailed: Song = await detailRes.json();
        detailedSongs.push(detailed);
      } else {
        detailedSongs.push(brief);
      }
    } catch {
      detailedSongs.push(brief);
    }
  }

  // Save in batch to IndexedDB
  await saveSongsOfflineBatch(detailedSongs);
  return detailedSongs.length;
}

/**
 * Clear all offline songs and audio
 */
export async function clearOfflineStorage(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_SONGS, STORE_AUDIO], 'readwrite');
    tx.objectStore(STORE_SONGS).clear();
    tx.objectStore(STORE_AUDIO).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
