// Écrit tools/pixel/heros-animations.json lisiblement : une pose par ligne, champs toujours dans le même ordre.
// Sert à l'éditeur d'animations (enregistrement depuis le navigateur, voir vite.config.ts).

const ORDER = ['duration', 'lean', 'body', 'head', 'footF', 'footB', 'hand', 'handB', 'blade', 'smear', 'draw', 'cape'];

const pose = (p) =>
  `{ ${Object.keys(p)
    .sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b))
    .map((k) => `${JSON.stringify(k)}: ${JSON.stringify(p[k]).replace(/,/g, ', ')}`)
    .join(', ')} }`;

export function formatAnimations(data) {
  const lines = ['{'];
  const groups = Object.entries(data);
  groups.forEach(([group, value], gi) => {
    const last = gi === groups.length - 1 ? '' : ',';
    if (typeof value === 'string') {
      lines.push(`  ${JSON.stringify(group)}: ${JSON.stringify(value)}${last}`);
      return;
    }
    lines.push(`  ${JSON.stringify(group)}: {`);
    const anims = Object.entries(value);
    anims.forEach(([name, anim], ai) => {
      lines.push(`    ${JSON.stringify(name)}: {`);
      if (anim.duration !== undefined) lines.push(`      "duration": ${anim.duration},`);
      if (anim.once) lines.push('      "once": true,');
      lines.push('      "poses": [');
      lines.push(anim.poses.map((p) => `        ${pose(p)}`).join(',\n'));
      lines.push('      ]');
      lines.push(`    }${ai === anims.length - 1 ? '' : ','}`);
    });
    lines.push(`  }${last}`);
  });
  lines.push('}');
  return `${lines.join('\n')}\n`;
}
