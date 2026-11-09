import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import '@fontsource/cormorant-garamond/latin-500.css'
import '@fontsource/cormorant-garamond/latin-700.css'
import '@fontsource/cormorant-garamond/latin-500-italic.css'
import '@fontsource/allura/latin-400.css'
import '@fontsource/josefin-sans/latin-400.css'
import '@fontsource/josefin-sans/latin-600.css'
import '@fontsource/josefin-sans/latin-700.css'
import './styles.css'
import { protegerDatos } from './lib/almacenamiento'

// Pide a Chrome que no borre los datos de la app cuando falte espacio (solo con https).
protegerDatos()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
