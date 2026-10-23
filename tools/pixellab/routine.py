"""Routine PixelLab : crée les héros et leurs animations (2 directions) en dépensant le moins de générations possible.

Le jeton n'est jamais écrit dans le dépôt : il est lu dans la variable PIXELLAB_TOKEN, ou dans le fichier donné par
PIXELLAB_TOKEN_FILE (une ligne `PIXELLAB_TOKEN=...`), et n'est jamais affiché.

    python3 tools/pixellab/routine.py solde                  # générations restantes
    python3 tools/pixellab/routine.py plan                   # étapes restantes et leur coût estimé
    python3 tools/pixellab/routine.py lancer [--etapes N] [--budget N] [--perso ID]
    python3 tools/pixellab/routine.py refaire ID ANIM [DIR]  # une animation ratée : relancée au prochain `lancer`
    python3 tools/pixellab/routine.py valider ID [ANIM]
    python3 tools/pixellab/routine.py telecharger ID         # re-télécharge les images (le dossier sorties/ n'est pas suivi)
    python3 tools/pixellab/routine.py apercu ID              # planche d'aperçu agrandie et GIF par animation
    python3 tools/pixellab/routine.py cornes ID              # Hanyō : repose les cornes perdues dans les animations
    python3 tools/pixellab/routine.py planche ID [DOSSIER]   # planche du jeu (.webp + .json au format Aseprite)

Une étape = la création d'un personnage, ou une animation dans une direction. `lancer` n'en fait qu'une par défaut :
on regarde l'aperçu avant de payer la suivante (la direction de face d'abord ; si elle est ratée, on ne paie pas le dos)."""
import argparse
import json
import math
import os
import re
import sys
import time
import urllib.request
from pathlib import Path

ICI = Path(__file__).resolve().parent
PERSOS = ICI / 'persos.json'
ETAT = ICI / 'etat.json'
SORTIES = ICI / 'sorties'
URL = 'https://api.pixellab.ai/mcp'
# animations du jeu (tags de la planche) ; la direction de dos ajoute « -dos »
TAGS = {'deplacement': 'move', 'attaque': 'strike', 'speciale': 'skill', 'mort': 'death'}
DUREES = {'deplacement': 80, 'attaque': 70, 'speciale': 80, 'mort': 110}
DOS = {'south-east': '', 'north-east': '-dos'}


# ------------------------------------------------------------------ appels ------------------------------------------------------------------
def jeton():
    t = os.environ.get('PIXELLAB_TOKEN')
    if not t and os.environ.get('PIXELLAB_TOKEN_FILE'):
        t = open(os.environ['PIXELLAB_TOKEN_FILE']).read().split('=', 1)[-1].strip()
    if not t:
        sys.exit('Jeton absent : définir PIXELLAB_TOKEN ou PIXELLAB_TOKEN_FILE.')
    return t


def appel(outil, args=None):
    """Appelle un outil du serveur MCP de PixelLab ; renvoie son texte."""
    corps = json.dumps({'jsonrpc': '2.0', 'id': 1, 'method': 'tools/call',
                        'params': {'name': outil, 'arguments': args or {}}}).encode()
    req = urllib.request.Request(URL, corps, {'Authorization': 'Bearer ' + jeton(), 'Content-Type': 'application/json',
                                              'Accept': 'application/json, text/event-stream'})
    for essai in range(4):
        try:
            with urllib.request.urlopen(req, timeout=300) as r:
                txt = r.read().decode()
            break
        except OSError as e:
            if essai == 3:
                raise
            print('  réseau :', e, '- nouvel essai', flush=True)
            time.sleep(2 ** (essai + 1))
    for ligne in txt.splitlines():
        if ligne.startswith('data:'):
            txt = ligne[5:]
            break
    rep = json.loads(txt)
    if 'error' in rep:
        raise RuntimeError(f"{outil} : {rep['error']}")
    res = rep['result']
    texte = '\n'.join(c.get('text', '') for c in res.get('content', []))
    if res.get('isError'):
        raise RuntimeError(f'{outil} : {texte[:2000]}')
    return texte


def solde():
    t = appel('get_balance')
    val = lambda k: int(re.search(rf'{k}: (\d+)', t).group(1)) if re.search(rf'{k}: (\d+)', t) else 0
    return {'restantes': val('generations_remaining'), 'jour': val('generations_today'), 'texte': t}


def disponible(s):
    # le bonus du jour ne sert qu'une fois les générations du forfait épuisées
    return s['restantes'] if s['restantes'] > 0 else s['jour']


def attendre_jobs(limite=1800):
    debut = time.time()
    while time.time() - debut < limite:
        t = appel('list_jobs')
        if 'no active jobs' in t.lower():
            return
        time.sleep(15)
    raise TimeoutError('PixelLab : travail toujours en cours après 30 min')


def fiche(pid):
    """get_character, lu : état, taille, rotations et animations (groupe, direction, url des images)."""
    t = appel('get_character', {'character_id': pid, 'include_preview': False})
    f = {'statut': (re.search(r'status: (\w+)', t) or [None, '?'])[1], 'rotations': {}, 'animations': []}
    m = re.search(r'size: (\d+)x(\d+)px', t)
    f['taille'] = [int(m[1]), int(m[2])] if m else None
    bloc = None
    for ligne in t.splitlines():
        if ligne.startswith('rotations:'):
            bloc = 'rot'
        elif ligne.startswith('animations'):
            bloc = 'anim'
        elif ligne and not ligne.startswith(' '):
            bloc = None
        elif bloc == 'rot' and (m := re.match(r'\s+([a-z-]+): (https://\S+)', ligne)):
            f['rotations'][m[1]] = m[2]
        elif bloc == 'anim' and (m := re.match(r'  (\S.*?) — .*\[group: ([0-9a-f-]+)\]', ligne)):
            f['animations'].append({'nom': m[1], 'groupe': m[2], 'dirs': {}})
        elif bloc == 'anim' and f['animations'] and (m := re.match(r'\s{4}([a-z-]+): (https://\S+) \(i=0\.\.(\d+)\)', ligne)):
            f['animations'][-1]['dirs'][m[1]] = {'url': m[2], 'images': int(m[3]) + 1}
    return f


def telecharger_url(url, chemin):
    chemin.parent.mkdir(parents=True, exist_ok=True)
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (rivages-des-morts)'})
    with urllib.request.urlopen(req, timeout=120) as r:
        chemin.write_bytes(r.read())


# ------------------------------------------------------------------ plan ------------------------------------------------------------------
def charger():
    plan = json.load(open(PERSOS))
    etat = json.load(open(ETAT)) if ETAT.exists() else {}
    return plan, etat


def sauver(etat):
    ETAT.write_text(json.dumps(etat, ensure_ascii=False, indent=2) + '\n')


def spec(plan, perso, anim):
    return plan['animations'][perso['classe']].get(anim) or plan['animations']['commun'][anim]


def toile(plan, etat, perso):
    t = etat.get(perso['id'], {}).get('taille')
    return t[0] if t else round(plan['reglages']['size'] * 1.44 / 4) * 4


def estimation(plan, etat, perso, anim):
    """Coût estimé d'une étape, en générations (la facture réelle se lit dans le solde)."""
    if anim == 'creation':
        return 1
    s, c = spec(plan, perso, anim), toile(plan, etat, perso)
    if 'modele' in s:
        return 1 if c <= 92 else 2
    genere = c * 1.26                       # la silhouette agrandit la toile générée
    return math.ceil(genere * genere * s.get('images', 6) / 65536)


def etapes(plan, etat, seul=None):
    """Étapes restantes, dans l'ordre : chaque héros en entier, la face avant le dos pour chaque animation."""
    out = []
    for p in plan['persos']:
        if seul and p['id'] != seul:
            continue
        e = etat.get(p['id'], {})
        neuf = not e.get('pixellab') or e.get('creation') == 'a-refaire'
        if neuf:
            out.append((p, 'creation', None))
        for anim in plan['reglages']['ordre']:
            for d in plan['reglages']['directions']:
                a = e.get('animations', {}).get(anim, {}).get(d)
                if neuf or not a or a.get('statut') == 'a-refaire':
                    out.append((p, anim, d))
    return out


# ------------------------------------------------------------------ étapes ------------------------------------------------------------------
def creer(plan, etat, p):
    r = plan['reglages']
    # la race d'abord : en fin de description, PixelLab oublie la peau et les cornes
    race = p.get('race_texte') or plan['races'][p['race']]
    desc = f"{race}. {p['description']}. Adult proportions, not chibi, eyes looking where the body faces"
    corps = p.get('proportions', r['proportions'])
    args = {'description': desc, 'name': p['id'], 'size': r['size'], 'view': r['view'], 'outline': r['outline'],
            'shading': r['shading'], 'detail': r['detail'], 'n_directions': 8, 'mode': 'standard',
            'proportions': json.dumps({'type': 'preset', 'name': corps}), 'text_guidance_scale': r['text_guidance_scale']}
    t = appel('create_character', args)
    pid = re.search(r'[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}', t)[0]
    print('  personnage', pid, flush=True)
    for _ in range(120):
        f = fiche(pid)
        if f['statut'] == 'completed':
            break
        if f['statut'] == 'failed':
            raise RuntimeError('création ratée : ' + pid)
        time.sleep(15)
    e = etat.setdefault(p['id'], {})
    e.update({'pixellab': pid, 'taille': f['taille'], 'creation': 'fait', 'animations': {}})
    for d in plan['reglages']['directions'] + ['south']:
        telecharger_url(f['rotations'][d], SORTIES / p['id'] / 'rotations' / f'{d}.png')


def importer(plan, etat, pid, dossier):
    """Remplace le personnage par ses 8 vues retouchées (cornes, couleurs) : un import v3 sans rien générer, facturé
    0,25 génération. Les animations partent ensuite de ces vues."""
    import base64
    dossier = Path(dossier)
    b64 = lambda d: base64.b64encode((dossier / f'{d}.png').read_bytes()).decode()
    autres = ['south-east', 'east', 'north-east', 'north', 'north-west', 'west', 'south-west']
    t = appel('create_character', {'description': pid, 'name': pid, 'mode': 'v3', 'n_directions': 8,
                                   'reference_image_base64': b64('south'),
                                   'direction_images': {d: b64(d) for d in autres}})
    nouveau = re.search(r'[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}', t)[0]
    print('  personnage importé', nouveau, flush=True)
    for _ in range(120):
        f = fiche(nouveau)
        if f['statut'] == 'completed':
            break
        if f['statut'] == 'failed':
            raise RuntimeError('import raté : ' + nouveau)
        time.sleep(10)
    attendre_jobs()
    e = etat.setdefault(pid, {})
    e.setdefault('anciens', []).append(e.get('pixellab'))
    e.update({'pixellab': nouveau, 'taille': f['taille'], 'creation': 'fait', 'animations': {}, 'retouche': str(dossier)})
    for d in plan['reglages']['directions'] + ['south']:
        telecharger_url(f['rotations'][d], SORTIES / pid / 'rotations' / f'{d}.png')


def animer(plan, etat, p, anim, d):
    e = etat[p['id']]
    s = spec(plan, p, anim)
    args = {'character_id': e['pixellab'], 'directions': [d], 'animation_name': anim}
    if 'modele' in s:
        args.update({'template_animation_id': s['modele'], 'mode': 'template'})
        if s.get('action'):
            args['action_description'] = s['action']
    else:
        args.update({'mode': 'v3', 'action_description': s['action'], 'frame_count': s.get('images', 6),
                     'keep_first_frame': False})
        if s.get('boucle'):
            # la dernière image revient à la pose de départ : une marche qui boucle sans que le corps tourne peu à peu
            import base64
            vue = SORTIES / p['id'] / 'rotations' / f'{d}.png'
            args['end_frame_base64'] = base64.b64encode(vue.read_bytes()).decode()
    avant = {a['groupe'] for a in fiche(e['pixellab'])['animations']}
    for essai in range(6):
        try:
            t = appel('animate_character', args)
            break
        except RuntimeError as err:
            # aux heures chargées, PixelLab refuse un moment l'offre gratuite (« Generation failed ») ; rien n'est facturé
            if 'Generation failed' not in str(err) or essai == 5:
                raise
            print('   PixelLab saturé, nouvel essai dans 2 min', flush=True)
            time.sleep(120)
    recu = ' '.join(l.strip() for l in t.splitlines() if re.search(r'cost|generation', l, re.I))[:300]
    print('  ', recu, flush=True)
    attendre_jobs()
    f = fiche(e['pixellab'])
    neuves = [a for a in f['animations'] if a['groupe'] not in avant and d in a['dirs']]
    if not neuves:
        raise RuntimeError(f'animation {anim} {d} introuvable après le travail : voir get_character')
    a = neuves[-1]
    e.setdefault('animations', {}).setdefault(anim, {})[d] = {
        'groupe': a['groupe'], 'url': a['dirs'][d]['url'], 'images': a['dirs'][d]['images'], 'statut': 'fait',
        'methode': s.get('modele', 'v3')}
    recuperer(p['id'], anim, d, e['animations'][anim][d])
    zones = p.get('arme', {}).get(d)
    if anim == 'deplacement' and 'modele' in s and zones:
        import arme
        vue = Path(e.get('retouche') or SORTIES / p['id'] / 'rotations') / f'{d}.png'
        print('   arme recollée :', arme.coller(vue, SORTIES / p['id'] / anim / d, zones['main_vue'], zones['main'],
                                                 zones['arme'], zones.get('sombre')))
    if e.get('retouche'):
        retoucher(p['id'], anim, d, e['retouche'])


def retoucher(pid, anim, d, vues, neuves=True):
    """Les cornes posées à la main se perdent parfois dans une animation (surtout de dos) : on les repose, en gardant
    les images brutes dans sorties/ID/brut/ (`neuves` : les images viennent d'arriver ; sinon on repart des brutes)."""
    import shutil
    import cornes
    dossier = SORTIES / pid / anim / d
    brut = SORTIES / pid / 'brut' / anim / d
    brut.mkdir(parents=True, exist_ok=True)
    de, vers = (dossier, brut) if neuves or not any(brut.glob('*.png')) else (brut, dossier)
    for f in de.glob('*.png'):
        shutil.copy(f, vers / f.name)
    print('   cornes :', ' '.join(cornes.cornes_animation(dossier, Path(vues) / f'{d}.png', cornes.CORNES[d])))


def recuperer(pid, anim, d, a):
    for vieux in (SORTIES / pid / anim / d).glob('*.png'):
        vieux.unlink()
    for i in range(a['images']):
        telecharger_url(a['url'].replace('{i}', str(i)), SORTIES / pid / anim / d / f'{i}.png')


def lancer(args):
    plan, etat = charger()
    s = solde()
    budget = min(args.budget, disponible(s)) if args.budget is not None else disponible(s)
    print(f"solde : {s['restantes']} restantes, bonus du jour {s['jour']} ; budget de cette séance : {budget}")
    faites = 0
    for p, anim, d in etapes(plan, etat, args.perso):
        if args.anim and anim != args.anim:
            continue
        if faites >= args.etapes:
            break
        cout = estimation(plan, etat, p, anim)
        if cout > budget:
            print(f"arrêt : {p['id']} {anim} {d or ''} coûterait environ {cout}, il reste {budget}")
            break
        print(f"-> {p['id']} : {anim} {d or ''} (environ {cout})", flush=True)
        avant = solde()
        if anim == 'creation':
            creer(plan, etat, p)
        else:
            animer(plan, etat, p, anim, d)
        apres = solde()
        # le compteur du jour baisse avec chaque facture, même quand le forfait paie
        paye = max(0, avant['restantes'] - apres['restantes'], avant['jour'] - apres['jour'])
        e = etat[p['id']]
        if anim == 'creation':
            e['cout_creation'] = paye
        else:
            e['animations'][anim][d]['cout'] = paye
        e['depense'] = e.get('depense', 0) + paye
        sauver(etat)
        budget -= max(paye, 1)
        faites += 1
        print(f'   payé : {paye} ; aperçu : python3 tools/pixellab/routine.py apercu {p["id"]}', flush=True)
        apercu(p['id'])
    if not faites:
        print('rien de lancé')


# ------------------------------------------------------------------ images ------------------------------------------------------------------
def images(pid, anim, d):
    from PIL import Image
    dossier = SORTIES / pid / anim / d
    fichiers = sorted(dossier.glob('*.png'), key=lambda f: int(f.stem))
    return [Image.open(f).convert('RGBA') for f in fichiers]


def apercu(pid, zoom=3):
    """Une ligne par animation et direction, agrandie, sur un fond vert sombre ; un GIF par ligne."""
    from PIL import Image
    plan, etat = charger()
    e = etat.get(pid, {})
    lignes = [('rotations', None, [Image.open(f).convert('RGBA') for f in sorted((SORTIES / pid / 'rotations').glob('*.png'))])]
    for anim in plan['reglages']['ordre']:
        for d in plan['reglages']['directions']:
            if d in e.get('animations', {}).get(anim, {}):
                lignes.append((anim, d, images(pid, anim, d)))
    case = max(max(i.width, i.height) for _, _, imgs in lignes for i in imgs)
    larg = max(len(imgs) for _, _, imgs in lignes)
    fond = (69, 87, 58, 255)
    out = Image.new('RGBA', (larg * case, len(lignes) * case), fond)
    for y, (anim, d, imgs) in enumerate(lignes):
        for x, im in enumerate(imgs):
            out.alpha_composite(im, (x * case + (case - im.width) // 2, y * case + (case - im.height) // 2))
        if d:
            gif = [Image.alpha_composite(Image.new('RGBA', (case, case), fond), centrer(im, case)).resize(
                (case * zoom, case * zoom), Image.NEAREST).convert('P', palette=Image.ADAPTIVE) for im in imgs]
            gif[0].save(SORTIES / pid / f'{anim}-{d}.gif', save_all=True, append_images=gif[1:],
                        duration=DUREES[anim], loop=0, disposal=2)
    out = out.resize((out.width * zoom, out.height * zoom), Image.NEAREST)
    out.save(SORTIES / pid / 'apercu.png')
    print('  ', SORTIES / pid / 'apercu.png')


def centrer(im, case):
    """Les images d'une animation libre sortent sur une toile plus grande, centrée sur la toile du personnage."""
    from PIL import Image
    out = Image.new('RGBA', (case, case), (0, 0, 0, 0))
    out.alpha_composite(im, ((case - im.width) // 2, (case - im.height) // 2))
    return out


def planche(pid, dossier=None):
    """Planche du jeu : une ligne par animation et direction, cases égales, pieds sur la même ligne.
    Tags : move, windup + strike, skill, death (face, vers le bas à droite) et leurs versions « -dos » (vers le haut à
    droite) ; idle = 1re image du déplacement ; windup = 2 premières images de l'attaque ; ultimate = la spéciale. Le jeu fait les deux directions de gauche en miroir."""
    from PIL import Image
    import numpy as np
    plan, etat = charger()
    e = etat[pid]
    lignes = []
    for anim in plan['reglages']['ordre']:
        for d in plan['reglages']['directions']:
            if d in e.get('animations', {}).get(anim, {}):
                lignes.append((anim, d, images(pid, anim, d)))
    case = max(max(i.width, i.height) for _, _, imgs in lignes for i in imgs)
    case += case % 2
    larg = max(len(imgs) for _, _, imgs in lignes)
    out = Image.new('RGBA', (larg * case, len(lignes) * case), (0, 0, 0, 0))
    frames, tags = [], []
    for y, (anim, d, imgs) in enumerate(lignes):
        debut = len(frames)
        for x, im in enumerate(imgs):
            out.alpha_composite(centrer(im, case), (x * case, y * case))
            frames.append({'filename': f'{anim} {d} {x}', 'frame': {'x': x * case, 'y': y * case, 'w': case, 'h': case},
                           'duration': DUREES[anim]})
        tag = TAGS[anim] + DOS[d]
        if anim == 'attaque':
            # l'élan (windup) puis le coup, comme les planches de tools/planches.mjs
            tags.append({'name': 'windup' + DOS[d], 'from': debut, 'to': debut + 1, 'direction': 'forward', 'repeat': '1'})
            debut += 2
        tags.append({'name': tag, 'from': debut, 'to': len(frames) - 1, 'direction': 'forward',
                     **({} if anim == 'deplacement' else {'repeat': '1'})})
        if anim == 'deplacement':
            tags.append({'name': 'idle' + DOS[d], 'from': debut, 'to': debut, 'direction': 'forward'})
        if anim == 'speciale':
            tags.append({'name': 'ultimate' + DOS[d], 'from': debut, 'to': len(frames) - 1, 'direction': 'forward', 'repeat': '1'})
    # hauteur du corps et place des pieds, mesurées sur la 1re image du déplacement de face
    a = np.array(centrer(lignes[0][2][0], case))[..., 3] > 0
    ys = np.nonzero(a.any(1))[0]
    dossier = Path(dossier) if dossier else SORTIES / pid
    dossier.mkdir(parents=True, exist_ok=True)
    nom = f'heros-{pid}'
    out.save(dossier / f'{nom}.webp', 'WEBP', lossless=True, quality=100, method=6)
    meta = {'app': 'tools/pixellab/routine.py', 'image': f'{nom}.webp', 'size': {'w': out.width, 'h': out.height},
            'smooth': False, 'bodyHeight': int(ys[-1] - ys[0] + 1), 'anchor': {'x': case // 2, 'y': int(ys[-1] + 1)},
            'frameTags': tags}
    (dossier / f'{nom}.json').write_text(json.dumps({'frames': frames, 'meta': meta}, ensure_ascii=False, indent=1) + '\n')
    # normal map pour l'éclairage de l'île
    import normales
    normales.planche(dossier / f'{nom}.json')
    print('  ', dossier / f'{nom}.webp', out.size, 'corps', meta['bodyHeight'], 'px')


# ------------------------------------------------------------------ commandes ------------------------------------------------------------------
def main():
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest='cmd', required=True)
    sub.add_parser('solde')
    sub.add_parser('plan')
    l = sub.add_parser('lancer')
    l.add_argument('--etapes', type=int, default=1)
    l.add_argument('--budget', type=int)
    l.add_argument('--perso')
    l.add_argument('--anim', help="seulement cette animation (deplacement, attaque, speciale, mort)")
    for nom in ('refaire', 'valider'):
        c = sub.add_parser(nom)
        c.add_argument('perso')
        c.add_argument('anim', nargs='?')
        c.add_argument('dir', nargs='?')
    c = sub.add_parser('importer')
    c.add_argument('perso')
    c.add_argument('dossier')
    for nom in ('telecharger', 'apercu', 'cornes'):
        sub.add_parser(nom).add_argument('perso')
    c = sub.add_parser('planche')
    c.add_argument('perso')
    c.add_argument('dossier', nargs='?')
    args = ap.parse_args()

    if args.cmd == 'solde':
        print(solde()['texte'])
    elif args.cmd == 'plan':
        plan, etat = charger()
        total, par = 0, {}
        for p, anim, d in etapes(plan, etat):
            c = estimation(plan, etat, p, anim)
            total += c
            par[p['id']] = par.get(p['id'], 0) + c
        for pid, c in par.items():
            print(f'{pid:22} {c:3} générations (dépensé : {etat.get(pid, {}).get("depense", 0)})')
        print(f'total restant estimé : {total} générations')
    elif args.cmd == 'lancer':
        lancer(args)
    elif args.cmd in ('refaire', 'valider'):
        plan, etat = charger()
        e = etat[args.perso]
        statut = 'a-refaire' if args.cmd == 'refaire' else 'valide'
        if not args.anim:
            e['creation'] = statut
        for anim, dirs in e.get('animations', {}).items():
            for d, a in dirs.items():
                if (not args.anim or anim == args.anim) and (not args.dir or d == args.dir):
                    a['statut'] = statut
        sauver(etat)
    elif args.cmd == 'telecharger':
        plan, etat = charger()
        e = etat[args.perso]
        f = fiche(e['pixellab'])
        for d in plan['reglages']['directions'] + ['south']:
            telecharger_url(f['rotations'][d], SORTIES / args.perso / 'rotations' / f'{d}.png')
        for anim, dirs in e.get('animations', {}).items():
            for d, a in dirs.items():
                recuperer(args.perso, anim, d, a)
    elif args.cmd == 'importer':
        plan, etat = charger()
        avant = solde()
        importer(plan, etat, args.perso, args.dossier)
        apres = solde()
        paye = max(0, avant['restantes'] - apres['restantes'], avant['jour'] - apres['jour'])
        etat[args.perso]['depense'] = etat[args.perso].get('depense', 0) + paye
        sauver(etat)
        print('   payé :', paye)
    elif args.cmd == 'cornes':
        plan, etat = charger()
        e = etat[args.perso]
        for anim, dirs in e.get('animations', {}).items():
            for d in dirs:
                retoucher(args.perso, anim, d, e['retouche'], neuves=False)
        apercu(args.perso)
    elif args.cmd == 'apercu':
        apercu(args.perso)
    elif args.cmd == 'planche':
        planche(args.perso, args.dossier)


if __name__ == '__main__':
    main()
