// Un onglet caché n'est plus animé par le navigateur, et ses minuteurs ralentissent jusqu'à une fois par seconde, voire
// par minute. Ceux d'un Worker, eux, ne ralentissent pas : un petit Worker sert de métronome tant que la page est cachée.

/** Appelle `tick` soixante fois par seconde environ, seulement quand la page est cachée. */
export function whileHidden(tick: () => void): void {
  let worker: Worker | null = null;
  let url = '';
  const sync = () => {
    if (document.hidden && !worker) {
      try {
        url = URL.createObjectURL(new Blob(['setInterval(() => postMessage(0), 16);'], { type: 'text/javascript' }));
        worker = new Worker(url);
        worker.onmessage = () => {
          if (document.hidden) tick();
        };
      } catch {
        worker = null;
      }
    } else if (!document.hidden && worker) {
      worker.terminate();
      worker = null;
      URL.revokeObjectURL(url);
    }
  };
  document.addEventListener('visibilitychange', sync);
  sync();
}
