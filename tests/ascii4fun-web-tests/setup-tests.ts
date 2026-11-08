import "@testing-library/jest-dom/jest-globals";

// Base UI dispatches a click PointerEvent; jsdom 26 supplies only MouseEvent.
window.PointerEvent = MouseEvent as typeof PointerEvent;

// jsdom has no layout/media-query engine; tests can override matches for reduced motion.
window.matchMedia = (media: string) => ({
  media,
  matches: false,
  onchange: null,
  addListener() {},
  removeListener() {},
  addEventListener() {},
  removeEventListener() {},
  dispatchEvent: () => false
});
