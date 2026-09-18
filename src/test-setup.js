// Node 22+ ships an experimental native `localStorage` global. Vitest's jsdom
// environment sees that key already present on `global` and (per its
// populateGlobal keys list, which predates this Node feature) declines to
// override it with jsdom's real implementation — so the bare `localStorage`
// identifier resolves to Node's stub, which is non-functional without a
// --localstorage-file flag. Pull the working Storage instance off the
// underlying JSDOM instance (vitest always assigns `global.jsdom = dom`) and
// use it to replace the broken global for the duration of the test run.
if (globalThis.jsdom?.window?.localStorage) {
  Object.defineProperty(globalThis, 'localStorage', {
    value: globalThis.jsdom.window.localStorage,
    configurable: true,
    writable: true,
  })
}
