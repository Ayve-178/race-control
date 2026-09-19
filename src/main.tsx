import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

// fonts are bundled with the app, so nothing is fetched at runtime. the design links these
// from google; a board that has to work on a bad connection cannot.
//
// the latin entrypoints specifically: the default ones pull cyrillic, greek, vietnamese and
// latin-ext as well, which is dozens of font files for a screen that only ever renders english.
// five weights, and every one of them is used by a rule in tokens.css.
import '@fontsource/archivo/latin-400.css'
import '@fontsource/archivo/latin-600.css'
import '@fontsource/archivo/latin-700.css'
import '@fontsource/jetbrains-mono/latin-400.css'
import '@fontsource/jetbrains-mono/latin-500.css'

// one entry, because the cascade order is decided in one place and reading it here as five
// separate imports invites somebody to reorder them
import './styles/index.css'

import { App } from './app/App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
