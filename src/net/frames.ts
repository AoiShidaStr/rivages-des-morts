// Commandes échangées en coop : les appuis (clic, esquive, compétences) ne doivent jamais se perdre, même quand
// deux commandes arrivent entre deux pas de simulation, ni compter deux fois.
import type { Vec2 } from '../game/math';
import type { InputFrame } from '../game/types';

const PRESSES = ['attackPressed', 'signaturePressed', 'dodgePressed', 'skillAPressed', 'skillEPressed', 'skillRPressed'] as const;

/** Aucune commande : le héros reste où il est. */
export function idleFrame(pos: Vec2): InputFrame {
  return {
    move: { x: 0, z: 0 },
    aim: { ...pos },
    aimGround: { ...pos },
    attackPressed: false,
    attackHeld: false,
    signatureHeld: false,
    signaturePressed: false,
    dodgePressed: false,
    skillAPressed: false,
    skillEPressed: false,
    skillRPressed: false,
  };
}

/** La commande la plus récente, avec en plus les appuis de la précédente pas encore joués. */
export function mergeFrames(previous: InputFrame | undefined, next: InputFrame): InputFrame {
  if (!previous) return next;
  const merged = { ...next };
  for (const key of PRESSES) merged[key] = previous[key] || next[key];
  return merged;
}

/** La même commande, ses appuis déjà joués : on garde la direction et les boutons tenus. */
export function played(frame: InputFrame): InputFrame {
  const rest = { ...frame };
  for (const key of PRESSES) rest[key] = false;
  return rest;
}
