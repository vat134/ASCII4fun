import { afterEach, beforeEach, expect, jest, test } from "@jest/globals";
import { act, render, screen } from "@testing-library/react";
import { VirtuosoGridMockContext } from "react-virtuoso";
import { FontGallery } from "../../src/web/figlet/font-gallery";
import { FontCard } from "../../src/web/figlet/font-card";
import { useTextConversion } from "../../src/web/figlet/use-text-conversion";
import type { AsciiPreviewResult } from "../../src/web/rendering/ascii-preview-result";

const mockRequests: string[] = [];
let mockPending: {
  id: string;
  resolve: (result: AsciiPreviewResult) => void;
  reject: (error: Error) => void;
} | null = null;
let retainedResults = 0;
const surfaces = new Set<PreviewSurface>();
const painted = new Map<HTMLCanvasElement, number>();
const resizeCallbacks = new Map<Element, ResizeObserverCallback>();

jest.mock("../../src/web/figlet/browser-text-client", () => ({
  BrowserTextClient: class {
    fonts = async () =>
      Array.from({ length: 33 }, (_, index) => ({
        id: `font-${index}`,
        name: `Font ${index}`,
        category: "Banners",
        preview: null
      }));
    palette = async () => [];
    convert = async () => mockArtwork("font-0");
    preview = (id: string) => {
      mockRequests.push(id);
      return new Promise<AsciiPreviewResult>((resolve, reject) => {
        mockPending = { id, resolve, reject };
      });
    };
    dispose = () => {};
  }
}));

function mockArtwork(id: string): AsciiPreviewResult {
  return {
    text: "A",
    widthInCells: 1,
    heightInCells: 1,
    widthInPixels: 2,
    heightInPixels: 1,
    pixels: new Uint8ClampedArray([
      Number(id.slice(5)) + 1,
      0,
      0,
      255,
      0,
      0,
      0,
      255
    ])
  };
}

// Model browser-owned painted pixels without retaining the worker result or its array.
class PreviewSurface {
  width: number;
  height: number;
  red = 0;
  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    surfaces.add(this);
  }
  getContext() {
    return {
      putImageData: (image: ImageData) => {
        this.red = image.data[0]!;
      }
    };
  }
}

function Gallery({ shown }: { shown: boolean }) {
  const text = useTextConversion(true);
  retainedResults = text.fonts.filter((font) => font.preview).length;
  return shown ? (
    <FontGallery
      fonts={text.fonts}
      fontId={text.fontId}
      onChoose={text.chooseFont}
      onPreview={text.requestThumbnail}
      status={text.state.status}
    />
  ) : null;
}
function view(shown: boolean) {
  return (
    <VirtuosoGridMockContext.Provider
      value={{
        viewportHeight: 1760,
        viewportWidth: 900,
        itemHeight: 160,
        itemWidth: 300
      }}
    >
      <Gallery shown={shown} />
    </VirtuosoGridMockContext.Provider>
  );
}
async function completePreview() {
  const pending = mockPending;
  expect(pending).not.toBeNull();
  mockPending = null;
  await act(async () => pending!.resolve(mockArtwork(pending!.id)));
}

beforeEach(() => {
  mockRequests.length = 0;
  mockPending = null;
  retainedResults = 0;
  surfaces.clear();
  painted.clear();
  resizeCallbacks.clear();
  globalThis.OffscreenCanvas =
    PreviewSurface as unknown as typeof OffscreenCanvas;
  globalThis.ImageData = class {
    constructor(
      public data: Uint8ClampedArray,
      public width: number,
      public height: number
    ) {}
  } as typeof ImageData;
  globalThis.ResizeObserver = class {
    private targets = new Set<Element>();
    constructor(private callback: ResizeObserverCallback) {}
    observe(target: Element) {
      this.targets.add(target);
      resizeCallbacks.set(target, this.callback);
    }
    unobserve(target: Element) {
      this.targets.delete(target);
      resizeCallbacks.delete(target);
    }
    disconnect() {
      for (const target of this.targets) this.unobserve(target);
    }
  } as unknown as typeof ResizeObserver;
  jest.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(300);
  jest.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(120);
  jest
    .spyOn(HTMLCanvasElement.prototype, "getContext")
    .mockImplementation(function (this: HTMLCanvasElement) {
      return {
        drawImage: (source: PreviewSurface) => painted.set(this, source.red)
      } as unknown as CanvasRenderingContext2D;
    });
});
afterEach(() => {
  jest.restoreAllMocks();
});

test("keeps all 33 mounted thumbnails painted after RGBA cache eviction and settles", async () => {
  const rendered = render(view(true));
  await act(async () => {});
  for (let index = 0; index < 33; index++) await completePreview();
  expect(mockRequests).toHaveLength(33);
  expect(mockPending).toBeNull();
  expect(retainedResults).toBe(32);
  expect(screen.queryByText("Loading preview")).not.toBeInTheDocument();
  const canvases = Array.from(rendered.container.querySelectorAll("canvas"));
  expect(canvases).toHaveLength(33);
  expect(canvases.map((canvas) => painted.get(canvas))).toEqual(
    Array.from({ length: 33 }, (_, index) => index + 1)
  );
  const first = canvases[0]!;
  const width = first.width;
  const resize = resizeCallbacks.get(first.parentElement!)!;
  painted.delete(first);
  jest.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
    callback(0);
    return 1;
  });
  act(() => resize([], {} as ResizeObserver));
  expect(first.width).toBe(width);
  expect(painted.get(first)).toBe(1);
  expect(mockRequests).toHaveLength(33);
});

test("releases unmounted presentation and renders an evicted cache miss when the gallery returns", async () => {
  const rendered = render(view(true));
  await act(async () => {});
  for (let index = 0; index < 33; index++) await completePreview();
  const previousSurfaces = [...surfaces];
  rendered.rerender(view(false));
  expect(
    previousSurfaces.every(
      (surface) => surface.width === 1 && surface.height === 1
    )
  ).toBe(true);
  rendered.rerender(view(true));
  expect(mockRequests).toHaveLength(34);
  expect(mockRequests[33]).toBe("font-0");
  await completePreview();
  expect(mockRequests).toHaveLength(34);
  expect(mockPending).toBeNull();
  expect(retainedResults).toBe(32);
  expect(screen.queryByText("Loading preview")).not.toBeInTheDocument();
  expect(rendered.container.querySelectorAll("canvas")).toHaveLength(33);
});

test("keeps a failed thumbnail error visible without inventing a painted result or repeating it", async () => {
  const rendered = render(view(true));
  await act(async () => {});
  const pending = mockPending!;
  mockPending = null;
  await act(async () => pending.reject(new Error("Missing font")));
  for (let index = 0; index < 32; index++) await completePreview();
  expect(mockRequests).toHaveLength(33);
  expect(mockPending).toBeNull();
  expect(screen.getByText("Preview unavailable")).toHaveAttribute(
    "title",
    "Missing font"
  );
  expect(screen.queryByText("Loading preview")).not.toBeInTheDocument();
  const first = rendered.container.querySelector("canvas")!;
  expect(first).not.toBeVisible();
  expect(painted.has(first)).toBe(false);
});

test("requests a different font instead of retaining the previous font's painted card", () => {
  const onPreview = jest.fn();
  const font = {
    id: "font-0",
    name: "First",
    category: "Banners",
    preview: mockArtwork("font-0")
  };
  const rendered = render(
    <FontCard
      font={font}
      selected={false}
      onChoose={() => {}}
      onPreview={onPreview}
    />
  );
  const previousSurface = [...surfaces][0]!;
  rendered.rerender(
    <FontCard
      font={{ ...font, id: "font-1", preview: null }}
      selected={false}
      onChoose={() => {}}
      onPreview={onPreview}
    />
  );
  expect(previousSurface.width).toBe(1);
  expect(previousSurface.height).toBe(1);
  expect(onPreview).toHaveBeenCalledWith("font-1");
  expect(screen.getByText("Loading preview")).toBeVisible();
  expect(rendered.container.querySelector("canvas")).not.toBeVisible();
});
