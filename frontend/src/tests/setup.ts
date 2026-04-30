/**
 * Vitest global test setup file.
 * Runs before every test file.
 */
import '@testing-library/jest-dom';
import { vi } from 'vitest';

// ─── Stub browser APIs not present in jsdom ───────────────────────────────────

// URL.createObjectURL (used by downloadResult)
if (typeof URL.createObjectURL === 'undefined') {
  Object.defineProperty(URL, 'createObjectURL', {
    value: vi.fn(() => 'blob:mock-url'),
    writable: true,
  });
}

if (typeof URL.revokeObjectURL === 'undefined') {
  Object.defineProperty(URL, 'revokeObjectURL', {
    value: vi.fn(),
    writable: true,
  });
}

// HTMLElement.animate (used by some motion internals)
if (typeof HTMLElement.prototype.animate === 'undefined') {
  HTMLElement.prototype.animate = vi.fn().mockReturnValue({
    onfinish: null,
    cancel: vi.fn(),
    pause: vi.fn(),
    play: vi.fn(),
  }) as any;
}

// Silence ResizeObserver errors from recharts / layout animations
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Silence matchMedia errors in jsdom
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});
