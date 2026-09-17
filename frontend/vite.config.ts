import react from '@vitejs/plugin-react'
import { defineConfig, type PluginOption } from 'vite'
// This plugin ships a legacy `types` field (CJS `export =`) that TS's
// nodenext resolution picks up instead of the correct ESM `exports.import`
// condition, so the default import resolves to the whole module namespace
// instead of a callable function — even though it works fine at runtime
// (Vite loads it via the real ESM build). Cast around the bad types.
import wasmPlugin from 'vite-plugin-wasm'
import tailwindcss from '@tailwindcss/vite'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

const wasm = wasmPlugin as unknown as () => PluginOption

// https://vite.dev/config/
export default defineConfig({
  // build.target 'esnext' means top-level await is natively supported by the
  // output, so vite-plugin-top-level-await's transform isn't needed (and its
  // current release fails on this swc version) — just wasm + react + tailwind.
  //
  // nodePolyfills: the private-state provider's storage backend
  // (level/abstract-level) subclasses Node's `events.EventEmitter` and a few
  // other Node builtins that Vite otherwise externalizes to nothing in the
  // browser, crashing with "Class extends value undefined".
  plugins: [
    wasm(),
    react(),
    tailwindcss(),
    // `process` is needed — @subsquid/scale-codec and friends (pulled in
    // transitively by the indexer provider) reference it at module scope.
    // `global` must stay off: its shim gets injected even into the
    // wasm-bindgen loader living in ../contract's separate node_modules
    // tree (a sibling directory, not an ancestor), where the shim package
    // can never resolve via normal Node module resolution — fs.allow only
    // controls what Vite will *serve*, not where bare imports resolve from.
    nodePolyfills({ globals: { global: false, buffer: true, process: true } }),
  ],
  optimizeDeps: {
    // Only the wasm-bindgen packages themselves need to bypass esbuild's
    // pre-bundler (it can't handle their wasm imports — vite-plugin-wasm
    // handles them directly instead). Everything else — including
    // compact-runtime, which has its own plain-JS CJS dependencies like
    // object-inspect — should still go through the optimizer so Vite adds
    // proper CJS-to-ESM interop for them.
    exclude: [
      '@midnight-ntwrk/onchain-runtime-v3',
      '@midnight-ntwrk/onchain-runtime-v4',
      '@midnight-ntwrk/ledger-v8',
      '@midnight-ntwrk/zswap',
    ],
  },
  build: {
    target: 'esnext',
  },
  server: {
    // The contract package lives in a sibling directory (../contract) and is
    // imported directly (not via a published npm package), so its own
    // node_modules — e.g. the onchain-runtime-v3 wasm-bindgen loader — needs
    // to be servable too, not just files under this project's root.
    fs: {
      allow: ['..'],
    },
  },
})
