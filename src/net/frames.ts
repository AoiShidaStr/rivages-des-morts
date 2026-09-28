// Commandes échangées en coop. L'invité en produit une à chaque pas, numérotée ; les appuis (clic, esquive,
// compétences) y sont comptés depuis le début de la descente, pour qu'aucun ne se perde ni ne compte deux fois quand un
// paquet se perd, arrive en double ou dans le désordre.
import type { Vec2 } from '../game/math';
import type { InputFrame } from '../game/types';
import type { InputPacket } from './protocol';

const PRESSES = ['attackPressed', 'signaturePressed', 'dodgePressed', 'skillAPressed', 'skillEPressed', 'skillRPressed'] as const;

/** Sans nouvelles d'un invité depuis ce temps (ms), son héros s'arrête : il a peut-être changé d'onglet. */
const SILENCE = 500;

/** Arrondi, pour des paquets courts : au millième pour la direction, au centimètre pour la visée. */
const round = (p: Vec2, precision: number): Vec2 => ({ x: Math.round(p.x * precision) / precision, z: Math.round(p.z * precision) / precision });

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

/** Invité : numérote ses commandes et compte ses appuis. */
export class InputSender {
  private seq = 0;
  private readonly counts = PRESSES.map(() => 0);

  constructor(readonly run: number) {}

  /** La commande de ce pas, prête à partir. */
  next(frame: InputFrame, ping: number): InputPacket {
    PRESSES.forEach((key, i) => {
      if (frame[key]) this.counts[i]++;
    });
    return {
      run: this.run,
      seq: ++this.seq,
      move: round(frame.move, 1000),
      aim: round(frame.aim, 100),
      aimGround: round(frame.aimGround, 100),
      attackHeld: frame.attackHeld,
      signatureHeld: frame.signatureHeld,
      presses: [...this.counts],
      ping: Math.round(ping),
    };
  }
}

/** Hôte : les commandes d'un invité, telles qu'elles arrivent, et ce qu'on en joue à chaque pas. */
export class RemoteInput {
  /** Dernière commande reçue, et dernière jouée (l'accusé de réception envoyé avec l'instantané). */
  private seq = 0;
  applied = 0;
  private latest: InputPacket | null = null;
  private readonly counts = PRESSES.map(() => 0);
  private readonly pending = PRESSES.map(() => false);
  private heardAt = 0;
  /** Ping de l'invité, tel qu'il le mesure. */
  ping = 0;

  constructor(readonly run: number) {}

  receive(packet: InputPacket, now: number): void {
    if (packet.run !== this.run || packet.seq <= this.seq) return;
    this.seq = packet.seq;
    this.latest = packet;
    this.heardAt = now;
    this.ping = packet.ping;
    PRESSES.forEach((_, i) => {
      const count = packet.presses[i] ?? 0;
      if (count > this.counts[i]) {
        this.pending[i] = true;
        this.counts[i] = count;
      }
    });
  }

  /** La commande de ce pas : la dernière reçue, avec les appuis pas encore joués. */
  frame(pos: Vec2, now: number): InputFrame {
    const latest = this.latest;
    const frame = idleFrame(pos);
    if (latest) {
      this.applied = this.seq;
      frame.aim = latest.aim;
      frame.aimGround = latest.aimGround;
      if (now - this.heardAt <= SILENCE) {
        frame.move = latest.move;
        frame.attackHeld = latest.attackHeld;
        frame.signatureHeld = latest.signatureHeld;
      }
    }
    PRESSES.forEach((key, i) => {
      frame[key] = this.pending[i];
      this.pending[i] = false;
    });
    return frame;
  }
}
