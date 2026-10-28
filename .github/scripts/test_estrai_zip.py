#!/usr/bin/env python3
"""Test di estrai_zip.py. Uso: python3 -I .github/scripts/test_estrai_zip.py"""
import os
import stat
import sys
import tempfile
import unittest
import zipfile

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import estrai_zip as ez  # noqa: E402


def crea_zip(cartella, voci, nome='prova.zip'):
    """voci: lista di (nome, contenuto) oppure (nome, destinazione, 'symlink')."""
    path = os.path.join(cartella, nome)
    with zipfile.ZipFile(path, 'w') as z:
        for v in voci:
            if len(v) == 3:
                info = zipfile.ZipInfo(v[0])
                info.external_attr = (stat.S_IFLNK | 0o777) << 16
                z.writestr(info, v[1])
            else:
                z.writestr(v[0], v[1])
    return path


class TestEstraiZip(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.dir = self.tmp.name
        self.dest = os.path.join(self.dir, 'repo')
        os.makedirs(self.dest)

    def tearDown(self):
        self.tmp.cleanup()

    def rifiuta(self, voci):
        z = crea_zip(self.dir, voci)
        with self.assertRaises(ez.ZipNonValido):
            ez.estrai(z, self.dest)

    def test_cartella_unica_qualsiasi_nome_viene_aperta(self):
        for radice in ('nocturna', 'Nocturna-main'):
            z = crea_zip(self.dir, [(f'{radice}/package.json', '{}'), (f'{radice}/src/App.tsx', 'x')])
            scritti, _ = ez.estrai(z, self.dest)
            self.assertEqual(sorted(scritti), ['package.json', 'src/App.tsx'])
            self.assertFalse(os.path.exists(os.path.join(self.dest, radice)))

    def test_file_in_radice(self):
        z = crea_zip(self.dir, [('package.json', '{}'), ('src/main.tsx', 'x')])
        scritti, _ = ez.estrai(z, self.dest)
        self.assertEqual(sorted(scritti), ['package.json', 'src/main.tsx'])

    def test_ignora_github_git_node_modules_e_generati(self):
        z = crea_zip(self.dir, [
            ('nocturna/.github/workflows/deploy.yml', 'malevolo'),
            ('nocturna/src/.github/x', 'y'),
            ('nocturna/.git/config', 'y'),
            ('nocturna/node_modules/a/index.js', 'y'),
            ('nocturna/dist/index.html', 'y'),
            ('nocturna/firestore.rules', 'allow read, write: if true;'),
            ('nocturna/altro.zip', 'y'),
            ('nocturna/package.json', '{}'),
        ])
        scritti, ignorati = ez.estrai(z, self.dest)
        self.assertEqual(scritti, ['package.json'])
        self.assertEqual(len(ignorati), 7)  # .github, src/.github, .git, node_modules, dist, firestore.rules, zip
        self.assertFalse(os.path.exists(os.path.join(self.dest, '.github')))
        self.assertFalse(os.path.exists(os.path.join(self.dest, 'firestore.rules')))

    def test_ignora_varianti_di_git_e_dist_solo_in_radice(self):
        z = crea_zip(self.dir, [
            ('nocturna/sub/.git', 'gitdir: ../malevolo'),
            ('nocturna/.GIT/config', '[core]'),
            ('nocturna/.Github/workflows/x.yml', 'y'),
            ('nocturna/.gitmodules', '[submodule]'),
            ('nocturna/sub/file.ts', 'x'),
            ('nocturna/src/dist/util.ts', 'x'),
        ])
        scritti, ignorati = ez.estrai(z, self.dest)
        self.assertEqual(sorted(scritti), ['src/dist/util.ts', 'sub/file.ts'])
        self.assertEqual(len(ignorati), 4)

    def test_rifiuta_symlink(self):
        self.rifiuta([('nocturna/package.json', '{}'), ('nocturna/segreto', '/home/runner/work/_temp/sa.json', 'symlink')])

    def test_rifiuta_path_traversal(self):
        self.rifiuta([('../../fuori.txt', 'x')])
        self.rifiuta([('nocturna/../../fuori.txt', 'x')])

    def test_rifiuta_percorso_assoluto(self):
        self.rifiuta([('/etc/passwd', 'x')])
        self.rifiuta([('C:/windows/x', 'x')])

    def test_rifiuta_backslash_e_controllo(self):
        self.rifiuta([('nocturna\\..\\x', 'x')])
        self.rifiuta([('nocturna/a\nb', 'x')])

    def test_non_scrive_attraverso_link_esistenti(self):
        fuori = os.path.join(self.dir, 'fuori')
        os.makedirs(fuori)
        os.symlink(fuori, os.path.join(self.dest, 'src'))
        self.rifiuta([('src/App.tsx', 'x'), ('package.json', '{}')])
        self.assertEqual(os.listdir(fuori), [])

    def test_rifiuta_zip_troppo_grande(self):
        vecchio = ez.MAX_TOTALE
        ez.MAX_TOTALE = 10
        try:
            self.rifiuta([('package.json', 'x' * 100)])
        finally:
            ez.MAX_TOTALE = vecchio

    def test_rifiuta_zip_vuoto_o_solo_ignorati(self):
        self.rifiuta([('nocturna/.github/x', 'y')])

    def test_file_senza_permessi_di_esecuzione(self):
        z = os.path.join(self.dir, 'x.zip')
        with zipfile.ZipFile(z, 'w') as zf:
            info = zipfile.ZipInfo('script.sh')
            info.external_attr = (stat.S_IFREG | 0o755) << 16
            zf.writestr(info, 'echo')
        ez.estrai(z, self.dest)
        self.assertEqual(os.stat(os.path.join(self.dest, 'script.sh')).st_mode & 0o777, 0o644)

    def test_zip_corrotto(self):
        p = os.path.join(self.dir, 'rotto.zip')
        with open(p, 'wb') as f:
            f.write(b'non sono uno zip')
        self.assertEqual(ez.main(['x', p, self.dest]), 1)


if __name__ == '__main__':
    unittest.main(verbosity=1)
