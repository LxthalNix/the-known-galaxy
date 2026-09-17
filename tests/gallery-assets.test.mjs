import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { prepareGalleryAssets, galleryThumbnail } from '../scripts/gallery-assets.mjs';

test('a clean archive generates gallery derivatives before page rendering and validates asset paths', async t => {
  const root = await mkdtemp(join(tmpdir(), 'tkg-gallery-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, 'src/content/events'), { recursive: true });
  await mkdir(join(root, 'public/images'), { recursive: true });
  const image = { image: '/images/test.png', alt: 'Synthetic test image' };
  await writeFile(join(root, 'public/images/test.png'), await sharp({ create: { width: 1200, height: 800, channels: 3, background: '#123456' } }).png().toBuffer());
  await writeFile(join(root, 'src/content/events/test.md'), '---\ndraft: false\ngallery:\n  - image: /images/test.png\n    alt: Synthetic test image\n---\nArticle');
  await prepareGalleryAssets(root);
  const resolved = await galleryThumbnail(image, root);
  const metadata = await sharp(await readFile(join(root, 'public', resolved.thumbnail))).metadata();
  assert.equal(metadata.format, 'webp');
  assert.ok(metadata.width <= 480 && metadata.height <= 300);
  await assert.rejects(galleryThumbnail({ image: '/../outside.png' }, root), /escapes/);
  await assert.rejects(galleryThumbnail({ image: '/images/missing.png' }, root), /ENOENT/);
});
