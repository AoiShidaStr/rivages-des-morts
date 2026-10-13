#!/usr/bin/env bash
# Fabrique les sons courts (public/audio/sfx/<id>-<n>.mp3) à partir de trois packs libres CC0 :
#   - Kenney « RPG Audio »       https://kenney.nl/assets/rpg-audio
#   - Kenney « Impact Sounds »   https://kenney.nl/assets/impact-sounds
#   - StarNinjas « 20 sword sound effects »  https://opengameart.org/content/20-sword-sound-effects-attacks-and-clashes
# Usage : tools/sons.sh <dossier de travail>   (télécharge les packs s'ils manquent ; demande ffmpeg)
set -euo pipefail
W=${1:?dossier de travail}
OUT=$(cd "$(dirname "$0")/.." && pwd)/public/audio/sfx
mkdir -p "$W" "$OUT"
cd "$W"

fetch() { [ -d "$1" ] && return; curl -sfL -o "$1.zip" "$2"; mkdir -p "$1"; unzip -oqj "$1.zip" -d "$1"; }
fetch rpg https://kenney.nl/media/pages/assets/rpg-audio/8e99002d76-1677590336/kenney_rpg-audio.zip
fetch impact https://kenney.nl/media/pages/assets/impact-sounds/87b4ddecda-1677589768/kenney_impact-sounds.zip
fetch sword https://opengameart.org/sites/default/files/sword_-_starninjas_1.zip
fetch clash https://opengameart.org/sites/default/files/sword_clash_-_starninjas_0.zip
I=impact R=rpg

# make <id> <crête en dB> <filtre se terminant par [m]> <entrées…> : mono, silences coupés, crête ramenée à la valeur
# voulue (elle fixe le volume relatif des sons entre eux), mp3 96 kb/s.
make() {
  local out=$1 peak=$2 fc=$3; shift 3
  local args=(); for f in "$@"; do args+=(-i "$f"); done
  ffmpeg -v error -y "${args[@]}" -filter_complex \
    "$fc;[m]silenceremove=start_periods=1:start_threshold=-50dB,areverse,silenceremove=start_periods=1:start_threshold=-55dB,areverse[n]" \
    -map "[n]" -ac 1 -ar 44100 raw.wav
  local mx; mx=$(ffmpeg -i raw.wav -af volumedetect -f null - 2>&1 | grep -oP 'max_volume: \K[-0-9.]+')
  ffmpeg -v error -y -i raw.wav -af "volume=$(python3 -c "print($peak - ($mx))")dB" -c:a libmp3lame -b:a 96k "$OUT/$out.mp3"
}

# Coup : la lame, puis l'impact dans la chair.
blade='[0]volume=0.6[a];[a][1]amix=inputs=2:duration=longest:normalize=0,atrim=0:0.45[m]'
make coup-1 -4 "$blade" sword/sword.3.ogg $I/impactPunch_medium_000.ogg
make coup-2 -4 "$blade" sword/sword.4.ogg $I/impactPunch_medium_001.ogg
make coup-3 -4 "$blade" sword/sword.6.ogg $I/impactPunch_medium_002.ogg
# Critique : la lame, un impact lourd et une note de métal.
crit='[0]volume=0.7[a];[a][1][2]amix=inputs=3:duration=longest:normalize=0,atrim=0:0.8[m]'
make crit-1 -2 "$crit" sword/sword.7.ogg $I/impactPunch_heavy_000.ogg $I/impactMetal_light_000.ogg
make crit-2 -2 "$crit" sword/sword.1.ogg $I/impactPunch_heavy_001.ogg $I/impactMetal_light_001.ogg
# Coup reçu : sourd.
both='[0][1]amix=inputs=2:duration=longest:normalize=0[m]'
make recu-1 -3 "$both" $I/impactSoft_heavy_000.ogg $I/impactPunch_heavy_002.ogg
make recu-2 -3 "$both" $I/impactSoft_heavy_001.ogg $I/impactPunch_heavy_003.ogg
make recu-3 -3 "$both" $I/impactSoft_heavy_002.ogg $I/impactPunch_heavy_004.ogg
# Garde : l'acier qui encaisse ; parade : le choc des lames.
for i in 1 2 3; do make garde-$i -2 '[0]anull[m]' $I/impactPlate_medium_00$((i - 1)).ogg; done
for i in 1 2 3; do make parade-$i -6 '[0]anull[m]' clash/sword_clash.$i.ogg; done
# Vague : un coup de bois grave, presque un taiko.
drum='[0]asetrate=44100*0.55,aresample=44100,aecho=0.8:0.6:120:0.35[m]'
make vague-1 -2 "$drum" $I/impactWood_heavy_000.ogg
make vague-2 -2 "$drum" $I/impactWood_heavy_001.ogg
# À terre : le corps qui tombe ; relevé : une cloche.
make a-terre-1 -3 "$both" $R/dropLeather.ogg $I/impactSoft_heavy_003.ogg
make a-terre-2 -3 "$both" $R/dropLeather.ogg $I/impactSoft_heavy_004.ogg
bell='[0]afade=t=out:st=0.6:d=0.8[m]'
make releve-1 -7 "$bell" $I/impactBell_heavy_000.ogg
make releve-2 -7 "$bell" $I/impactBell_heavy_001.ogg
# Butin : des pièces.
make butin-1 -5 '[0]anull[m]' $R/handleCoins.ogg
make butin-2 -5 '[0]anull[m]' $R/handleCoins2.ogg
rm -f raw.wav
