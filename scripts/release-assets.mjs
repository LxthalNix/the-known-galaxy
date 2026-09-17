import { readdir, rm, access } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Only generated build output is cleaned; source assets remain available to local experiments. */
export async function finishReleaseAssets(dir, galleries, root = '.') {
  const output = fileURLToPath(dir);
  if (resolve(output) !== resolve(root, 'dist')) throw new Error('Release cleanup only supports this workspace dist directory.');
  for (const folder of ['images/experiment', 'fonts/experiment']) {
    const target = resolve(output, folder);
    if (!target.startsWith(resolve(output) + sep)) throw new Error('Asset cleanup escapes dist.');
    await rm(target, { recursive: true, force: true });
  }
  const allowed = new Set(galleries.map(image => image.thumbnail));
  const thumbnailFolder = resolve(output, 'images/gallery-thumbnails');
  for (const entry of await readdir(thumbnailFolder).catch(error => { if (error.code === 'ENOENT') return []; throw error; })) {
    if (/^[a-f0-9]{16}\.webp$/.test(entry) && !allowed.has(`/images/gallery-thumbnails/${entry}`)) await rm(resolve(thumbnailFolder, entry));
  }
  for (const image of galleries) {
    await access(resolve(output, image.image.replace(/^\//, '')));
    if (image.thumbnail) await access(resolve(output, image.thumbnail.replace(/^\//, '')));
  }
  for (const file of ['images/branding/tkg-logo.png', 'images/factions/jedi_icon.png', 'images/factions/jedi_sith.png', 'images/factions/sith_icon.png']) await access(resolve(output, file));
}
