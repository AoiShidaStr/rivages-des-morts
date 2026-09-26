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
const COLS = 7; // Max sheet width 7 * 536 = 3752 < 4096

/**
 * Extracts and normalizes keyframes:
 * Finds the ground baseline (bottom of feet) and horizontal center (torso median) for each keyframe.
 */
export async function loadKeyframesWithLandmarks(srcPath, tolerance = 35) {
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
  const count = Math.min(mainParts.length, 5);

  const frames = [];
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
    let bottomY = 0;
    const xs = [];

    for (let y = 0; y < ph; y++) {
      for (let x = 0; x < pw; x++) {
        const srcIdx = (y0 + y) * info.width + (x0 + x);
        const dstIdx = y * pw + x;
        const a = alpha[srcIdx];
        buf[dstIdx * 4] = data[srcIdx * 3];
        buf[dstIdx * 4 + 1] = data[srcIdx * 3 + 1];
        buf[dstIdx * 4 + 2] = data[srcIdx * 3 + 2];
        buf[dstIdx * 4 + 3] = a;

        if (a > 60) {
          if (y > bottomY) bottomY = y;
          // Sample torso region for horizontal anchor
          if (y > ph * 0.25 && y < ph * 0.75) {
            xs.push(x);
          }
        }
      }
    }

    xs.sort((a, b) => a - b);
    const medianX = xs.length > 0 ? xs[Math.floor(xs.length / 2)] : Math.floor(pw / 2);

    frames.push({
      buf,
      width: pw,
      height: ph,
      baselineY: bottomY,
      anchorX: medianX,
    });
  }

  // Reference height is measured from frame 0 (idle) from top to baseline
  const refHeight = frames[0].baselineY;
  const globalScale = BODY_HEIGHT / Math.max(100, refHeight);

  // Pre-render scaled keyframes onto normalized CELL_W x CELL_H buffers with feet locked to (ANCHOR_X, ANCHOR_Y)
  const normalizedKeyframes = [];
  for (const f of frames) {
    const sw = Math.round(f.width * globalScale);
    const sh = Math.round(f.height * globalScale);
    const scaledBuf = await sharp(f.buf, { raw: { width: f.width, height: f.height, channels: 4 } })
      .resize(sw, sh, { fit: 'fill' })
      .raw()
      .toBuffer();

    const scaledAnchorX = Math.round(f.anchorX * globalScale);
    const scaledBaselineY = Math.round(f.baselineY * globalScale);

    const cellBuf = Buffer.alloc(CELL_W * CELL_H * 4, 0);
    const originX = ANCHOR_X - scaledAnchorX;
    const originY = ANCHOR_Y - scaledBaselineY;

    for (let y = 0; y < sh; y++) {
      const destY = originY + y;
      if (destY < 0 || destY >= CELL_H) continue;
      for (let x = 0; x < sw; x++) {
        const destX = originX + x;
        if (destX < 0 || destX >= CELL_W) continue;
        const sIdx = (y * sw + x) * 4;
        const dIdx = (destY * CELL_W + destX) * 4;
        const a = scaledBuf[sIdx + 3];
        if (a > 2) {
          cellBuf[dIdx] = scaledBuf[sIdx];
          cellBuf[dIdx + 1] = scaledBuf[sIdx + 1];
          cellBuf[dIdx + 2] = scaledBuf[sIdx + 2];
          cellBuf[dIdx + 3] = a;
        }
      }
    }
    normalizedKeyframes.push(cellBuf);
  }

  return normalizedKeyframes;
}

/**
 * Generates an interpolated frame between cell A and cell B with weight alpha [0..1] and vertical offset bobY
 */
function interpolateCell(cellA, cellB, alpha, bobY = 0, tint = null) {
  const out = Buffer.alloc(CELL_W * CELL_H * 4, 0);
  const wA = 1 - alpha;
  const wB = alpha;

  const tr = tint?.r ?? 1.0;
  const tg = tint?.g ?? 1.0;
  const tb = tint?.b ?? 1.0;

  for (let y = 0; y < CELL_H; y++) {
    const destY = y + bobY;
    if (destY < 0 || destY >= CELL_H) continue;

    for (let x = 0; x < CELL_W; x++) {
      const dIdx = (destY * CELL_W + x) * 4;
      const sIdx = (y * CELL_W + x) * 4;

      const aA = cellA[sIdx + 3];
      const aB = cellB[sIdx + 3];

      if (aA === 0 && aB === 0) continue;

      if (wA >= 0.99) {
        out[dIdx] = Math.min(255, Math.round(cellA[sIdx] * tr));
        out[dIdx + 1] = Math.min(255, Math.round(cellA[sIdx + 1] * tg));
        out[dIdx + 2] = Math.min(255, Math.round(cellA[sIdx + 2] * tb));
        out[dIdx + 3] = aA;
      } else if (wB >= 0.99) {
        out[dIdx] = Math.min(255, Math.round(cellB[sIdx] * tr));
        out[dIdx + 1] = Math.min(255, Math.round(cellB[sIdx + 1] * tg));
        out[dIdx + 2] = Math.min(255, Math.round(cellB[sIdx + 2] * tb));
        out[dIdx + 3] = aB;
      } else {
        const blendedAlpha = aA * wA + aB * wB;
        if (blendedAlpha < 2) continue;

        const r = (cellA[sIdx] * aA * wA + cellB[sIdx] * aB * wB) / blendedAlpha;
        const g = (cellA[sIdx + 1] * aA * wA + cellB[sIdx + 1] * aB * wB) / blendedAlpha;
        const b = (cellA[sIdx + 2] * aA * wA + cellB[sIdx + 2] * aB * wB) / blendedAlpha;

        out[dIdx] = Math.min(255, Math.round(r * tr));
        out[dIdx + 1] = Math.min(255, Math.round(g * tg));
        out[dIdx + 2] = Math.min(255, Math.round(b * tb));
        out[dIdx + 3] = Math.min(255, Math.round(blendedAlpha));
      }
    }
  }
  return out;
}

/**
 * Builds the full 16-frame arrays for all 7 hero animation tags:
 * Total: 16 * 7 = 112 frames!
 */
export function build16FrameHeroSequence(kfs, tint = null) {
  // Keyframes:
  // 0: Idle
  // 1: Move / Stride
  // 2: Windup
  // 3: Strike
  // 4: Dash / Guard
  const k0 = kfs[0];
  const k1 = kfs[1] || k0;
  const k2 = kfs[2] || k0;
  const k3 = kfs[3] || k0;
  const k4 = kfs[4] || k2;

  const frames = [];

  // 1. IDLE (16 frames, 75ms each) - Smooth continuous breathing cycle
  for (let i = 0; i < 16; i++) {
    const progress = i / 16;
    const sinVal = Math.sin(progress * Math.PI * 2);
    // Micro-bobbing: -3px at peak inhale, 0px at exhale
    const bobY = Math.round(-3 * Math.max(0, sinVal));
    const cell = interpolateCell(k0, k0, 0, bobY, tint);
    frames.push({ tag: 'idle', index: i, cell, duration: 75 });
  }

  // 2. MOVE (16 frames, 50ms each) - 16-frame full run locomotion cycle
  for (let i = 0; i < 16; i++) {
    let cell;
    const bobY = Math.round(-2 * Math.sin((i / 8) * Math.PI * 2));
    if (i < 4) {
      // 0..3: k0 -> k1
      const t = i / 4;
      cell = interpolateCell(k0, k1, t, bobY, tint);
    } else if (i < 8) {
      // 4..7: k1 -> k0
      const t = (i - 4) / 4;
      cell = interpolateCell(k1, k0, t, bobY, tint);
    } else if (i < 12) {
      // 8..11: k0 -> k1 (second stride phase)
      const t = (i - 8) / 4;
      cell = interpolateCell(k0, k1, t, bobY, tint);
    } else {
      // 12..15: k1 -> k0
      const t = (i - 12) / 4;
      cell = interpolateCell(k1, k0, t, bobY, tint);
    }
    frames.push({ tag: 'move', index: i, cell, duration: 50 });
  }

  // 3. WINDUP (16 frames, 35ms each) - Smooth preparation & muscle tension
  for (let i = 0; i < 16; i++) {
    let cell;
    if (i < 6) {
      const t = i / 6;
      cell = interpolateCell(k0, k2, t, 0, tint);
    } else if (i < 12) {
      const t = (i - 6) / 6;
      const bobY = Math.round(-1 * Math.sin(t * Math.PI));
      cell = interpolateCell(k2, k2, 0, bobY, tint);
    } else {
      cell = interpolateCell(k2, k2, 0, -1, tint);
    }
    frames.push({ tag: 'windup', index: i, cell, duration: 35 });
  }

  // 4. STRIKE (16 frames, 30ms each) - Instant snap release, impact, recovery
  for (let i = 0; i < 16; i++) {
    let cell;
    if (i < 3) {
      // Instant release snap
      const t = i / 3;
      cell = interpolateCell(k2, k3, t, 0, tint);
    } else if (i < 8) {
      // Impact hold & follow-through
      cell = interpolateCell(k3, k3, 0, 0, tint);
    } else if (i < 12) {
      // Deceleration
      const t = (i - 8) / 4;
      cell = interpolateCell(k3, k0, t * 0.6, 0, tint);
    } else {
      // Smooth reset to ready
      const t = (i - 12) / 4;
      cell = interpolateCell(k3, k0, 0.6 + t * 0.4, 0, tint);
    }
    frames.push({ tag: 'strike', index: i, cell, duration: 30 });
  }

  // 5. GUARD (16 frames, 40ms each) - Shield/weapon raised, solid brace
  for (let i = 0; i < 16; i++) {
    let cell;
    if (i < 4) {
      const t = i / 4;
      cell = interpolateCell(k0, k4, t, 0, tint);
    } else if (i < 12) {
      const bobY = Math.round(-1 * Math.sin(((i - 4) / 8) * Math.PI * 2));
      cell = interpolateCell(k4, k4, 0, bobY, tint);
    } else {
      const t = (i - 12) / 4;
      cell = interpolateCell(k4, k0, t, 0, tint);
    }
    frames.push({ tag: 'guard', index: i, cell, duration: 40 });
  }

  // 6. DASH (16 frames, 22ms each) - Explosive dash glide, trail, deceleration
  for (let i = 0; i < 16; i++) {
    let cell;
    if (i < 3) {
      const t = i / 3;
      cell = interpolateCell(k0, k4, t, 0, tint);
    } else if (i < 10) {
      cell = interpolateCell(k4, k4, 0, 0, tint);
    } else if (i < 13) {
      const t = (i - 10) / 3;
      cell = interpolateCell(k4, k1, t, 0, tint);
    } else {
      const t = (i - 13) / 3;
      cell = interpolateCell(k1, k0, t, 0, tint);
    }
    frames.push({ tag: 'dash', index: i, cell, duration: 22 });
  }

  // 7. AIRBORNE (16 frames, 40ms each) - Leap apex and descent
  for (let i = 0; i < 16; i++) {
    let cell;
    const jumpY = Math.round(-6 * Math.sin((i / 16) * Math.PI));
    if (i < 8) {
      const t = i / 8;
      cell = interpolateCell(k4, k1, t, jumpY, tint);
    } else {
      const t = (i - 8) / 8;
      cell = interpolateCell(k1, k4, t, jumpY, tint);
    }
    frames.push({ tag: 'airborne', index: i, cell, duration: 40 });
  }

  return frames;
}

/**
 * Assembles the 112 cells into a WebP sheet and JSON metadata
 */
export async function write16FrameSheet(name, frames) {
  const totalFrames = frames.length; // 112
  const cols = COLS; // 7
  const rows = Math.ceil(totalFrames / cols); // 16
  const sheetW = cols * CELL_W; // 3752
  const sheetH = rows * CELL_H; // 4736

  const canvas = Buffer.alloc(sheetW * sheetH * 4, 0);
  const jsonFrames = [];

  for (let i = 0; i < totalFrames; i++) {
    const f = frames[i];
    const col = i % cols;
    const row = Math.floor(i / cols);
    const cellLeft = col * CELL_W;
    const cellTop = row * CELL_H;

    // Blit cell onto canvas
    for (let y = 0; y < CELL_H; y++) {
      const destY = cellTop + y;
      for (let x = 0; x < CELL_W; x++) {
        const destX = cellLeft + x;
        const sIdx = (y * CELL_W + x) * 4;
        const dIdx = (destY * sheetW + destX) * 4;
        const a = f.cell[sIdx + 3];
        if (a > 0) {
          canvas[dIdx] = f.cell[sIdx];
          canvas[dIdx + 1] = f.cell[sIdx + 1];
          canvas[dIdx + 2] = f.cell[sIdx + 2];
          canvas[dIdx + 3] = a;
        }
      }
    }

    jsonFrames.push({
      filename: `${f.tag} ${f.index}`,
      frame: { x: cellLeft, y: cellTop, w: CELL_W, h: CELL_H },
      duration: f.duration,
    });
  }

  const webpPath = path.join(outDir, `${name}.webp`);
  await sharp(canvas, { raw: { width: sheetW, height: sheetH, channels: 4 } })
    .webp({ lossless: true, quality: 100 })
    .toFile(webpPath);

  const jsonPath = path.join(outDir, `${name}.json`);
  const jsonContent = {
    frames: jsonFrames,
    meta: {
      app: 'tools/build-16frame-anims.mjs',
      image: `${name}.webp`,
      size: { w: sheetW, h: sheetH },
      smooth: true,
      bodyHeight: BODY_HEIGHT,
      anchor: { x: ANCHOR_X, y: ANCHOR_Y },
      frameTags: [
        { name: 'idle', from: 0, to: 15, direction: 'forward' },
        { name: 'move', from: 16, to: 31, direction: 'forward' },
        { name: 'windup', from: 32, to: 47, direction: 'forward', repeat: '1' },
        { name: 'strike', from: 48, to: 63, direction: 'forward', repeat: '1' },
        { name: 'guard', from: 64, to: 79, direction: 'forward' },
        { name: 'dash', from: 80, to: 95, direction: 'forward', repeat: '1' },
        { name: 'airborne', from: 96, to: 111, direction: 'forward' },
      ],
    },
  };

  await fs.writeFile(jsonPath, JSON.stringify(jsonContent, null, 1), 'utf8');
  console.log(`Saved 16-frame sheet: ${name} (${totalFrames} frames, ${sheetW}x${sheetH})`);
}
