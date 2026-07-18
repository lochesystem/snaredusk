/** PixiJS espera `navigator` no import; Vitest roda em Node no CI. */
if (typeof globalThis.navigator === 'undefined') {
  Object.defineProperty(globalThis, 'navigator', {
    value: { userAgent: 'vitest' },
    configurable: true,
  });
}
