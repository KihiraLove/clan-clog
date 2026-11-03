/** Compatibility images derive only from the verified, stored first-frame WebP. */
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import sharp from 'sharp';
import { ApiError } from './types.js';
import * as appText from '@clog/domain';

export type BrandingIconFormat = 'webp' | 'ico' | 'png';
export class BrandingIcons {
  private readonly cache = new Map<string, Promise<Buffer>>();
  private pending = 0;
  async fallback() {
    return readFile(new URL('../../web/public/favicon.webp', import.meta.url));
  }
  async image(source: Buffer, format: BrandingIconFormat) {
    if (format === 'webp') return source;
    const key = createHash('sha256').update(source).digest('hex') + format;
    const prior = this.cache.get(key);
    if (prior) return prior;
    if (this.pending >= 2)
      throw new ApiError(503, appText.apiBrandingRoutesLogoStorageUnavailable);
    this.pending++;
    const work = (async () => {
      try {
        const png = await sharp(source, {
          limitInputPixels: 512 * 512,
          pages: 1,
        })
          .resize(format === 'ico' ? 64 : 180, format === 'ico' ? 64 : 180, {
            fit: 'contain',
            background: '#00000000',
          })
          .png()
          .timeout({ seconds: 5 })
          .toBuffer();
        if (format === 'png') return png;
        // ICO directory containing one correctly labelled 64px PNG image.
        const header = Buffer.alloc(22);
        header.writeUInt16LE(1, 2);
        header.writeUInt16LE(1, 4);
        header[6] = header[7] = 64;
        header.writeUInt16LE(1, 10);
        header.writeUInt16LE(32, 12);
        header.writeUInt32LE(png.length, 14);
        header.writeUInt32LE(22, 18);
        return Buffer.concat([header, png]);
      } finally {
        this.pending--;
      }
    })();
    this.cache.set(key, work);
    if (this.cache.size > 8) this.cache.delete(this.cache.keys().next().value!);
    try {
      return await work;
    } catch (error) {
      this.cache.delete(key);
      throw error;
    }
  }
}
