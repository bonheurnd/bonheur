import fs from 'fs';

const text = fs.readFileSync('./scripts/raw_songs.txt', 'utf8');

// Categories in the text:
// Category 1. AGAKIZA
// Category 2. IJURU, UBUGINGO BW'ITEKA N'AMASEZERANO
// Category 3. GUSHIMA
// Category 4. KWIZERA

const categorySplits = [
  {
    category_id: 'cat_agakiza',
    category_number: 1,
    category_name: 'AGAKIZA',
    category_slug: 'agakiza',
    headerMatch: /Category 1\.\s*AGAKIZA/i
  },
  {
    category_id: 'cat_ijuru',
    category_number: 2,
    category_name: 'IJURU',
    category_slug: 'ijuru',
    headerMatch: /Category 2\.\s*IJURU[^\n]*/i
  },
  {
    category_id: 'cat_gushima',
    category_number: 3,
    category_name: 'GUSHIMA',
    category_slug: 'gushima',
    headerMatch: /Category 3\.\s*GUSHIMA/i
  },
  {
    category_id: 'cat_kwizera',
    category_number: 4,
    category_name: 'KWIZERA',
    category_slug: 'kwizera',
    headerMatch: /Category 4\.\s*KWIZERA/i
  }
];

// Let's find positions of each category header
const positions = [];
for (let i = 0; i < categorySplits.length; i++) {
  const match = text.match(categorySplits[i].headerMatch);
  if (!match || match.index === undefined) {
    throw new Error(`Could not find header for ${categorySplits[i].category_name}`);
  }
  positions.push({
    ...categorySplits[i],
    startIndex: match.index + match[0].length
  });
}

const parsedCategories = [];

for (let i = 0; i < positions.length; i++) {
  const current = positions[i];
  const nextStartIndex = i < positions.length - 1 ? positions[i + 1].startIndex - positions[i + 1].headerMatch.source.length : text.length;
  const sectionText = text.substring(current.startIndex, nextStartIndex).trim();
  parsedCategories.push({
    ...current,
    sectionText
  });
}

console.log('Found 4 category sections.');

// Within each category, how are songs separated?
// Notice in Category 1:
// 1. URUKUNDO
// 2. TURASHIMA YESU.
// 3. NOHERI.
// ...
// 25. MFITE AMATSIKO.

parsedCategories.forEach(cat => {
  console.log(`\n=== Category ${cat.category_number}: ${cat.category_name} ===`);
  // Let's find all song headers like "\n1. URUKUNDO" or starting at beginning of sectionText
  // Notice song numbers can be "1. ", "2. ", ..., "15. ", etc.
  // In Category 2: 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 11, 12, 13, 14, 15, 16
  // In Category 3: 1, 2, 3, 4, 4, 5, 6, 7, 8, 9, 10, 11, 12, 12, 13, 14, 15, 16
  // In Category 4: 1 to 33
});
