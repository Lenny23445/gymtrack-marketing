import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { seedScreenshots } from './lib/screenshots'
import './global.css'

function mount() {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )
}

// Mitgelieferte Screenshots VOR dem ersten Render einspielen, damit sie beim
// oeffnen des geteilten Links schon in der Bibliothek stehen. Blockiert nicht:
// faellt es aus/ist nichts da, wird trotzdem gerendert.
seedScreenshots().catch(() => {}).finally(mount)
