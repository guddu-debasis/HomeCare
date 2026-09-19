import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Take manual control of scroll position on refresh/back-forward instead of
// letting the browser silently restore whatever offset it remembered for
// this URL. Without this, a hard refresh can land mid-page instead of at
// the top, and it happens before React even mounts — no component-level
// fix (like ScrollToTop) can catch it, since the browser applies its own
// restoration first.
if (typeof window !== 'undefined' && 'scrollRestoration' in window.history) {
  window.history.scrollRestoration = 'manual'
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
