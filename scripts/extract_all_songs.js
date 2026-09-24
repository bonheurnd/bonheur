import fs from 'fs';
import { categoryDefinitions } from './category_defs.js';

const raw = fs.readFileSync('./scripts/raw_songs.txt', 'utf8');

// We will find each category section in order.
const catNames = [
  "Category 1. AGAKIZA",
  "Category 2. IJURU, UBUGINGO BW'ITEKA N'AMASEZERANO",
  "Category 3. GUSHIMA",
  "Category 4. KWIZERA"
];

const catIndices = catNames.map(cn => {
  const idx = raw.indexOf(cn);
  if (idx === -1) throw new Error(`Category header not found: ${cn}`);
  return { name: cn, index: idx };
});

const songsOutput = [];
let globalIndex = 1;

for (let c = 0; c < categoryDefinitions.length; c++) {
  const catDef = categoryDefinitions[c];
  const startIdx = catIndices[c].index + catNames[c].length;
  const endIdx = (c < categoryDefinitions.length - 1) ? catIndices[c + 1].index : raw.length;
  const catText = raw.substring(startIdx, endIdx);

  console.log(`Processing ${catDef.category_name} (Length: ${catText.length})...`);

  // We have the list of songs for this category
  // Let's find each song's header in order in catText
  let searchPos = 0;
  const songPositions = [];

  for (let s = 0; s < catDef.songs.length; s++) {
    const song = catDef.songs[s];
    // Find pattern: song.number + ". " + song.title (allowing flexible whitespace / linebreaks in title if any)
    const titleRegexStr = song.title
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      .replace(/\s+/g, '\\s+');
    const pattern = new RegExp(`(?:^|\\n)\\s*(${song.number})\\.\\s*(${titleRegexStr})`, 'g');
    pattern.lastIndex = searchPos;
    const match = pattern.exec(catText);
    if (!match) {
      throw new Error(`Could not find song #${song.number} "${song.title}" in category ${catDef.category_name} starting from pos ${searchPos}`);
    }

    songPositions.push({
      song,
      headerStart: match.index,
      headerEnd: match.index + match[0].length,
      matchedNumber: match[1],
      matchedTitle: match[2].trim().replace(/\s+/g, ' ')
    });

    searchPos = match.index + match[0].length;
  }

  // Now extract lyrics for each song
  for (let s = 0; s < songPositions.length; s++) {
    const cur = songPositions[s];
    const nextStart = (s < songPositions.length - 1) ? songPositions[s + 1].headerStart : catText.length;
    let lyrics = catText.substring(cur.headerEnd, nextStart).trim();

    // Clean up page footer artifacts if present:
    // e.g. "March 8, 2016 [ IGITABO CY’INDIRIMBO ZA  CHORALE LA LUMIERE ... Aimable HA"
    // Note: The prompt instructed: "Preserve every song title and every lyric exactly as provided in the JSON... Do not correct spelling, punctuation, numbering, repeated words, or line breaks in the song lyrics."
    // Let's check if the footer appears in the lyrics
    const footerRegex = /March 8, 2016\s*\[\s*IGITABO CY’INDIRIMBO ZA\s*CHORALE LA LUMIERE\s*\(\s*ZABURI\s*147:1\s*;YOBU 8\s*:\s*7\)\s*\]\s*\d+\s*BY\s*Aimable HA/gi;
    if (footerRegex.test(lyrics)) {
      console.log(`Found page footer in song #${cur.song.number} "${cur.song.title}", removing page book artifact.`);
      lyrics = lyrics.replace(footerRegex, '').trim();
    }

    const songId = `song_${catDef.category_slug}_${String(s + 1).padStart(2, '0')}`;

    songsOutput.push({
      id: songId,
      global_number: globalIndex++,
      song_number: cur.matchedNumber,
      title: cur.matchedTitle,
      category_id: catDef.category_id,
      category_name: catDef.category_name,
      category_slug: catDef.category_slug,
      category_number: catDef.category_number,
      lyrics: lyrics
    });
  }
}

console.log(`\nSuccessfully extracted ${songsOutput.length} songs.`);
fs.writeFileSync('./LA_LUMIERE_CHORALE_SONGS_APP_READY.json', JSON.stringify(songsOutput, null, 2), 'utf8');
console.log('Saved LA_LUMIERE_CHORALE_SONGS_APP_READY.json successfully!');
