import type { AsciiPreviewResult } from "../rendering/ascii-preview-result";
import type {
  TextFont,
  TextCommand,
  FontColorReplacements
} from "./text-conversion";

export class BrowserTextClient {
  private readonly worker = new Worker(
    new URL("../browser-engine/conversion-worker.ts", import.meta.url),
    { type: "module" }
  );
  private pending: {
    resolve: (value: TextFont[] | string[] | AsciiPreviewResult) => void;
    reject: (error: Error) => void;
  } | null = null;
  private timeout: number | undefined;
  private failure: Error | null = null;
  private nextId = 0;

  constructor() {
    this.worker.onmessage = ({ data }) => {
      if (data.id !== this.nextId) return;
      window.clearTimeout(this.timeout);
      const pending = this.pending;
      this.pending = null;
      if (data.error) pending?.reject(new Error(data.error));
      else pending?.resolve(data.value);
    };
    this.worker.onerror = () =>
      this.stop(new Error("The text engine stopped. Retry to reopen it."));
    this.worker.onmessageerror = () =>
      this.stop(new Error("The text engine returned an unreadable result."));
  }

  async fonts(): Promise<TextFont[]> {
    return (await this.send({
      type: "fonts"
    })) as TextFont[];
  }

  async convert(
    text: string,
    fontId: string,
    foregroundColor: string,
    colorReplacements: FontColorReplacements
  ): Promise<AsciiPreviewResult> {
    return (await this.send({
      type: "convert-text",
      text,
      fontId,
      foregroundColor,
      colorReplacements
    })) as AsciiPreviewResult;
  }

  async palette(fontId: string): Promise<string[]> {
    return (await this.send({ type: "font-palette", fontId })) as string[];
  }

  async preview(fontId: string): Promise<AsciiPreviewResult> {
    return (await this.send({
      type: "font-preview",
      fontId
    })) as AsciiPreviewResult;
  }

  dispose() {
    this.stop(new DOMException("Text processing cancelled.", "AbortError"));
  }

  private send(
    request: TextCommand
  ): Promise<TextFont[] | string[] | AsciiPreviewResult> {
    if (this.failure) return Promise.reject(this.failure);
    if (this.pending)
      return Promise.reject(
        new Error("Only one text operation can run at a time.")
      );
    return new Promise((resolve, reject) => {
      this.pending = { resolve, reject };
      this.timeout = window.setTimeout(
        () =>
          this.stop(
            new Error("The text engine took too long. Retry to reopen it.")
          ),
        30_000
      );
      this.worker.postMessage({ ...request, id: ++this.nextId });
    });
  }

  private stop(error: Error) {
    this.failure = error;
    this.worker.terminate();
    window.clearTimeout(this.timeout);
    this.pending?.reject(error);
    this.pending = null;
  }
}
