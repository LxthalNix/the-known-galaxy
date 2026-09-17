import { readFile, writeFile, mkdir, readdir, access } from 'node:fs/promises';
import { resolve, dirname, sep } from 'node:path';
import { createHash } from 'node:crypto';
import YAML from 'yaml';
import sharp from 'sharp';

export async function galleryThumbnail(image, root = '.', generate = false) {
  const publicRoot = resolve(root, 'public');
  const source = resolve(publicRoot, image.image.replace(/^\//, ''));
  if (!source.startsWith(publicRoot + sep)) throw new Error('Gallery image escapes public/.');
  const input = await readFile(source);
  if (image.thumbnail) {
    const thumbnailPath = resolve(publicRoot, image.thumbnail.replace(/^\//, ''));
    if (!thumbnailPath.startsWith(publicRoot + sep)) throw new Error('Gallery thumbnail escapes public/.');
    await access(thumbnailPath);
    return image;
  }
  const digest = createHash('sha256').update(input).digest('hex').slice(0, 16);
  const thumbnail = `/images/gallery-thumbnails/${digest}.webp`;
  if (generate) {
    const target = resolve(publicRoot, thumbnail.slice(1));
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, await sharp(input).resize(480, 300, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 78 }).toBuffer());
  }
  return { ...image, thumbnail };
}

/** Runs before Astro copies public assets, including on a first clean build. */
export async function prepareGalleryAssets(root = '.', experiments = false) {
  async function walk(folder) {
    return (await Promise.all((await readdir(folder, { withFileTypes: true })).map(entry => entry.isDirectory()
      ? walk(resolve(folder, entry.name)) : entry.name.endsWith('.md') ? [resolve(folder, entry.name)] : []))).flat();
  }
  const images = [];
  for (const file of await walk(resolve(root, 'src/content/events'))) {
    const content = await readFile(file, 'utf8');
    const match = content.replaceAll('\r\n', '\n').match(/^---\n([\s\S]*?)\n---/);
    if (!match) throw new Error(`Missing metadata in ${file}.`);
    const data = YAML.parse(match[1], { maxAliasCount: 10 });
    if (!data.draft && !data.demo) {
      if (data.image) {
        const publicRoot = resolve(root, 'public'), imagePath = resolve(publicRoot, data.image.replace(/^\//, ''));
        if (!imagePath.startsWith(publicRoot + sep)) throw new Error('Main image escapes public/.');
        await access(imagePath);
      }
      images.push(...(data.gallery ?? []));
    }
  }
  if (experiments) images.push(...['map', 'teaching', 'alignment'].map(name => ({ image: `/images/experiment/reference-${name}.png`, alt: 'Local demonstration' })));
  return Promise.all(images.map(image => galleryThumbnail(image, root, true)));
}
