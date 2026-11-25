// The Copper Ladle — hand-in for make.fun's best cooking game bounty.
// A Node 22 program, standard library only. It takes this repository's
// game/ (plain static files: index.html plus ES modules, no build step, no
// network) and screenshots/ and lays them out in /output, then writes
// /output/dossier.json with the kit's vendored dossier library so the judge
// can read the game. Run twice, it writes the same bytes twice.
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// game/ first: the whole playable game, files and folders as they stand.
mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });

// screenshots/ next: 3 or 4 captures of the game itself, first by name the
// cover. Refuse a layout the gate would refuse rather than handing in a
// broken entry: more than four shots, or one over the 256 KiB cap.
const shotsDir = join(here, 'screenshots');
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(shotsDir)) {
  const shots = readdirSync(shotsDir).filter((f) => !f.startsWith('.')).sort();
  if (shots.length > 4) throw new Error(`too many screenshots: ${shots.length} (max 4)`);
  cpSync(shotsDir, join(out, 'screenshots'), { recursive: true });
}

// The dossier the judge reads: the same caps the gate scores against, so
// what this program writes is what the gate accepts (game at most 993
// files / 48 MiB, paths at most 1000 bytes, dossier text at most 160 KiB).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
