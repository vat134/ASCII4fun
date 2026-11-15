import { browserEngineTimeoutMs } from "./browser-engine";

/** One in-flight request; source clients retain their protocol and lifecycle rules. */
export class WorkerRequests<Result, Request extends object = object> {
  private pending: {
    resolve: (result: Result) => void;
    reject: (error: Error) => void;
  } | null = null;
  private timer: ReturnType<typeof globalThis.setTimeout> | undefined;
  private failure: Error | null = null;

  constructor(
    private readonly worker: Worker,
    private readonly messages: {
      stopped: string;
      unreadable: string;
      busy: string;
      timeout: string;
    },
    acceptsReply: (id: number) => boolean = () => true
  ) {
    worker.onmessage = ({ data }) => {
      if (!acceptsReply(data.id)) return;
      globalThis.clearTimeout(this.timer);
      const pending = this.pending;
      this.pending = null;
      if (data.error) pending?.reject(new Error(data.error));
      else pending?.resolve(data.value as Result);
    };
    worker.onerror = () => this.stop(new Error(messages.stopped));
    worker.onmessageerror = () => this.stop(new Error(messages.unreadable));
  }

  send(
    message: Request | (() => Request),
    transfer: Transferable[] = []
  ): Promise<Result> {
    if (this.failure) return Promise.reject(this.failure);
    if (this.pending) return Promise.reject(new Error(this.messages.busy));
    return new Promise((resolve, reject) => {
      this.pending = { resolve, reject };
      this.timer = globalThis.setTimeout(
        () => this.stop(new Error(this.messages.timeout)),
        browserEngineTimeoutMs
      );
      this.worker.postMessage(
        typeof message === "function" ? message() : message,
        transfer
      );
    });
  }

  stop(error: Error) {
    this.failure = error;
    globalThis.clearTimeout(this.timer);
    this.worker.terminate();
    this.pending?.reject(error);
    this.pending = null;
  }
}
