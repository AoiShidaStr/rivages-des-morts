import sharp from 'sharp';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const animDir = path.join(projectDir, 'public', 'sprites', 'anim');

const PNJ_AND_ENEMIES = [
  'charon',
  'moine',
  'tanuki',
  'obaa-kiku',
  'oublie',
  'hitodama',
  'kodama',
  'kappa',
  'kappa-renforce',
  'kasa-obake',
  'araignee',
];

const BOSSES = [
  'jorogumo',
  'jorogumo-araignee',
];

async function standardizeSheet(sheetName, targetFramesPerTag) {
  const jsonPath = path.join(animDir, `${sheetName}.json`);
  const webpPath = path.join(animDir, `${sheetName}.webp`);

  let jsonRaw, webpBuf;
  try {
    jsonRaw = await fs.readFile(jsonPath, 'utf8');
    webpBuf = await fs.readFile(webpPath);
  } catch (err) {
    console.warn(`Skipping ${sheetName}: file not found`);
    return;
  }

  const sheetData = JSON.parse(jsonRaw);
  const { frames: origFrames, meta } = sheetData;
  const { width: srcW, height: srcH } = await sharp(webpBuf).metadata();
  const { data: srcRgba } = await sharp(webpBuf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });

  const tags = meta.frameTags ?? [{ name: 'idle', from: 0, to: origFrames.length - 1 }];
  const cellW = origFrames[0].frame.w;
  const cellH = origFrames[0].frame.h;

  const newFrames = [];
  const newTags = [];

  // Total new frames = tags.length * targetFramesPerTag
  const totalNewFrames = tags.length * targetFramesPerTag;
  const maxCols = Math.min(10, Math.max(4, Math.floor(4096 / cellW)));
  const cols = Math.min(totalNewFrames, maxCols);
  const rows = Math.ceil(totalNewFrames / cols);

  const outSheetW = cols * cellW;
  const outSheetH = rows * cellH;
  const outCanvas = Buffer.alloc(outSheetW * outSheetH * 4, 0);

  let curFrameIndex = 0;

  for (const tag of tags) {
    const fromIdx = tag.from;
    const toIdx = tag.to;
    const tagOrigCount = toIdx - fromIdx + 1;
    const tagOrigFrames = origFrames.slice(fromIdx, toIdx + 1);

    const totalDur = tagOrigFrames.reduce((sum, f) => sum + (f.duration || 100), 0);
    const newDur = Math.max(20, Math.round(totalDur / targetFramesPerTag));
    const isOnce = tag.repeat === '1';

    const newTagFrom = curFrameIndex;

    for (let k = 0; k < targetFramesPerTag; k++) {
      let fIdxA, fIdxB, alpha;
      if (isOnce) {
        const u = (k / (targetFramesPerTag - 1)) * (tagOrigCount - 1);
        fIdxA = Math.floor(u);
        fIdxB = Math.min(tagOrigCount - 1, fIdxA + 1);
        alpha = u - fIdxA;
      } else {
        const u = (k / targetFramesPerTag) * tagOrigCount;
        fIdxA = Math.floor(u) % tagOrigCount;
        fIdxB = (fIdxA + 1) % tagOrigCount;
        alpha = u - Math.floor(u);
      }

      const frameA = tagOrigFrames[fIdxA].frame;
      const frameB = tagOrigFrames[fIdxB].frame;

      const col = curFrameIndex % cols;
      const row = Math.floor(curFrameIndex / cols);
      const outCellX = col * cellW;
      const outCellY = row * cellH;

      const wA = 1 - alpha;
      const wB = alpha;

      for (let y = 0; y < cellH; y++) {
        const dstY = outCellY + y;
        const srcYA = frameA.y + y;
        const srcYB = frameB.y + y;

        for (let x = 0; x < cellW; x++) {
          const dstX = outCellX + x;
          const srcXA = frameA.x + x;
          const srcXB = frameB.x + x;

          const sIdxA = (srcYA * srcW + srcXA) * 4;
          const sIdxB = (srcYB * srcW + srcXB) * 4;
          const dIdx = (dstY * outSheetW + dstX) * 4;

          const aA = srcRgba[sIdxA + 3];
          const aB = srcRgba[sIdxB + 3];

          if (aA === 0 && aB === 0) continue;

          if (wA >= 0.99) {
            outCanvas[dIdx] = srcRgba[sIdxA];
            outCanvas[dIdx + 1] = srcRgba[sIdxA + 1];
            outCanvas[dIdx + 2] = srcRgba[sIdxA + 2];
            outCanvas[dIdx + 3] = aA;
          } else if (wB >= 0.99) {
            outCanvas[dIdx] = srcRgba[sIdxB];
            outCanvas[dIdx + 1] = srcRgba[sIdxB + 1];
            outCanvas[dIdx + 2] = srcRgba[sIdxB + 2];
            outCanvas[dIdx + 3] = aB;
          } else {
            const blendedA = aA * wA + aB * wB;
            if (blendedA < 2) continue;

            const r = (srcRgba[sIdxA] * aA * wA + srcRgba[sIdxB] * aB * wB) / blendedA;
            const g = (srcRgba[sIdxA + 1] * aA * wA + srcRgba[sIdxB + 1] * aB * wB) / blendedA;
            const b = (srcRgba[sIdxA + 2] * aA * wA + srcRgba[sIdxB + 2] * aB * wB) / blendedA;

            outCanvas[dIdx] = Math.round(r);
            outCanvas[dIdx + 1] = Math.round(g);
            outCanvas[dIdx + 2] = Math.round(b);
            outCanvas[dIdx + 3] = Math.round(blendedA);
          }
        }
      }

      newFrames.push({
        filename: `${tag.name} ${k}`,
        frame: { x: outCellX, y: outCellY, w: cellW, h: cellH },
        duration: newDur,
      });

      curFrameIndex++;
    }

    newTags.push({
      name: tag.name,
      from: newTagFrom,
      to: curFrameIndex - 1,
      direction: 'forward',
      ...(isOnce ? { repeat: '1' } : {}),
    });
  }

  // Write new standardized webp
  await sharp(outCanvas, { raw: { width: outSheetW, height: outSheetH, channels: 4 } })
    .webp({ lossless: true, quality: 100 })
    .toFile(webpPath);

  // Write new json metadata
  const newSheetData = {
    frames: newFrames,
    meta: {
      ...meta,
      image: `${sheetName}.webp`,
      size: { w: outSheetW, h: outSheetH },
      frameTags: newTags,
    },
  };

  await fs.writeFile(jsonPath, JSON.stringify(newSheetData, null, 1), 'utf8');
  console.log(`Standardized ${sheetName}: ${tags.length} tags x ${targetFramesPerTag} frames = ${totalNewFrames} frames (${outSheetW}x${outSheetH})`);
}

async function main() {
  console.log('Standardizing PNJ and regular enemies to 8 frames per animation...');
  for (const name of PNJ_AND_ENEMIES) {
    await standardizeSheet(name, 8);
  }

  console.log('\nStandardizing bosses to 16 frames per animation...');
  for (const name of BOSSES) {
    await standardizeSheet(name, 16);
  }

  console.log('\nAll creatures successfully standardized: 8 frames for PNJ/enemies, 16 frames for bosses!');
}

main().catch(console.error);
