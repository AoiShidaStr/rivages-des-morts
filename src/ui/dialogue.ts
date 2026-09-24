import { h } from './dom';

export interface Speaker {
  name: string;
  portrait: string | null;
}

const CHARS_PER_SECOND = 55;

/**
 * Boîte de dialogue en bas de l'écran : portrait, nom, texte qui s'écrit, puis choix.
 * E, Espace, Entrée ou un clic font avancer ; ↑ ↓ (ou Z S) et 1 à 4 choisissent une réponse.
 */
export class DialogueBox {
  private readonly root: HTMLDivElement;
  private readonly portrait: HTMLImageElement;
  private readonly name: HTMLDivElement;
  private readonly text: HTMLParagraphElement;
  private readonly choicesEl: HTMLDivElement;
  private readonly next: HTMLDivElement;
  private full = '';
  private shown = 0;
  private onAdvance: (() => void) | null = null;
  private onChoice: ((index: number) => void) | null = null;
  private choiceButtons: HTMLButtonElement[] = [];
  private selected = 0;

  constructor(parent: HTMLElement) {
    this.portrait = h('img', { alt: '' });
    this.name = h('div', { class: 'name' });
    this.text = h('p', { class: 'text' });
    this.choicesEl = h('div', { class: 'choices' });
    this.next = h('div', { class: 'next' }, '▼');
    this.root = h(
      'div',
      { class: 'dialogue', onclick: () => this.advance() },
      h('div', { class: 'portrait' }, this.portrait),
      h('div', { class: 'body' }, this.name, this.text, this.choicesEl, this.next),
    );
    parent.append(this.root);
  }

  get open(): boolean {
    return this.root.classList.contains('visible');
  }

  say(speaker: Speaker, text: string): Promise<void> {
    this.root.classList.add('visible');
    this.root.classList.toggle('narration', !speaker.name);
    this.name.textContent = speaker.name;
    this.name.hidden = !speaker.name;
    this.portrait.parentElement!.hidden = !speaker.portrait;
    if (speaker.portrait) this.portrait.src = speaker.portrait;
    this.full = text;
    this.shown = 0;
    this.text.textContent = '';
    this.choicesEl.replaceChildren();
    this.choiceButtons = [];
    this.next.hidden = true;
    return new Promise((resolve) => {
      this.onAdvance = resolve;
    });
  }

  choose(options: string[]): Promise<number> {
    this.finishTyping();
    this.next.hidden = true;
    this.selected = 0;
    this.choiceButtons = options.map((label, i) =>
      h(
        'button',
        {
          class: 'choice',
          onclick: (e) => {
            e.stopPropagation();
            this.pick(i);
          },
          onmouseenter: () => this.highlight(i),
        },
        h('kbd', {}, String(i + 1)),
        label,
      ),
    );
    this.choicesEl.replaceChildren(...this.choiceButtons);
    this.highlight(0);
    return new Promise((resolve) => {
      this.onChoice = resolve;
    });
  }

  close(): void {
    this.root.classList.remove('visible');
    this.onAdvance = null;
    this.onChoice = null;
  }

  /** Termine la ligne en cours d'écriture, ou passe à la suivante. */
  advance(): void {
    if (this.onChoice) {
      this.pick(this.selected);
      return;
    }
    if (this.shown < this.full.length) {
      this.finishTyping();
      return;
    }
    const resolve = this.onAdvance;
    this.onAdvance = null;
    resolve?.();
  }

  move(delta: number): void {
    if (!this.onChoice || this.choiceButtons.length === 0) return;
    this.highlight((this.selected + delta + this.choiceButtons.length) % this.choiceButtons.length);
  }

  pick(index: number): void {
    if (!this.onChoice || index < 0 || index >= this.choiceButtons.length) return;
    const resolve = this.onChoice;
    this.onChoice = null;
    resolve(index);
  }

  tick(dt: number): void {
    if (!this.open || this.shown >= this.full.length) return;
    this.shown = Math.min(this.full.length, this.shown + CHARS_PER_SECOND * dt);
    this.text.textContent = this.full.slice(0, Math.floor(this.shown));
    if (this.shown >= this.full.length) this.next.hidden = Boolean(this.onChoice);
  }

  private finishTyping(): void {
    this.shown = this.full.length;
    this.text.textContent = this.full;
    this.next.hidden = Boolean(this.onChoice);
  }

  private highlight(index: number): void {
    this.selected = index;
    this.choiceButtons.forEach((b, i) => b.classList.toggle('selected', i === index));
  }
}
