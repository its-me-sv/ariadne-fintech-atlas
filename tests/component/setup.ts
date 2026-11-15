import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import { resetAtlas } from "./atlas";

// jsdom has no matchMedia. The app uses it to send phones to a notice page;
// report a desktop screen unless a test overrides it.
if (!window.matchMedia) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false, media: query, onchange: null,
      addEventListener: () => {}, removeEventListener: () => {}, addListener: () => {}, removeListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

// jsdom does not implement layout, so scrollIntoView is missing. The traces view calls it on arrow keys.
Element.prototype.scrollIntoView ??= function scrollIntoView() {};

beforeEach(() => {
  history.replaceState(null, "", "/");
  resetAtlas();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
