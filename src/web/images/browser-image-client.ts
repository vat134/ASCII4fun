import type {
  CharacterImageOptions,
  ImageConversionResult
} from "./image-conversion";

type Pending = {
  resolve: (result: ImageConversionResult | null) => void;
  reject: (error: Error) => void;
};

/** Source-owned worker; disposal cancels startup, decoding and conversion together. */
export class BrowserImageClient {
  private readonly worker: Worker;
  private pending: Pending | null = null;
  private timeout: number | undefined;
  private disposed = false;
  private failure: Error | null = null;
  private readonly ready: Promise<void>;

  constructor(file: File) {
    this.worker = new Worker(
      new URL("../browser-engine/conversion-worker.ts", import.meta.url),
      { type: "module" }
    );
    this.worker.onmessage = ({ data }) => {
      window.clearTimeout(this.timeout);
      const pending = this.pending;
      this.pending = null;
      if (data.error) pending?.reject(new Error(data.error));
      else pending?.resolve(data.value as ImageConversionResult | null);
    };
    this.worker.onerror = () =>
      this.fail(
        new Error("The browser engine stopped. Clear the image and retry.")
      );
    this.worker.onmessageerror = () =>
      this.fail(new Error("The browser engine returned an unreadable result."));
    this.ready = this.load(file);
  }

  async convert(
    options: CharacterImageOptions
  ): Promise<ImageConversionResult> {
    await this.ready;
    const result = await this.send({ id: 1, type: "convert", options });
    if (!result) throw new Error("The browser engine returned no artwork.");
    return result;
  }

  dispose() {
    this.disposed = true;
    this.fail(new DOMException("Image processing cancelled.", "AbortError"));
  }

  private async load(file: File) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    await this.send({ id: 0, type: "load", bytes }, [bytes.buffer]);
  }

  private send(
    message: object,
    transfer: Transferable[] = []
  ): Promise<ImageConversionResult | null> {
    if (this.disposed || this.failure)
      return Promise.reject(
        this.failure ?? new Error("The image was cleared.")
      );
    if (this.pending)
      return Promise.reject(
        new Error("Only one image operation can run at a time.")
      );
    return new Promise((resolve, reject) => {
      this.pending = { resolve, reject };
      this.timeout = window.setTimeout(
        () =>
          this.fail(
            new Error(
              "The browser engine took too long. Retry or choose a smaller image."
            )
          ),
        30_000
      );
      this.worker.postMessage(message, transfer);
    });
  }

  private fail(error: Error) {
    window.clearTimeout(this.timeout);
    this.failure = error;
    this.worker.terminate();
    this.pending?.reject(error);
    this.pending = null;
  }
}
