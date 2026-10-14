# Police des titres : Shippori Mincho (Google Fonts, licence OFL), réduite aux caractères du jeu et embarquée dans
# public/fonts, pour qu'elle marche hors ligne et sur le serveur coop sans dépendre de Google.
#
#   python3 -m pip install fonttools brotli
#   python3 tools/polices.py <dossier contenant ShipporiMincho-Regular.ttf et ShipporiMincho-Bold.ttf>
#
# Les fichiers .ttf complets (8 Mo chacun) : https://github.com/google/fonts/tree/main/ofl/shipporimincho
# À relancer quand un nouveau kanji apparaît dans le jeu (un sceau, un dialogue) : il est relevé tout seul dans src/.
import pathlib
import sys

from fontTools import subset

RACINE = pathlib.Path(__file__).resolve().parent.parent
SORTIE = RACINE / 'public' / 'fonts'

# Latin et français (accents, œ, guillemets, tirets), macrons du japonais romanisé (ō, ū), ponctuation et kana.
PLAGES = [(0x20, 0x7E), (0xA0, 0x17F), (0x2000, 0x206F), (0x20AC, 0x20AC), (0x3000, 0x303F), (0x3040, 0x30FF)]


def kanji_du_jeu() -> set[int]:
    trouves: set[int] = set()
    fichiers = [p for p in (RACINE / 'src').rglob('*') if p.suffix in ('.ts', '.json', '.css')] + [RACINE / 'index.html']
    for fichier in fichiers:
        for c in fichier.read_text(encoding='utf8'):
            if 0x2E80 <= ord(c) <= 0x9FFF or 0xF900 <= ord(c) <= 0xFAFF:
                trouves.add(ord(c))
    return trouves


def main() -> None:
    source = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else '.')
    codes = kanji_du_jeu()
    for debut, fin in PLAGES:
        codes.update(range(debut, fin + 1))
    # Les points de suspension japonais sont centrés sur la ligne (« brume··· ») : on garde ceux de la police de secours.
    codes.discard(0x2026)
    SORTIE.mkdir(parents=True, exist_ok=True)
    for graisse in ('Regular', 'Bold'):
        options = subset.Options()
        options.flavor = 'woff2'
        options.layout_features = ['*']
        options.name_IDs = ['*']
        police = subset.load_font(str(source / f'ShipporiMincho-{graisse}.ttf'), options)
        sous = subset.Subsetter(options)
        sous.populate(unicodes=codes)
        sous.subset(police)
        cible = SORTIE / f'shippori-mincho-{graisse.lower()}.woff2'
        subset.save_font(police, str(cible), options)
        print(f'{cible.relative_to(RACINE)} : {cible.stat().st_size // 1024} Ko')


main()
