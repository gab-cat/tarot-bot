import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from "react-router-dom"
import { ConvexProvider, ConvexReactClient } from "convex/react"
import './index.css'
import App from './App.tsx'
import SuccessPage from './components/SuccessPage.tsx'

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConvexProvider client={convex}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/xendit/success" element={<SuccessPage />} />
        </Routes>
      </BrowserRouter>
    </ConvexProvider>
  </StrictMode>,
)
