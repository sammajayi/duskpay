import { Buffer } from 'buffer'
// The address-format SDK uses Node's Buffer at call time. The Vite polyfill
// plugin's Buffer shim is disabled (see vite.config.ts), so provide it here.
globalThis.Buffer ??= Buffer
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
