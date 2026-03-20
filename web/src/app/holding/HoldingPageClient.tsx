'use client'

import { useState, useEffect, type FormEvent } from 'react'
import { Icon } from '@/components/Icons'

export function HoldingPageClient() {
  const [open, setOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/contact').then(r => r.json() as Promise<{ e?: string }>).then(d => { if (d.e) setEmail(d.e) })
  }, [])

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(false)

    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })

    if (res.ok) {
      window.location.reload()
    } else {
      setError(true)
      setLoading(false)
    }
  }

  return (
    <>
      <main className="grid_ h-dvh" role="main">
        <div className="col-start-1 col-span-full lg:col-start-8 lg:col-span-10 flex flex-col gap-8 items-start justify-center max-w-100 lg:max-w-none">
          <h1 className="sr-only">Uncle Brother Son</h1>
          <Icon name="logo-desktop" className="self-start hidden lg:block h-12 fill-dark" />
          <Icon name="logo-mobile" className="self-start lg:hidden w-50 fill-dark" />
          <div className="flex flex-col gap-3">
            <p className="m-0">I'm Wayne, a senior UX & UI designer for premium brands. Available for contracts and independent projects.</p>
            <p className="m-0">More coming soon.</p>
          </div>
          <div className="flex gap-3">
            <a href={`https://www.linkedin.com/in/wayneholland`} target='_blank' rel='noopener noreferrer' className="border-b border-dotted hover:border-solid" aria-label={`Visit my LinkedIn profile`}>LinkedIn</a>
            {email && (
              <a href={`mailto:${email}`} className="border-b border-dotted hover:border-solid" aria-label="Send me an email">Contact me</a>
            )}
          </div>
        </div>
      </main>

      {/* Preview access — bottom right corner */}
      <div className="fixed bottom-4 right-4 flex items-center gap-2">
        {open && (
          <form onSubmit={handleSubmit} className="flex">
            <input type="password" className={`bg-white px-3 py-1 rounded-w-xs rounded-e-none text-12 text-dark font-medium outline-none${error ? ' bg-red-700/10' : ''}`} value={password} onChange={e => { setPassword(e.target.value); setError(false) }} placeholder="Password" aria-label="Preview password" autoComplete="current-password" autoFocus />
            <button className="group relative inline-block bg-white px-3 py-1 rounded-w-none rounded-e-xs focus:outline-none focus:ring-2 focus:ring-dark disabled:opacity-50 cursor-pointer" type="submit" disabled={loading}>
              <div className="absolute top-0 right-0 h-full rounded-xs w-0 bg-dark transition-[width,right,left] duration-300 ease-in-out group-hover:left-0 group-hover:right-auto group-hover:w-full" />
              <span className="relative mix-blend-difference text-12 text-white font-medium uppercase">{loading ? '...' : 'Enter'}</span>
            </button>
          </form>
        )}
        <button className="w-4 h-4 rounded-full bg-dark opacity-0 transition-opacity cursor-pointer" onClick={() => setOpen(o => !o)} aria-label="Toggle preview access" />
      </div>
    </>
  )
}
