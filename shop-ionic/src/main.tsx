globalThis.__APP_START__ = globalThis.performance?.now() ?? Date.now()

import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'

const root = createRoot(document.getElementById('root')!)
root.render(<React.StrictMode><App /></React.StrictMode>)