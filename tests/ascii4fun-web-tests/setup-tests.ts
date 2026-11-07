import "@testing-library/jest-dom/jest-globals";

// Base UI dispatches a click PointerEvent; jsdom 26 supplies only MouseEvent.
window.PointerEvent = MouseEvent as typeof PointerEvent;
