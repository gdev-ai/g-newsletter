import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import { StatusScreen } from './shared.jsx'
import { configError } from './lib/supabase.js'
import { installCmsClient, isCms } from './lib/cms.js'
import './index.css'

if (isCms) installCmsClient()

createRoot(document.getElementById('root')).render(
  configError
    ? <StatusScreen title="Site not configured" detail={configError} />
    : <BrowserRouter><App /></BrowserRouter>,
)
