'use client'

import { useState } from 'react'
import { Icon } from '@/components/Icons'

type Props = {
  slogan: string
  email: string
  emailCta: string
}

export function HoldingPageClient({ slogan, email, emailCta }: Props) {
  const [open, setOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
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
    <div className="flex min-h-screen items-center justify-center">
      <main className="flex flex-col items-center justify-center text-left" role="main">
        <div className="flex flex-col gap-3">
          <h1 className="sr-only">Uncle Brother Son</h1>
          <Icon name="logo-desktop" className="self-start hidden md:block md:h-14 fill-dark" />
          <Icon name="logo-mobile" className="self-start md:hidden h-50 fill-dark" />
          <div className="flex flex-col gap-10 items-start">
            <p className="m-0">{slogan}</p>
            <a href={`mailto:${email}`} className="group relative inline-block bg-white px-3 py-1 rounded-xs focus:outline-none focus:ring-2 focus:ring-dark focus:ring-offset-2 focus:ring-offset-light" aria-label={`Send us an email at ${email}`}>
              <div className='absolute top-0 right-0 h-full rounded-xs w-0 bg-dark transition-[width,right,left] duration-300 ease-in-out group-hover:left-0 group-hover:right-auto group-hover:w-full' />
              <span className='relative mix-blend-difference text-12 text-white font-medium uppercase'>{emailCta}</span>
            </a>
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
    </div>
  )
}
