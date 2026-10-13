// L'adresse publique du jeu, celle que l'on donne à ses amis. Sur un VPS, c'est https:// et son DOMAINE.
// Avec le tunnel gratuit (service « tunnel » de docker-compose.yml), Cloudflare donne une adresse au hasard en
// https://….trycloudflare.com, nouvelle à chaque démarrage du tunnel : on la demande au tunnel (TUNNEL, l'adresse
// de ses métriques), et le menu social l'affiche.

/** L'adresse publique connue, ou null. */
const domaine = process.env.DOMAINE?.trim();
let connue: string | null = domaine ? `https://${domaine}` : null;

export const adressePublique = (): string | null => connue;

/** Demande son adresse au tunnel, maintenant puis toutes les 30 secondes (il peut redémarrer et en changer). */
export function suivreTunnel(): void {
  const tunnel = process.env.TUNNEL?.trim().replace(/\/+$/, '');
  if (!tunnel || domaine) return;
  const demander = async () => {
    try {
      const reponse = await fetch(`${tunnel}/quicktunnel`, { signal: AbortSignal.timeout(3000) });
      const { hostname } = (await reponse.json()) as { hostname?: unknown };
      const adresse = typeof hostname === 'string' && hostname ? `https://${hostname}` : null;
      if (adresse && adresse !== connue) console.log(`Adresse publique du jeu (à donner à tes amis) : ${adresse}`);
      connue = adresse ?? connue;
    } catch {
      // Le tunnel démarre encore, ou il est arrêté : on garde la dernière adresse connue.
    }
  };
  void demander();
  setInterval(() => void demander(), 30_000).unref();
}

/**
 * L'adresse du joueur, pour freiner qui devine les mots de passe. Derrière le tunnel ou Caddy (PROXY=1), toutes
 * les requêtes viennent d'eux : on prend alors l'adresse qu'ils transmettent.
 */
export function adresseDe(req: { socket: { remoteAddress?: string }; headers: Record<string, string | string[] | undefined> }): string {
  if (process.env.PROXY === '1') {
    const entete = (nom: string) => {
      const valeur = req.headers[nom];
      return (Array.isArray(valeur) ? valeur[0] : valeur)?.split(',')[0]?.trim();
    };
    const transmise = entete('cf-connecting-ip') || entete('x-forwarded-for');
    if (transmise) return transmise;
  }
  return req.socket.remoteAddress ?? '';
}
