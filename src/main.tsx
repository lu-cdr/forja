import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
// cedo, para não perder o evento de instalação do Chrome
import './components/install'
import { App } from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
