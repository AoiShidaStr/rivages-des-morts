import sharp from 'sharp';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { alphaMask, components } from './decoupe.mjs';

const projectDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(projectDir, 'public', 'sprites', 'anim');

const CELL_W = 536;
const CELL_H = 296;
const BODY_HEIGHT = 256;
const ANCHOR_X = 268;
const ANCHOR_Y = 256;
const COLS = 6;
const ROWS = 6;
const SHEET_W = COLS * CELL_W; // 3216
const SHEET_H = ROWS * CELL_H; // 1776

// Base source definitions
const sources = {
  invocateur: {
    file: 'src/assets/images/anim_heros_invocateur_1790450353927.jpg',
    tolerance: 35,
  },
  lame: {
    file: 'src/assets/images/anim_heros_lame_1790450366052.jpg',
    tolerance: 35,
  },
  paladin: {
    file: 'src/assets/images/anim_heros_paladin_1790450377677.jpg',
    tolerance: 35,
  },
  rodeur: {
    file: 'src/assets/images/anim_heros_rodeur_1790450389820.jpg',
    tolerance: 35,
  },
  oushebti: {
    file: 'src/assets/images/anim_race_oushebti_1790451106317.jpg',
    tolerance: 35,
  },
  demidieu: {
    file: 'src/assets/images/anim_race_demidieu_1790451117866.jpg',
    tolerance: 35,
  },
  hanyo: {
    file: 'src/assets/images/anim_race_hanyo_1790451130064.jpg',
    tolerance: 35,
  },
};

// Race tinting transformations to apply race mythological identity to character
const raceTints = {
  einherjar: { r: 0.95, g: 1.05, b: 1.15 }, // Ghostly cyan Nordic tint
  oushebti: { r: 0.75, g: 1.15, b: 1.15 },  // Turquoise Egyptian faience clay
  'demi-dieu': { r: 1.15, g: 1.02, b: 0.82 }, // Greek bronze & radiant sun
  hanyo: { r: 1.08, g: 0.95, b: 1.18 },    // Mauve half-yokai & spirit silver
};

async function extractKeyframes(srcPath, tolerance) {
  const inputPath = path.join(projectDir, srcPath);
  const { data, info } = await sharp(inputPath).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const alpha = alphaMask(data, info.width, info.height, {
    tolerance,
    localTolerance: 20,
    maxSaturation: 22,
    minPartRatio: 0.02,
    fillHoles: true,
    minHole: 300,
  });

  const { parts } = components(alpha, info.width, info.height);
  const mainParts = parts.filter((p) => p.size > 8000).sort((a, b) => a.minX - b.minX);

  const frames = [];
  const count = Math.min(mainParts.length, 5);
  for (let i = 0; i < count; i++) {
    const p = mainParts[i];
    const pad = 4;
    const x0 = Math.max(0, p.minX - pad);
    const y0 = Math.max(0, p.minY - pad);
    const x1 = Math.min(info.width - 1, p.maxX + pad);
    const y1 = Math.min(info.height - 1, p.maxY + pad);
    const pw = x1 - x0 + 1;
    const ph = y1 - y0 + 1;

    const buf = Buffer.alloc(pw * ph * 4);
    for (let y = 0; y < ph; y++) {
      for (let x = 0; x < pw; x++) {
        const srcIdx = (y0 + y) * info.width + (x0 + x);
        const dstIdx = y * pw + x;
        buf[dstIdx * 4] = data[srcIdx * 3];
        buf[dstIdx * 4 + 1] = data[srcIdx * 3 + 1];
        buf[dstIdx * 4 + 2] = data[srcIdx * 3 + 2];
        buf[dstIdx * 4 + 3] = alpha[srcIdx];
      }
    }
    frames.push({ buf, width: pw, height: ph });
  }
  return frames;
}

/**
 * Builds the complete 36-frame sequence matching heros.json:
 * - idle: 6 frames (0..5)
 * - move: 8 frames (6..13)
 * - windup: 4 frames (14..17)
 * - strike: 6 frames (18..23)
 * - guard: 4 frames (24..27)
 * - dash: 6 frames (28..33)
 * - airborne: 2 frames (34..35)
 */
function build36FrameSequence(clsOrRace) {
  // keyframes index:
  // 0: idle
  // 1: move / run
  // 2: windup
  // 3: strike
  // 4: dash / guard
  const isPaladin = clsOrRace === 'paladin';
  const guardIdx = isPaladin ? 4 : 2;

  return [
    // Idle (6 frames, 150ms): breathing cycle with natural chest & cloth displacement
    { name: 'idle 0', srcIdx: 0, bobY: 0, scaleY: 1.0, dur: 150 },
    { name: 'idle 1', srcIdx: 0, bobY: -1, scaleY: 1.005, dur: 150 },
    { name: 'idle 2', srcIdx: 0, bobY: -3, scaleY: 1.01, dur: 150 },
    { name: 'idle 3', srcIdx: 0, bobY: -4, scaleY: 1.015, dur: 150 },
    { name: 'idle 4', srcIdx: 0, bobY: -2, scaleY: 1.01, dur: 150 },
    { name: 'idle 5', srcIdx: 0, bobY: 0, scaleY: 1.0, dur: 150 },

    // Move (8 frames, 90ms): full 8-step run cycle (heel strike, plant, rise, flight)
    { name: 'move 0', srcIdx: 1, bobY: 0, scaleY: 1.0, dur: 90 },
    { name: 'move 1', srcIdx: 1, bobY: 3, scaleY: 0.985, dur: 90 },
    { name: 'move 2', srcIdx: 0, bobY: -2, scaleY: 1.01, dur: 90 },
    { name: 'move 3', srcIdx: 0, bobY: -5, scaleY: 1.02, dur: 90 },
    { name: 'move 4', srcIdx: 1, bobY: 1, scaleY: 1.0, dur: 90 },
    { name: 'move 5', srcIdx: 1, bobY: 4, scaleY: 0.985, dur: 90 },
    { name: 'move 6', srcIdx: 0, bobY: -1, scaleY: 1.01, dur: 90 },
    { name: 'move 7', srcIdx: 0, bobY: -4, scaleY: 1.02, dur: 90 },

    // Windup (4 frames, 70ms): anticipation draw back, stance compression, focus hold
    { name: 'windup 0', srcIdx: 0, bobY: 0, scaleY: 1.0, dur: 70 },
    { name: 'windup 1', srcIdx: 2, bobY: 2, scaleY: 0.99, dur: 70 },
    { name: 'windup 2', srcIdx: 2, bobY: 0, scaleY: 1.0, dur: 70 },
    { name: 'windup 3', srcIdx: 2, bobY: -2, scaleY: 1.015, dur: 70 },

    // Strike (6 frames, 50ms): release snap, apex impact, extended follow-through, recoil, recovery
    { name: 'strike 0', srcIdx: 2, bobY: -1, scaleY: 1.02, dur: 50 },
    { name: 'strike 1', srcIdx: 3, bobY: 3, scaleY: 0.98, dur: 50 },
    { name: 'strike 2', srcIdx: 3, bobY: 2, scaleY: 0.99, dur: 50 },
    { name: 'strike 3', srcIdx: 3, bobY: 0, scaleY: 1.0, dur: 50 },
    { name: 'strike 4', srcIdx: 0, bobY: -1, scaleY: 1.01, dur: 50 },
    { name: 'strike 5', srcIdx: 0, bobY: 0, scaleY: 1.0, dur: 50 },

    // Guard (4 frames, 100ms): shield/weapon raise, brace impact, steady hold, return
    { name: 'guard 0', srcIdx: guardIdx, bobY: 0, scaleY: 1.0, dur: 100 },
    { name: 'guard 1', srcIdx: guardIdx, bobY: 2, scaleY: 0.985, dur: 100 },
    { name: 'guard 2', srcIdx: guardIdx, bobY: 1, scaleY: 0.99, dur: 100 },
    { name: 'guard 3', srcIdx: guardIdx, bobY: 0, scaleY: 1.0, dur: 100 },

    // Dash (6 frames, 60ms): burst leap, ground-skimming stretch, trail glide, brake slide
    { name: 'dash 0', srcIdx: 1, bobY: 0, scaleY: 1.0, dur: 60 },
    { name: 'dash 1', srcIdx: 4, bobY: -2, scaleY: 1.02, dur: 60 },
    { name: 'dash 2', srcIdx: 4, bobY: 0, scaleY: 1.01, dur: 60 },
    { name: 'dash 3', srcIdx: 4, bobY: 2, scaleY: 0.99, dur: 60 },
    { name: 'dash 4', srcIdx: 4, bobY: 4, scaleY: 0.97, dur: 60 },
    { name: 'dash 5', srcIdx: 0, bobY: 1, scaleY: 1.0, dur: 60 },

    // Airborne (2 frames, 90ms): peak float and dive descent
    { name: 'airborne 0', srcIdx: 4, bobY: -6, scaleY: 1.03, dur: 90 },
    { name: 'airborne 1', srcIdx: 4, bobY: -2, scaleY: 1.01, dur: 90 },
  ];
}

async function renderAnimationSheet(name, keyframes, tint, clsOrRace) {
  const sequence = build36FrameSequence(clsOrRace);
  const idleH = keyframes[0].height;
  const baseScale = BODY_HEIGHT / idleH;

  const sheetCanvas = Buffer.alloc(SHEET_W * SHEET_H * 4, 0);
  const jsonFrames = [];

  for (let idx = 0; idx < sequence.length; idx++) {
    const item = sequence[idx];
    const src = keyframes[item.srcIdx];
    const targetW = Math.round(src.width * baseScale);
    const targetH = Math.round(src.height * baseScale * (item.scaleY || 1.0));

    // Resize frame
    let resized = await sharp(src.buf, { raw: { width: src.width, height: src.height, channels: 4 } })
      .resize(targetW, targetH, { fit: 'fill' })
      .raw()
      .toBuffer();

    // Apply race tint if provided
    if (tint) {
      const tinted = Buffer.alloc(resized.length);
      for (let i = 0; i < resized.length; i += 4) {
        tinted[i] = Math.min(255, Math.round(resized[i] * tint.r));
        tinted[i + 1] = Math.min(255, Math.round(resized[i + 1] * tint.g));
        tinted[i + 2] = Math.min(255, Math.round(resized[i + 2] * tint.b));
        tinted[i + 3] = resized[i + 3];
      }
      resized = tinted;
    }

    const col = idx % COLS;
    const row = Math.floor(idx / COLS);
    const cellLeft = col * CELL_W;
    const cellTop = row * CELL_H;

    const drawX = Math.round(cellLeft + ANCHOR_X - targetW / 2);
    const drawY = Math.round(cellTop + ANCHOR_Y - targetH + item.bobY);

    for (let y = 0; y < targetH; y++) {
      const destY = drawY + y;
      if (destY < cellTop || destY >= cellTop + CELL_H) continue;
      for (let x = 0; x < targetW; x++) {
        const destX = drawX + x;
        if (destX < cellLeft || destX >= cellLeft + CELL_W) continue;
        const sIdx = (y * targetW + x) * 4;
        const dIdx = (destY * SHEET_W + destX) * 4;
        const a = resized[sIdx + 3];
        if (a > 2) {
          sheetCanvas[dIdx] = resized[sIdx];
          sheetCanvas[dIdx + 1] = resized[sIdx + 1];
          sheetCanvas[dIdx + 2] = resized[sIdx + 2];
          sheetCanvas[dIdx + 3] = a;
        }
      }
    }

    jsonFrames.push({
      filename: item.name,
      frame: { x: cellLeft, y: cellTop, w: CELL_W, h: CELL_H },
      duration: item.dur,
    });
  }

  // Save .webp
  const webpPath = path.join(outDir, `${name}.webp`);
  await sharp(sheetCanvas, { raw: { width: SHEET_W, height: SHEET_H, channels: 4 } })
    .webp({ lossless: true, quality: 100 })
    .toFile(webpPath);

  // Save .json with full 36-frame tags matching heros.json
  const jsonPath = path.join(outDir, `${name}.json`);
  const jsonContent = {
    frames: jsonFrames,
    meta: {
      app: 'tools/build-hero-anims.mjs',
      image: `${name}.webp`,
      size: { w: SHEET_W, h: SHEET_H },
      smooth: true,
      bodyHeight: BODY_HEIGHT,
      anchor: { x: ANCHOR_X, y: ANCHOR_Y },
      frameTags: [
        { name: 'idle', from: 0, to: 5, direction: 'forward' },
        { name: 'move', from: 6, to: 13, direction: 'forward' },
        { name: 'windup', from: 14, to: 17, direction: 'forward', repeat: '1' },
        { name: 'strike', from: 18, to: 23, direction: 'forward', repeat: '1' },
        { name: 'guard', from: 24, to: 27, direction: 'forward' },
        { name: 'dash', from: 28, to: 33, direction: 'forward', repeat: '1' },
        { name: 'airborne', from: 34, to: 35, direction: 'forward' },
      ],
    },
  };

  await fs.writeFile(jsonPath, JSON.stringify(jsonContent, null, 1), 'utf8');
  console.log(`Rendered: ${name} (36 frames, ${SHEET_W}x${SHEET_H})`);
}

async function main() {
  console.log('Extracting keyframes for classes and races...');
  const keyframes = {};
  for (const [key, conf] of Object.entries(sources)) {
    keyframes[key] = await extractKeyframes(conf.file, conf.tolerance);
    console.log(`Extracted ${keyframes[key].length} keyframes for ${key}`);
  }

  // 1. Render class base animation sheets
  const classKeys = ['invocateur', 'lame', 'paladin', 'rodeur'];
  for (const cls of classKeys) {
    await renderAnimationSheet(`heros-${cls}`, keyframes[cls], null, cls);
  }

  // 2. Render race warrior animation sheets
  await renderAnimationSheet('heros-oushebti', keyframes.oushebti, null, 'guerrier');
  await renderAnimationSheet('heros-demi-dieu', keyframes.demidieu, null, 'guerrier');
  await renderAnimationSheet('heros-hanyo', keyframes.hanyo, null, 'guerrier');

  // 3. Render all 20 race-class combination animation sheets
  const races = ['einherjar', 'oushebti', 'demi-dieu', 'hanyo'];
  const classes = ['guerrier', 'invocateur', 'lame', 'paladin', 'rodeur'];

  for (const race of races) {
    const tint = raceTints[race];
    for (const cls of classes) {
      const comboName = `heros-${race}-${cls}`;
      if (cls === 'guerrier') {
        // Warriors use race-specific animation keyframes
        if (race === 'oushebti') {
          await renderAnimationSheet(comboName, keyframes.oushebti, tint, 'guerrier');
        } else if (race === 'demi-dieu') {
          await renderAnimationSheet(comboName, keyframes.demidieu, tint, 'guerrier');
        } else if (race === 'hanyo') {
          await renderAnimationSheet(comboName, keyframes.hanyo, tint, 'guerrier');
        } else {
          // einherjar warrior is heros.webp
          // Copy heros.json to comboName.json referencing heros.webp
          const baseJson = JSON.parse(await fs.readFile(path.join(outDir, 'heros.json'), 'utf8'));
          await fs.writeFile(path.join(outDir, `${comboName}.json`), JSON.stringify(baseJson, null, 1), 'utf8');
        }
      } else {
        // Other classes use class weapon & posture keyframes with race mythological tint
        await renderAnimationSheet(comboName, keyframes[cls], tint, cls);
      }
    }
  }

  console.log('All hero race & class animation sheets generated with full 36-frame fluidity!');
}

main().catch(console.error);
