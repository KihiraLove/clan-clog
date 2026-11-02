import * as appText from '@clog/domain';
/** Private screenshots: bounded PNG decoding and durable, metadata-free WebP files. */
import sharp from 'sharp';
import { IconStorage } from './icon-storage.js';
import { ApiError } from './types.js';
export const MAX_SCREENSHOT_BYTES = 10 * 1024 * 1024;
export async function decodeScreenshot(input: Buffer, mime: string) {
  if (!input.length || input.length > MAX_SCREENSHOT_BYTES)
    throw new ApiError(
      413,
      appText.apiProofStorageChooseAPngScreenshotUpTo10MiB,
    );
  if (mime !== 'image/png')
    throw new ApiError(400, appText.apiProofStorageChooseAPngScreenshot);
  try {
    const decoder = sharp(input, {
      limitInputPixels: 32 * 1024 * 1024,
      failOn: 'warning',
      animated: true,
    });
    const metadata = await decoder.metadata();
    if (
      metadata.format !== 'png' ||
      !metadata.width ||
      !metadata.height ||
      metadata.width > 8192 ||
      metadata.height > 8192 ||
      (metadata.pages ?? 1) !== 1
    )
      throw new Error(appText.apiProofStorageInvalidScreenshot);
    const { data, info } = await decoder
      .webp({ lossless: true, effort: 2 })
      .toBuffer({ resolveWithObject: true });
    if (data.length > MAX_SCREENSHOT_BYTES)
      throw new Error(appText.apiProofStorageDecodedScreenshotTooLarge);
    return { bytes: data, width: info.width, height: info.height };
  } catch {
    throw new ApiError(
      400,
      appText.apiProofStorageScreenshotMustBeAValidStillPngAtMost8192,
    );
  }
}
export class ProofStorage extends IconStorage {
  protected override decode(input: Buffer, mime: string) {
    return decodeScreenshot(input, mime);
  }
}
