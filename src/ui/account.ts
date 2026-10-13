// Le compte, depuis l'écran titre (seulement quand le jeu est servi par son serveur) : créer un compte ou s'y
// connecter, recopier sur le compte les personnages de ce navigateur, se déconnecter.
import { MAX_CHARACTERS } from '../game/progress';
import { LocalSaveStore } from '../game/saves';
import { signIn, signOut, type AccountSaveStore } from '../net/account';
import { h } from './dom';
import type { PanelHost } from './panels';

const PSEUDO_KEY = 'rivages-des-morts:pseudo';

export interface AccountDeps {
  /** Le compte connecté, ou null. */
  account: AccountSaveStore | null;
  /** Le compte a changé : le jeu repart avec les personnages du nouveau compte (ou ceux du navigateur), et montre `notice`. */
  restart(notice?: string): void;
}

export function openAccount(host: PanelHost, deps: AccountDeps, onClose: () => void): void {
  const { account } = deps;
  if (account) {
    const local = new LocalSaveStore();
    const waiting = local.list().filter(({ id }) => !account.read(id)).length;
    host.show(
      'Compte',
      account.online ? `Connecté : ${account.session.pseudo}` : `${account.session.pseudo} · serveur injoignable, tes personnages partiront au retour`,
      h(
        'div',
        { class: 'list coop' },
        h('p', { class: 'note' }, 'Tes personnages sont gardés sur le serveur : tu les retrouves depuis n’importe quel ordinateur en te connectant.'),
        waiting
          ? h(
              'div',
              { class: 'entry-actions' },
              h(
                'button',
                {
                  class: 'btn',
                  onclick: () => {
                    const added = account.adopt(local, MAX_CHARACTERS);
                    deps.restart(added ? `${added} personnage${added > 1 ? 's' : ''} recopié${added > 1 ? 's' : ''} sur ton compte.` : `Ton compte a déjà ${MAX_CHARACTERS} personnages.`);
                  },
                },
                `Recopier sur mon compte les personnages de ce navigateur (${waiting})`,
              ),
            )
          : null,
        h(
          'div',
          { class: 'entry-actions' },
          h(
            'button',
            {
              class: 'btn',
              onclick: () => void signOut(account.session).then(() => deps.restart('Déconnecté : tu retrouves les personnages de ce navigateur.')),
            },
            'Se déconnecter',
          ),
        ),
        h('p', { class: 'note' }, 'Déconnecté, tu retrouves les personnages gardés dans ce navigateur seulement.'),
      ),
      { onClose },
    );
    return;
  }

  const pseudo = h('input', { type: 'text', maxlength: '16', autocomplete: 'username', 'aria-label': 'Pseudo', class: 'coop-input' });
  const password = h('input', { type: 'password', autocomplete: 'current-password', 'aria-label': 'Mot de passe', class: 'coop-input' });
  const error = h('p', { class: 'note danger' });
  let busy = false;
  const submit = (kind: 'inscription' | 'connexion') => {
    if (busy) return;
    busy = true;
    error.textContent = '';
    signIn(kind, pseudo.value.trim(), password.value)
      .then((session) => {
        try {
          // Le pseudo du compte devient celui de la coop, si on n'en avait pas choisi.
          if (!localStorage.getItem(PSEUDO_KEY)) localStorage.setItem(PSEUDO_KEY, session.pseudo);
        } catch {
          // Pas grave.
        }
        deps.restart(kind === 'inscription' ? `Compte créé : bienvenue, ${session.pseudo} !` : `Connecté : ${session.pseudo}`);
      })
      .catch((e: unknown) => {
        busy = false;
        error.textContent = e instanceof Error ? e.message : String(e);
      });
  };
  password.addEventListener('keydown', (e) => {
    if ((e as KeyboardEvent).key === 'Enter') submit('connexion');
  });
  host.show(
    'Compte',
    'Garde tes personnages sur le serveur, et retrouve-les depuis n’importe quel ordinateur.',
    h(
      'div',
      { class: 'list coop' },
      h('label', { class: 'coop-field' }, h('span', {}, 'Pseudo'), pseudo),
      h('label', { class: 'coop-field' }, h('span', {}, 'Mot de passe'), password),
      error,
      h(
        'div',
        { class: 'entry-actions' },
        h('button', { class: 'btn primary', onclick: () => submit('connexion') }, 'Se connecter'),
        h('button', { class: 'btn', onclick: () => submit('inscription') }, 'Créer un compte'),
      ),
      h('p', { class: 'note' }, 'Sans compte, tes personnages restent dans ce navigateur, comme avant. Une fois connecté, tu pourras les recopier sur ton compte.'),
    ),
    { onClose },
  );
  pseudo.focus();
}
