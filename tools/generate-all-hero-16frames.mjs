import { loadKeyframesWithLandmarks, build16FrameHeroSequence, write16FrameSheet } from './build-16frame-anims.mjs';

const sources = {
  invocateur: 'src/assets/images/anim_heros_invocateur_1790450353927.jpg',
  lame: 'src/assets/images/anim_heros_lame_1790450366052.jpg',
  paladin: 'src/assets/images/anim_heros_paladin_1790450377677.jpg',
  rodeur: 'src/assets/images/anim_heros_rodeur_1790450389820.jpg',
  oushebti: 'src/assets/images/anim_race_oushebti_1790451106317.jpg',
  demidieu: 'src/assets/images/anim_race_demidieu_1790451117866.jpg',
  hanyo: 'src/assets/images/anim_race_hanyo_1790451130064.jpg',
};

// Subtle color tints matching each race's mythology
const raceTints = {
  einherjar: { r: 0.96, g: 1.04, b: 1.14 }, // Nordic spectral cyan
  oushebti: { r: 0.72, g: 1.15, b: 1.16 },  // Egyptian turquoise faience clay
  'demi-dieu': { r: 1.14, g: 1.02, b: 0.82 }, // Greek bronze & golden aura
  hanyo: { r: 1.06, g: 0.94, b: 1.18 },    // Mauve half-yokai & demon violet
};

async function main() {
  console.log('Loading normalized keyframes with ground baseline and torso alignment...');
  const kfs = {};
  for (const [key, path] of Object.entries(sources)) {
    console.log(`Loading landmarks for ${key}...`);
    kfs[key] = await loadKeyframesWithLandmarks(path, 35);
  }

  // 1. Base classes (16 frames per animation state)
  console.log('\n--- Building 16-frame Base Class Sheets ---');
  for (const cls of ['invocateur', 'lame', 'paladin', 'rodeur']) {
    const frames = build16FrameHeroSequence(kfs[cls]);
    await write16FrameSheet(`heros-${cls}`, frames);
  }

  // 2. Base race warriors (16 frames per animation state)
  console.log('\n--- Building 16-frame Race Warrior Sheets ---');
  await write16FrameSheet('heros-oushebti', build16FrameHeroSequence(kfs.oushebti));
  await write16FrameSheet('heros-demi-dieu', build16FrameHeroSequence(kfs.demidieu));
  await write16FrameSheet('heros-hanyo', build16FrameHeroSequence(kfs.hanyo));

  // 3. All 20 Race x Class combinations
  console.log('\n--- Building 16-frame Sheets for All 20 Combinations ---');
  const races = ['einherjar', 'oushebti', 'demi-dieu', 'hanyo'];
  const classes = ['guerrier', 'invocateur', 'lame', 'paladin', 'rodeur'];

  for (const race of races) {
    const tint = raceTints[race];
    for (const cls of classes) {
      const comboName = `heros-${race}-${cls}`;
      let baseKfs;
      if (cls === 'guerrier') {
        if (race === 'oushebti') baseKfs = kfs.oushebti;
        else if (race === 'demi-dieu') baseKfs = kfs.demidieu;
        else if (race === 'hanyo') baseKfs = kfs.hanyo;
        else baseKfs = kfs.demidieu; // fallback for einherjar warrior motion
      } else {
        baseKfs = kfs[cls];
      }

      const frames = build16FrameHeroSequence(baseKfs, tint);
      await write16FrameSheet(comboName, frames);
    }
  }

  console.log('\nAll hero animations with 16 frames per animation tag built successfully!');
}

main().catch(console.error);
