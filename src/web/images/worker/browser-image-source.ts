import {
  ColorProfile,
  ColorSpace,
  ImageMagick,
  MagickImageCollection,
  MagickReadSettings,
  type IMagickImage
} from "@imagemagick/magick-wasm";
import type { BrowserEngine } from "./browser-engine";
import { sampleRgbaImage } from "./sample-rgba-image";

// Admission ceiling, not an eager allocation or a cap on total browser RAM.
const workingBudgetInBytes = 768 * 1024 * 1024;
const maxRasterDimensionInPixels = 16_384;

/** One normalized original, kept alive by ImageMagick's documented async read callback. */
export class BrowserImageSource {
  private image: IMagickImage | null = null;
  private encodedBytes = 0;
  private sourcePixels = 0;
  private photoWidthInCells = 0;

  constructor(private readonly engine: BrowserEngine) {}

  async load(bytes: Uint8Array) {
    this.engine.ValidateSource(bytes);
    if (this.image) throw new Error("A worker owns one selected image.");
    this.encodedBytes = bytes.byteLength;
    const images = MagickImageCollection.create();
    try {
      const settings = new MagickReadSettings();
      settings.frameCount = 2;
      images.ping(bytes, settings);
      if (images.length !== 1)
        throw new Error(
          "Animated or multi-frame images are not supported by still-image conversion."
        );
      const image = images[0]!;
      this.engine.Height(image.width, image.height, 1);
      this.sourcePixels = image.width * image.height;
      this.checkBudget(0, 0);
    } finally {
      images.dispose();
    }
    const srgb = new ColorProfile(this.engine.SrgbProfile());
    const cmyk = new ColorProfile(this.engine.CmykProfile());
    // Worker termination on Clear/replacement releases the callback and all native allocations.
    await new Promise<void>((resolve, reject) => {
      const lifetime = ImageMagick.read(bytes, async (image) => {
        image.autoOrient();
        this.engine.Height(image.width, image.height, 1);
        if (!image.transformColorSpace(srgb)) {
          if (image.colorSpace === ColorSpace.CMYK)
            image.transformColorSpace(cmyk, srgb);
          else image.colorSpace = ColorSpace.sRGB;
        }
        this.image = image;
        resolve();
        await new Promise<void>(() => {});
      });
      lifetime.catch(reject);
    });
  }

  sample(columns: number, includeSourcePhoto: boolean) {
    if (!this.image) throw new Error("Load an image before converting.");
    const height = this.engine.Height(
      this.image.width,
      this.image.height,
      columns
    );
    const [cellWidth, cellHeight] = this.engine.Geometry();
    if (includeSourcePhoto) this.engine.PhotoByteLength(columns, height);
    const widthInPixels = columns * cellWidth!,
      heightInPixels = height * cellHeight!;
    if (Math.max(widthInPixels, heightInPixels) > maxRasterDimensionInPixels)
      throw new Error(
        "This output exceeds the browser raster side limit. Choose fewer columns or a shorter image."
      );
    this.checkBudget(
      widthInPixels * heightInPixels,
      columns * height,
      includeSourcePhoto
    );
    const rgba = sampleRgbaImage(this.image, columns, height);
    // null reuses the one prepared .NET photo; an empty buffer explicitly releases it.
    let sourcePhotoRgba: Uint8Array | null = null;
    if (!includeSourcePhoto) {
      sourcePhotoRgba = new Uint8Array();
      this.photoWidthInCells = 0;
    } else if (this.photoWidthInCells !== columns) {
      sourcePhotoRgba = sampleRgbaImage(
        this.image,
        widthInPixels,
        heightInPixels
      );
      this.photoWidthInCells = columns;
    }
    return { rgba, sourcePhotoRgba, height, widthInPixels, heightInPixels };
  }

  private checkBudget(
    pixels: number,
    cells: number,
    includeSourcePhoto = false
  ) {
    // Conservative admission includes source/clone, interop copies, raster, presentation and export scratch.
    const bytes =
      this.encodedBytes +
      this.sourcePixels * 32 +
      pixels * (includeSourcePhoto ? 27 : 19) +
      cells * 256;
    if (bytes > workingBudgetInBytes)
      throw new Error(
        "This image and output size exceed the browser working-buffer budget. Choose a smaller image or fewer columns."
      );
  }
}
