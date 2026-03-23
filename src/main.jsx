import './index.css';
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx' // index.css wali line delete kar di


createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)