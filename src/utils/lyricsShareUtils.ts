import { Song } from '../types';

export type LyricsTheme = 'navy' | 'white' | 'parchment' | 'dark';
export type LyricsCardLayout = 'dynamic' | 'story' | 'square';

export interface LyricsImageOptions {
  theme?: LyricsTheme;
  layout?: LyricsCardLayout;
  selectedText?: string; // If sharing specific verse/stanza
  includeFooterLink?: boolean;
}

/**
 * Creates clean, formatted text of the song lyrics with metadata and attribution
 */
export function generateFormattedLyricsText(song: Song, options?: { customExcerpt?: string; appUrl?: string }): string {
  const songNumber = song.song_number ? `#${song.song_number} ` : '';
  const category = song.category_name ? `[${song.category_name}]` : '';
  const lyricsBody = (options?.customExcerpt || song.lyrics || '').trim();
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://lalumierechoir.org';
  const songUrl = options?.appUrl || `${origin}?song=${encodeURIComponent(song.id)}`;

  const lines: string[] = [
    `🎶 ${songNumber}${song.title} ${category}`.trim(),
    `✨ Chorale La Lumiere • ADEPR Nyanza - Gikondo`,
    '',
    '══════════════════════════════════',
    'AMAGAMBO Y\'INDIRIMBO (HYMN LYRICS)',
    '══════════════════════════════════',
    '',
    lyricsBody || '(Nta magambo yanditse yabitswe kuri iyi ndirimbo)',
    '',
    '══════════════════════════════════',
    `📲 Soma iyi ndirimbo no muri App ya Korali:`,
    songUrl,
  ];

  return lines.join('\n');
}

/**
 * Theme configuration for Canvas drawing
 */
interface ThemeColors {
  backgroundTop: string;
  backgroundBottom: string;
  badgeBg: string;
  badgeText: string;
  titleColor: string;
  subtitleColor: string;
  lyricsColor: string;
  accentColor: string;
  borderColor: string;
  footerBg: string;
  footerText: string;
}

const THEME_PRESETS: Record<LyricsTheme, ThemeColors> = {
  navy: {
    backgroundTop: '#0c192c',
    backgroundBottom: '#070f1e',
    badgeBg: '#1e293b',
    badgeText: '#fcd34d', // amber-300
    titleColor: '#ffffff',
    subtitleColor: '#f59e0b', // amber-500
    lyricsColor: '#f1f5f9', // slate-100
    accentColor: '#f59e0b',
    borderColor: '#1e3a5f',
    footerBg: 'rgba(15, 23, 42, 0.75)',
    footerText: '#94a3b8',
  },
  white: {
    backgroundTop: '#ffffff',
    backgroundBottom: '#f8fafc',
    badgeBg: '#eff6ff',
    badgeText: '#1e3a8a', // blue-900
    titleColor: '#0f172a',
    subtitleColor: '#2563eb', // blue-600
    lyricsColor: '#334155', // slate-700
    accentColor: '#1e3a8a',
    borderColor: '#e2e8f0',
    footerBg: 'rgba(241, 245, 249, 0.8)',
    footerText: '#64748b',
  },
  parchment: {
    backgroundTop: '#faf5eb',
    backgroundBottom: '#f3ece0',
    badgeBg: '#ede0cb',
    badgeText: '#78350f', // amber-900
    titleColor: '#292524', // stone-800
    subtitleColor: '#92400e', // amber-800
    lyricsColor: '#44403c', // stone-700
    accentColor: '#b45309',
    borderColor: '#e7ddcb',
    footerBg: 'rgba(237, 224, 203, 0.7)',
    footerText: '#78716c',
  },
  dark: {
    backgroundTop: '#09090b',
    backgroundBottom: '#18181b',
    badgeBg: '#27272a',
    badgeText: '#34d399', // emerald-400
    titleColor: '#f4f4f5',
    subtitleColor: '#10b981', // emerald-500
    lyricsColor: '#e4e4e7',
    accentColor: '#10b981',
    borderColor: '#3f3f46',
    footerBg: 'rgba(24, 24, 27, 0.8)',
    footerText: '#a1a1aa',
  },
};

/**
 * Wraps text for canvas measurement
 */
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const width = ctx.measureText(testLine).width;

    if (width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

/**
 * Generates an aesthetic HTML5 Canvas card for hymn lyrics
 */
export function generateLyricsCanvas(song: Song, options: LyricsImageOptions = {}): HTMLCanvasElement {
  const theme = options.theme || 'navy';
  const layout = options.layout || 'dynamic';
  const colors = THEME_PRESETS[theme];

  const rawLyrics = (options.selectedText || song.lyrics || 'Amagambo y\'indirimbo azashyirwaho vuba.').trim();
  const rawParagraphs = rawLyrics.split(/\r?\n/);

  // Set base width (1080px is standard high-res mobile/social width)
  const width = 1080;
  const paddingX = 80;
  const contentWidth = width - paddingX * 2;

  // Temporary canvas to calculate text heights
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = width;
  const tempCtx = tempCanvas.getContext('2d');
  if (!tempCtx) {
    throw new Error('Canvas 2D context not supported');
  }

  // Pre-calculate line layouts
  const titleFontSize = 46;
  const lyricsFontSize = layout === 'story' ? 32 : 36;
  const lineHeight = lyricsFontSize * 1.55;

  tempCtx.font = `italic ${lyricsFontSize}px "Georgia", "Times New Roman", serif`;

  // Break paragraphs into wrapped lines
  const processedLines: { text: string; isBlank: boolean }[] = [];
  for (const para of rawParagraphs) {
    const trimmed = para.trim();
    if (!trimmed) {
      processedLines.push({ text: '', isBlank: true });
    } else {
      const wrapped = wrapText(tempCtx, trimmed, contentWidth);
      for (const line of wrapped) {
        processedLines.push({ text: line, isBlank: false });
      }
    }
  }

  // Calculate dynamic height or fixed layout height
  const headerHeight = 320;
  const footerHeight = 160;
  let totalLyricsHeight = 0;

  for (const item of processedLines) {
    totalLyricsHeight += item.isBlank ? lineHeight * 0.75 : lineHeight;
  }

  let height: number;
  if (layout === 'story') {
    height = 1920; // 9:16 portrait story
  } else if (layout === 'square') {
    height = 1080; // 1:1 square
  } else {
    // Dynamic height with comfortable padding
    height = Math.max(900, Math.ceil(headerHeight + totalLyricsHeight + footerHeight + 80));
  }

  // Create target canvas
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context unavailable');

  // 1. Draw Background Gradient
  const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
  bgGrad.addColorStop(0, colors.backgroundTop);
  bgGrad.addColorStop(1, colors.backgroundBottom);
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // 2. Draw Decorative Border Frame
  ctx.strokeStyle = colors.borderColor;
  ctx.lineWidth = 3;
  ctx.strokeRect(36, 36, width - 72, height - 72);

  // Subtle inner accent border corners
  ctx.strokeStyle = colors.accentColor;
  ctx.lineWidth = 2;
  const cornerSize = 28;
  const offset = 42;
  // Top-left corner
  ctx.beginPath();
  ctx.moveTo(offset, offset + cornerSize);
  ctx.lineTo(offset, offset);
  ctx.lineTo(offset + cornerSize, offset);
  ctx.stroke();
  // Top-right corner
  ctx.beginPath();
  ctx.moveTo(width - offset - cornerSize, offset);
  ctx.lineTo(width - offset, offset);
  ctx.lineTo(width - offset, offset + cornerSize);
  ctx.stroke();
  // Bottom-left corner
  ctx.beginPath();
  ctx.moveTo(offset, height - offset - cornerSize);
  ctx.lineTo(offset, height - offset);
  ctx.lineTo(offset + cornerSize, height - offset);
  ctx.stroke();
  // Bottom-right corner
  ctx.beginPath();
  ctx.moveTo(width - offset - cornerSize, height - offset);
  ctx.lineTo(width - offset, height - offset);
  ctx.lineTo(width - offset, height - offset - cornerSize);
  ctx.stroke();

  // 3. Header: Choir Brand & Badges
  let currentY = 100;

  // Choir Organization text
  ctx.fillStyle = colors.subtitleColor;
  ctx.font = 'bold 22px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.letterSpacing = '3px';
  ctx.fillText('CHORALE LA LUMIERE • ADEPR NYANZA', width / 2, currentY);
  ctx.letterSpacing = '0px';

  currentY += 45;

  // Metadata Badges (Song Number + Category)
  const badges: string[] = [];
  if (song.song_number) badges.push(`Indirimbo #${song.song_number}`);
  if (song.category_name) badges.push(song.category_name);

  if (badges.length > 0) {
    const badgeText = badges.join('  •  ').toUpperCase();
    ctx.font = 'bold 20px system-ui, -apple-system, sans-serif';
    const bWidth = ctx.measureText(badgeText).width + 36;
    const bHeight = 36;

    ctx.fillStyle = colors.badgeBg;
    ctx.beginPath();
    ctx.roundRect((width - bWidth) / 2, currentY - 24, bWidth, bHeight, 18);
    ctx.fill();

    ctx.fillStyle = colors.badgeText;
    ctx.fillText(badgeText, width / 2, currentY);
    currentY += 50;
  } else {
    currentY += 20;
  }

  // Song Title
  ctx.fillStyle = colors.titleColor;
  ctx.font = `bold ${titleFontSize}px system-ui, -apple-system, "Segoe UI", sans-serif`;
  ctx.textAlign = 'center';

  const titleLines = wrapText(ctx, song.title.toUpperCase(), contentWidth);
  for (const tLine of titleLines) {
    ctx.fillText(tLine, width / 2, currentY);
    currentY += titleFontSize * 1.25;
  }

  // Divider Line
  currentY += 15;
  ctx.strokeStyle = colors.accentColor;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(width / 2 - 140, currentY);
  ctx.lineTo(width / 2 + 140, currentY);
  ctx.stroke();

  // Musical note icon representation in middle of divider
  ctx.fillStyle = colors.accentColor;
  ctx.font = 'bold 24px serif';
  ctx.fillText('♪ ♫ ♪', width / 2, currentY - 8);

  currentY += 45;

  // 4. Lyrics Body
  ctx.fillStyle = colors.lyricsColor;
  ctx.font = `italic ${lyricsFontSize}px "Georgia", "Times New Roman", serif`;
  ctx.textAlign = 'center';

  // Available height bounds
  const lyricsEndY = height - footerHeight;

  for (const line of processedLines) {
    if (currentY > lyricsEndY - 40) {
      // If fixed layout overflow (like 1:1 square), add ellipsis note
      ctx.fillStyle = colors.subtitleColor;
      ctx.font = 'italic bold 24px system-ui, sans-serif';
      ctx.fillText('... (Komeza amagambo yose muri App ya Korali)', width / 2, currentY);
      break;
    }

    if (line.isBlank) {
      currentY += lineHeight * 0.75;
    } else {
      ctx.fillText(line.text, width / 2, currentY);
      currentY += lineHeight;
    }
  }

  // 5. Footer Attributions
  const footerY = height - 70;

  // Subtle separator above footer
  ctx.strokeStyle = colors.borderColor;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(paddingX, height - 120);
  ctx.lineTo(width - paddingX, height - 120);
  ctx.stroke();

  // Choir signature & app link
  ctx.fillStyle = colors.footerText;
  ctx.font = '19px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('La Lumiere Choir Hymnal App • Gikondo, Kigali, Rwanda', width / 2, footerY - 14);

  ctx.fillStyle = colors.accentColor;
  ctx.font = 'bold 18px system-ui, -apple-system, sans-serif';
  ctx.fillText('Soma & Ririmba indirimbo zose kuri: lalumierechoir.org', width / 2, footerY + 14);

  return canvas;
}

/**
 * Converts canvas to PNG Blob
 */
export async function generateLyricsImageBlob(song: Song, options: LyricsImageOptions = {}): Promise<Blob> {
  const canvas = generateLyricsCanvas(song, options);
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(blob => {
      if (blob) resolve(blob);
      else reject(new Error('Failed to create PNG blob from canvas'));
    }, 'image/png');
  });
}

/**
 * Converts canvas to a File object ready for native sharing
 */
export async function generateLyricsImageFile(song: Song, options: LyricsImageOptions = {}): Promise<File> {
  const blob = await generateLyricsImageBlob(song, options);
  const cleanTitle = song.title.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
  const filename = `${cleanTitle}_la_lumiere_lyrics.png`;
  return new File([blob], filename, { type: 'image/png' });
}

/**
 * Direct download of the generated PNG card
 */
export async function downloadLyricsImage(song: Song, options: LyricsImageOptions = {}): Promise<void> {
  const blob = await generateLyricsImageBlob(song, options);
  const cleanTitle = song.title.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
  const filename = `${cleanTitle}_la_lumiere_lyrics.png`;
  const url = URL.createObjectURL(blob);

  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Copies the PNG image directly to clipboard
 */
export async function copyLyricsImageToClipboard(song: Song, options: LyricsImageOptions = {}): Promise<boolean> {
  try {
    const blob = await generateLyricsImageBlob(song, options);
    if (navigator.clipboard && typeof ClipboardItem !== 'undefined') {
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob }),
      ]);
      return true;
    }
  } catch (err) {
    console.warn('Clipboard write image failed:', err);
  }
  return false;
}

/**
 * Native sharing function for Lyrics as Formatted Text
 */
export async function shareLyricsAsText(
  song: Song,
  options?: { customExcerpt?: string }
): Promise<{ sharedViaNative: boolean; copied: boolean }> {
  const formattedText = generateFormattedLyricsText(song, options);
  const shareTitle = `${song.song_number ? `#${song.song_number} ` : ''}${song.title} - La Lumiere Choir`;

  // 1. Try native Web Share API
  if (navigator.share) {
    try {
      await navigator.share({
        title: shareTitle,
        text: formattedText,
      });
      return { sharedViaNative: true, copied: false };
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return { sharedViaNative: true, copied: false };
      }
      console.warn('Native text share failed, falling back to clipboard:', err);
    }
  }

  // 2. Fallback to clipboard
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(formattedText);
      return { sharedViaNative: false, copied: true };
    }
  } catch (clipErr) {
    console.warn('Clipboard writeText failed:', clipErr);
  }

  return { sharedViaNative: false, copied: false };
}

/**
 * Native sharing function for Lyrics as PNG Image
 */
export async function shareLyricsAsImage(
  song: Song,
  options: LyricsImageOptions = {}
): Promise<{ sharedViaNative: boolean; downloaded: boolean }> {
  try {
    const file = await generateLyricsImageFile(song, options);

    // Test native share sheet with file support
    if (
      navigator.share &&
      navigator.canShare &&
      navigator.canShare({ files: [file] })
    ) {
      try {
        await navigator.share({
          files: [file],
          title: `${song.title} - Chorale La Lumiere Lyrics`,
          text: `Amagambo y'indirimbo "${song.title}" - Korali La Lumiere (ADEPR Nyanza)`,
        });
        return { sharedViaNative: true, downloaded: false };
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          return { sharedViaNative: true, downloaded: false };
        }
        console.warn('File share aborted or failed:', err);
      }
    }

    // Fallback: direct download of PNG
    await downloadLyricsImage(song, options);
    return { sharedViaNative: false, downloaded: true };
  } catch (err) {
    console.error('Share lyrics as image error:', err);
    throw err;
  }
}
