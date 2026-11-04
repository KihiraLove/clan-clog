import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { test } from 'node:test';
import sharp from 'sharp';

const root = new URL('../', import.meta.url);
test('all six official OSRS helmet assets retain their pinned native transparent lossless bytes',async()=>{
 const directory=new URL('apps/web/public/game-modes/',root),provenance=JSON.parse(await readFile(new URL('provenance.json',directory),'utf8'));
 const modes=['ironman','ultimate_ironman','hardcore_ironman','group_ironman','hardcore_group_ironman','unranked_group_ironman'];
 assert.equal(provenance.sourcePage,'https://support.runescape.com/hc/en-gb/articles/360001358698-Chat-badges');assert.equal(provenance.assets.length,6);
 assert.deepEqual(provenance.assets.map(asset=>asset.gameMode).sort(),modes.sort());
 for(const asset of provenance.assets){
  assert.equal(asset.file,asset.gameMode+'.webp');assert.match(asset.sourceUrl,/^https:\/\/support\.runescape\.com\/hc\/article_attachments\/[0-9]+$/u);assert.match(asset.sourceSha256,/^[a-f0-9]{64}$/u);
  const bytes=await readFile(new URL(asset.file,directory)),meta=await sharp(bytes).metadata();assert.equal(createHash('sha256').update(bytes).digest('hex'),asset.sha256);assert.equal(bytes.length,asset.bytes);assert.equal(bytes.toString('ascii',8,16),'WEBPVP8L');assert.equal(meta.width,asset.width);assert.equal(meta.height,asset.height);assert.equal(meta.hasAlpha,true);assert.ok(meta.width<=16&&meta.height<=16);
 }
});
test('the shared default item icon preserves the exact supplied lossless transparent artwork', async () => {
  const provenance = JSON.parse(
    await readFile(new URL('catalog/default-icon.json', root), 'utf8'),
  );
  assert.equal(provenance.path, '/catalog/default.webp');
  assert.equal(provenance.file, 'apps/web/public/catalog/default.webp');
  const bytes = await readFile(new URL(provenance.file, root));
  assert.equal(bytes.length, 642);
  assert.equal(provenance.bytes, bytes.length);
  const digest = createHash('sha256').update(bytes).digest('hex');
  assert.equal(
    digest,
    '29100989e785983a128c97ddfa5b4dda68d52bb1c6d4c7f929bd746503d8fb53',
  );
  assert.equal(provenance.sha256, digest);
  assert.equal(
    provenance.source.pngSha256,
    '087167b1fce4fc3e491718dc41bfaad8605df24add14aa0cea192abdf0c20bf0',
  );
  assert.equal(bytes.toString('ascii', 8, 16), 'WEBPVP8L');
  const metadata = await sharp(bytes).metadata();
  assert.equal(metadata.format, 'webp');
  assert.equal(metadata.width, 26);
  assert.equal(metadata.height, 26);
  assert.equal(metadata.hasAlpha, true);
  assert.equal(provenance.width, metadata.width);
  assert.equal(provenance.height, metadata.height);
});
async function files(directory) {
  const entries = await readdir(new URL(directory, root), {
    withFileTypes: true,
  });
  return (
    await Promise.all(
      entries.map((entry) =>
        entry.isDirectory()
          ? files(directory + entry.name + '/')
          : [directory + entry.name],
      ),
    )
  ).flat();
}
test('bundled production and fixture image files are readable WebP only', async () => {
  const paths = [
    ...(await files('apps/web/public/')),
    ...(await files('apps/web/tests/support/items/')),
  ];
  let images = 0;
  for (const path of paths) {
    assert.doesNotMatch(path, /\.(png|svg|ico|jpe?g|gif|avif|tiff?)$/iu, path);
    if (!path.endsWith('.webp')) continue;
    const metadata = await sharp(
      await readFile(new URL(path, root)),
    ).metadata();
    assert.equal(metadata.format, 'webp', path);
    assert.ok(metadata.width && metadata.height, path);
    images++;
  }
  assert.ok(images > 2000);
});
test('skill provenance separates pinned input hashes from lossless WebP output', async () => {
  const provenance = JSON.parse(
    await readFile(
      new URL('apps/web/public/skills/provenance.json', root),
      'utf8',
    ),
  );
  for (const asset of provenance.assets) {
    assert.match(asset.file, /\.webp$/u);
    assert.match(asset.sourcePath, /\.png$/u);
    assert.match(asset.sourceSha256, /^[a-f0-9]{64}$/u);
    const bytes = await readFile(
      new URL('apps/web/public/skills/' + asset.file, root),
    );
    assert.equal(
      createHash('sha256').update(bytes).digest('hex'),
      asset.sha256,
    );
    assert.equal(bytes.toString('ascii', 8, 16), 'WEBPVP8L');
  }
});
