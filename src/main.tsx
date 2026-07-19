import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './global.css'

// Screenshots werden geteilt über Firebase synchronisiert (siehe lib/cloud.ts +
// useShots) — kein Vorab-Seeding mehr nötig.
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
