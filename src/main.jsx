import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import ConfigurationNeeded from './pages/ConfigurationNeeded.jsx'
import { isSupabaseConfigured } from './lib/supabase.js'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {isSupabaseConfigured ? (
      <BrowserRouter>
        <App />
      </BrowserRouter>
    ) : (
      <ConfigurationNeeded />
    )}
  </React.StrictMode>,
)
