#!/usr/bin/env python3
"""Estrae in modo sicuro uno zip di aggiornamento di Nocturna in una cartella.

Uso: python3 -I .github/scripts/estrai_zip.py <file.zip> <cartella-di-destinazione>

Regole:
- un solo zip alla volta, al massimo 50 MB compressi, 200 MB estratti e 5000 voci;
- rifiuta symlink, percorsi assoluti, percorsi con '..', backslash e caratteri di controllo;
- se tutte le voci stanno in un'unica cartella (es. 'nocturna/' o 'Nocturna-main/') la "apre";
- ignora .git, .github, .gitmodules, node_modules e altri zip ovunque si trovino, dist e file generati in radice;
- scrive solo file regolari, senza permessi di esecuzione, e non segue mai link già presenti.
Questo script non esegue nulla di ciò che è contenuto nello zip.
"""
import os
import stat
import sys
import zipfile

MAX_ZIP = 50 * 1024 * 1024
MAX_TOTALE = 200 * 1024 * 1024
MAX_VOCI = 5000
# Ignorati a qualsiasi profondità (confronto senza maiuscole: '.GIT', '.Github', file '.git' nei sottoprogetti).
IGNORA_OVUNQUE = {'.git', '.github', '.gitmodules', 'node_modules', '__macosx', '.ds_store'}
# Ignorati solo nella cartella principale (file generati dalla build o dalla pubblicazione).
IGNORA_IN_RADICE = {'dist', 'dev-dist', 'firestore.rules', '.firebaserc'}


class ZipNonValido(Exception):
    pass


def _parti(nome):
    if '\\' in nome or any(ord(c) < 32 for c in nome):
        raise ZipNonValido(f'nome non ammesso: {nome!r}')
    if nome.startswith('/') or (len(nome) > 1 and nome[1] == ':'):
        raise ZipNonValido(f'percorso assoluto: {nome!r}')
    parti = [p for p in nome.split('/') if p not in ('', '.')]
    if '..' in parti:
        raise ZipNonValido(f'percorso con "..": {nome!r}')
    return parti


def estrai(zip_path, dest):
    if os.path.getsize(zip_path) > MAX_ZIP:
        raise ZipNonValido('lo zip supera 50 MB')
    with zipfile.ZipFile(zip_path) as z:
        voci = z.infolist()
        if len(voci) > MAX_VOCI:
            raise ZipNonValido(f'troppe voci ({len(voci)})')
        if sum(v.file_size for v in voci) > MAX_TOTALE:
            raise ZipNonValido('il contenuto estratto supera 200 MB')
        elenco = []
        for v in voci:
            modo = v.external_attr >> 16
            if stat.S_ISLNK(modo):
                raise ZipNonValido(f'symlink non ammesso: {v.filename!r}')
            parti = _parti(v.filename)
            if parti:
                elenco.append((v, parti))
        # Cartella unica di primo livello (qualsiasi nome): la si "apre".
        primi = {p[0] for _, p in elenco}
        if len(primi) == 1 and all(len(p) > 1 or v.is_dir() for v, p in elenco):
            elenco = [(v, p[1:]) for v, p in elenco if len(p) > 1]
        scritti, ignorati = [], []
        dest_reale = os.path.realpath(dest)
        for v, parti in elenco:
            if v.is_dir():
                continue
            rel = '/'.join(parti)
            if {p.casefold() for p in parti} & IGNORA_OVUNQUE or parti[0] in IGNORA_IN_RADICE \
                    or parti[-1].casefold().endswith('.zip'):
                ignorati.append(rel)
                continue
            target = os.path.join(dest_reale, *parti)
            cartella = os.path.dirname(target)
            # Nessun componente già esistente può essere un link (evita di scrivere fuori da dest).
            cur = dest_reale
            for p in parti[:-1]:
                cur = os.path.join(cur, p)
                if os.path.islink(cur) or (os.path.exists(cur) and not os.path.isdir(cur)):
                    raise ZipNonValido(f'conflitto con un percorso esistente: {rel!r}')
            if os.path.islink(target) or os.path.isdir(target):
                raise ZipNonValido(f'conflitto con un percorso esistente: {rel!r}')
            if os.path.commonpath([dest_reale, os.path.realpath(cartella)]) != dest_reale:
                raise ZipNonValido(f'percorso fuori dalla destinazione: {rel!r}')
            os.makedirs(cartella, exist_ok=True)
            with z.open(v) as src, open(target, 'wb') as out:
                letti = 0
                while True:
                    blocco = src.read(1 << 20)
                    if not blocco:
                        break
                    letti += len(blocco)
                    if letti > v.file_size:
                        raise ZipNonValido(f'dimensione dichiarata falsa: {rel!r}')
                    out.write(blocco)
            os.chmod(target, 0o644)
            scritti.append(rel)
        if not scritti:
            raise ZipNonValido('lo zip non contiene file utilizzabili')
        return scritti, ignorati


def main(argv):
    if len(argv) != 3:
        print('Uso: estrai_zip.py <file.zip> <destinazione>', file=sys.stderr)
        return 2
    try:
        scritti, ignorati = estrai(argv[1], argv[2])
    except (ZipNonValido, zipfile.BadZipFile) as e:
        print(f'::error::Zip rifiutato: {e}')
        return 1
    print(f'Estratti {len(scritti)} file.')
    for r in ignorati:
        print(f'::warning::Ignorato: {r}')
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv))
