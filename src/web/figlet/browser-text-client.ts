import { WorkerRequests } from "../browser-engine/worker-requests";
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
  private nextId = 0;
  private readonly requests = new WorkerRequests<
    TextFont[] | string[] | AsciiPreviewResult
  >(
    this.worker,
    {
      stopped: "The text engine stopped. Retry to reopen it.",
      unreadable: "The text engine returned an unreadable result.",
      busy: "Only one text operation can run at a time.",
      timeout: "The text engine took too long. Retry to reopen it."
    },
    (id) => id === this.nextId
  );

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
    this.requests.stop(
      new DOMException("Text processing cancelled.", "AbortError")
    );
  }

  private send(
    request: TextCommand
  ): Promise<TextFont[] | string[] | AsciiPreviewResult> {
    return this.requests.send(() => ({ ...request, id: ++this.nextId }));
  }
}
