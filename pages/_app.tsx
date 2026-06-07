import type { AppProps } from 'next/app'
import '../styles/globals.css'
import { Toaster } from 'react-hot-toast'
import { useEffect } from 'react'

export default function App({ Component, pageProps }: AppProps) {
  useEffect(() => {
    const saved = localStorage.getItem('otw-theme')
    const sys = window.matchMedia('(prefers-color-scheme: dark)').matches
    const dark = saved ? saved === 'dark' : sys
    document.documentElement.classList.toggle('dark', dark)
  }, [])
  return (
    <>
      <Toaster position="top-right" toastOptions={{ style:{ background:'var(--bg-card)', color:'var(--text)', border:'1px solid var(--border)', fontSize:13, borderRadius:8, fontFamily:'Inter,-apple-system,sans-serif' }, duration:3500 }}/>
      <Component {...pageProps} />
    </>
  )
}
