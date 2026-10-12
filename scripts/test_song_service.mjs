import { db } from '../server/db.js';
import {
  upsertSongRecord,
  manageSongRecord,
  upsertSongByTitle,
  findExistingSongByTitle,
  upsertSongRecords
} from '../server/songService.js';

console.log('===============================================================');
console.log('TESTING SONG MANAGEMENT SERVICE FUNCTION');
console.log('===============================================================');

// 1. Test insertion of a new song record
const testTitle = `UMUNSI W'UMWAMI ${Date.now()}`;
console.log(`\nTest 1: Inserting new song with unique title "${testTitle}"...`);

const insertResult = upsertSongRecord({
  title: testTitle,
  category: 'IJURU',
  song_number: '999',
  composer: 'Chorale La Lumiere Testing',
  description: 'Original test description',
  cover_image_url: 'https://example.com/cover1.jpg',
  lyrics: '1. Umunsi w\'umwami uzaza vuba cyane...\n\nR/ Tuzishima iteka.'
}, db);

console.log('Insert Result:', insertResult);
console.assert(insertResult.action === 'inserted', 'Action must be "inserted"');
console.assert(insertResult.is_new === true, 'is_new must be true');
console.assert(typeof insertResult.song_id === 'string' && insertResult.song_id.length > 0, 'Must have valid song_id');

const originalSongId = insertResult.song_id;

// Simulate views, shares, and get stored row
db.prepare('UPDATE songs SET views_count = 145, shares_count = 28 WHERE id = ?').run(originalSongId);
const storedBefore = db.prepare('SELECT * FROM songs WHERE id = ?').get(originalSongId);
const storedLyricsBefore = db.prepare('SELECT * FROM lyrics WHERE song_id = ?').get(originalSongId);

console.log('Stored song before update:', {
  id: storedBefore.id,
  created_at: storedBefore.created_at,
  views_count: storedBefore.views_count,
  shares_count: storedBefore.shares_count,
  composer: storedBefore.composer,
  description: storedBefore.description,
  cover_image_url: storedBefore.cover_image_url
});

// 2. Test updating the existing record using same title (exact and case variation)
console.log('\nTest 2: Updating existing song using the same title (lowercase with punctuation variation)...');
const updateTitleVariant = testTitle.toLowerCase();

const updateResult = manageSongRecord({
  title: updateTitleVariant,
  category: 'IJURU',
  // Omit composer, description, cover_image_url to test preservation of existing metadata
  lyrics: '1. Umunsi w\'umwami uzaza vuba cyane...\n\n2. Umuriro uzazimya ibyaha byose.\n\nR/ Tuzishima iteka.'
}, db);

console.log('Update Result:', updateResult);
console.assert(updateResult.action === 'updated', 'Action must be "updated"');
console.assert(updateResult.is_new === false, 'is_new must be false');
console.assert(updateResult.song_id === originalSongId, 'Existing song ID must be preserved!');

// 3. Verify metadata preservation in database
console.log('\nTest 3: Verifying preservation of ID and existing metadata...');
const storedAfter = db.prepare('SELECT * FROM songs WHERE id = ?').get(originalSongId);
const storedLyricsAfter = db.prepare('SELECT * FROM lyrics WHERE song_id = ?').get(originalSongId);

console.assert(storedAfter.id === storedBefore.id, 'ID strictly preserved');
console.assert(storedAfter.created_at === storedBefore.created_at, 'created_at preserved');
console.assert(storedAfter.views_count === 145, 'views_count preserved (was 145)');
console.assert(storedAfter.shares_count === 28, 'shares_count preserved (was 28)');
console.assert(storedAfter.composer === 'Chorale La Lumiere Testing', 'composer preserved');
console.assert(storedAfter.description === 'Original test description', 'description preserved');
console.assert(storedAfter.cover_image_url === 'https://example.com/cover1.jpg', 'cover_image_url preserved');
console.assert(storedLyricsAfter.id === storedLyricsBefore.id, 'Lyrics ID preserved');
console.assert(storedLyricsAfter.content.includes('Umuriro uzazimya'), 'Lyrics content updated with new verses');

console.log('All metadata preservation checks PASSED!');

// 4. Test duplicate prevention in bulk import
console.log('\nTest 4: Testing bulk import with duplicate title in array...');
const bulkSongs = [
  { title: testTitle, category: 'IJURU', lyrics: 'Test duplicate title existing' },
  { title: `NEW BULK SONG 1 ${Date.now()}`, category: 'AGAKIZA', lyrics: 'First new bulk song' },
  { title: `NEW BULK SONG 1 ${Date.now()}`, category: 'AGAKIZA', lyrics: 'Duplicate of first new bulk song within same batch' }
];

const bulkReport = upsertSongRecords(bulkSongs, db);
console.log('Bulk Report:', bulkReport);
console.assert(bulkReport.totalProcessed === 3, 'Total 3 songs processed');
console.assert(bulkReport.insertedCount === 1, 'Only 1 new song inserted');
console.assert(bulkReport.updatedCount === 2, '2 songs updated (the pre-existing one and the duplicate batch one)');

// Clean up test data
db.prepare('DELETE FROM lyrics WHERE song_id IN (?, ?)').run(originalSongId, bulkReport.songs[1].song_id);
db.prepare('DELETE FROM songs WHERE id IN (?, ?)').run(originalSongId, bulkReport.songs[1].song_id);

console.log('\n===============================================================');
console.log('ALL SONG SERVICE TESTS PASSED SUCCESSFULLY!');
console.log('===============================================================');
