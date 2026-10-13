#!/usr/bin/env sh
# Lance le serveur du jeu avec la dernière version de GitHub (Linux, macOS, VPS).
#   ./lancer.sh          tunnel gratuit (depuis son PC)
#   ./lancer.sh https    Caddy et HTTPS (sur un VPS, avec DOMAINE dans .env)
#   ./lancer.sh local    sans tunnel ni HTTPS (réseau local seulement)
# Il passe sur la branche main, récupère les nouveautés, puis reconstruit l'image si besoin.
set -e
cd "$(dirname "$0")"

mode="${1:-tunnel}"
case "$mode" in
  tunnel|https) profil="--profile $mode" ;;
  local) profil="" ;;
  *) echo "Mode inconnu : $mode (tunnel, https ou local)"; exit 1 ;;
esac

echo "Version installée : $(git log -1 --format='%h du %cd' --date=format:'%d/%m/%Y %H:%M')"
echo "Recherche d'une mise à jour sur GitHub..."
if git fetch --quiet origin main; then
  branche="$(git rev-parse --abbrev-ref HEAD)"
  if [ "$branche" != "main" ]; then
    echo "Passage de la branche $branche à main."
    git checkout --quiet main
  fi
  if [ "$(git rev-parse HEAD)" = "$(git rev-parse origin/main)" ]; then
    echo "Déjà à jour."
  else
    echo "Nouveautés :"
    git log --format='  - %s' HEAD..origin/main | head -n 15
    git pull --quiet --ff-only origin main
  fi
else
  echo "GitHub ne répond pas : le serveur démarre avec la version installée."
fi

VERSION="$(git log -1 --format='%h du %cd' --date=format:'%d/%m/%Y')"
export VERSION
echo "Démarrage de la version $VERSION..."
# --build ne reconstruit que ce qui a changé : sans nouveauté, c'est rapide.
docker compose $profil up -d --build

echo "C'est lancé : http://localhost:${PORT:-8080}"
echo "Version servie : http://localhost:${PORT:-8080}/sante"
