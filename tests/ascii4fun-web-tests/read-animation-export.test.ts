import { beforeAll, expect, jest, test } from "@jest/globals";
import { ReadableStream, TextDecoderStream } from "node:stream/web";
import { TextEncoder } from "node:util";
import { readAnimationExport } from "../../src/web/animations/read-animation-export";

beforeAll(() => {
  Object.defineProperty(globalThis, "TextDecoderStream", {
    configurable: true,
    value: TextDecoderStream
  });
});
function response(chunks: string[], contentType = "application/x-ndjson") {
  const encoder = new TextEncoder();
  return {
    ok: true,
    headers: { get: () => contentType },
    body: new ReadableStream({
      start(controller) {
        for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
        controller.close();
      }
    })
  } as unknown as Response;
}

test("reads progress and exact media across arbitrary chunk boundaries", async () => {
  const progress = jest.fn();
  const bytes = await readAnimationExport(
    response([
      '{"type":"prog',
      'ress","completedFrames":2}\n{"type":"complete","gif":"AQID"}\n'
    ]),
    "gif",
    new AbortController().signal,
    progress
  );
  expect([...bytes]).toEqual([1, 2, 3]);
  expect(progress).toHaveBeenCalledWith(2);
});

test.each([
  "null\n",
  "[]\n",
  '{"type":"progress","completedFrames":"2"}\n',
  '{"type":"progress","completedFrames":-1}\n',
  '{"type":"progress","completedFrames":0.5}\n',
  '{"type":"unknown"}\n',
  '{"type":"error","message":42}\n'
])(
  "rejects malformed event shapes before reporting progress: %s",
  async (line) => {
    const progress = jest.fn();
    await expect(
      readAnimationExport(
        response([line, '{"type":"complete","gif":"AQID"}\n']),
        "gif",
        new AbortController().signal,
        progress
      )
    ).rejects.toThrow("invalid server response");
    expect(progress).not.toHaveBeenCalled();
  }
);

test.each([
  '{"type":"progress","completedFrames":3}\n',
  '{"type":"unknown"}\n',
  '{"type":"complete","gif":"AQID"}\n',
  '{"type":"progress"'
])("rejects content after the terminal event: %s", async (trailing) => {
  await expect(
    readAnimationExport(
      response(['{"type":"complete","gif":"AQID"}\n', trailing]),
      "gif",
      new AbortController().signal,
      jest.fn()
    )
  ).rejects.toThrow();
});

test("accepts MP4 media with a case-insensitive parameterized response type", async () => {
  const bytes = await readAnimationExport(
    response(
      ['{"type":"complete","video":"AQID"}\n'],
      "Application/X-NDJSON; charset=utf-8"
    ),
    "mp4",
    new AbortController().signal,
    jest.fn()
  );
  expect([...bytes]).toEqual([1, 2, 3]);
});

test("rejects a response type that merely contains the expected media type", async () => {
  await expect(
    readAnimationExport(
      response(
        ['{"type":"complete","gif":"AQID"}\n'],
        "application/x-ndjson-other"
      ),
      "gif",
      new AbortController().signal,
      jest.fn()
    )
  ).rejects.toThrow("unexpected response");
});

test("preserves cancellation after progress instead of reporting interrupted media", async () => {
  const controller = new AbortController();
  let cancelled = false;
  const progress = () => {
    cancelled = true;
    controller.abort();
  };
  await expect(
    readAnimationExport(
      response(['{"type":"progress","completedFrames":1}\n']),
      "gif",
      controller.signal,
      progress
    )
  ).rejects.toMatchObject({ name: "AbortError" });
  expect(cancelled).toBe(true);
});
