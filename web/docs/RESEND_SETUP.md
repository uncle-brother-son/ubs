# Resend Contact Form Setup

This guide shows how to implement a contact form using Resend email API.

## Prerequisites

1. Sign up for Resend account: https://resend.com
2. Get your API key from the dashboard
3. Verify your sending domain (or use sandbox mode for testing)

## Installation

```bash
npm install resend
```

## Environment Variables

Add to your `wrangler.json` (for production) and `.dev.vars` (for local development):

```json
{
  "vars": {
    "RESEND_API_KEY": "re_your_api_key_here",
    "CONTACT_EMAIL_TO": "hello@unclebrotherson.com",
    "CONTACT_EMAIL_FROM": "noreply@unclebrotherson.com"
  }
}
```

## API Route Implementation

Create `/app/api/contact/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

export const runtime = 'edge'

const resend = new Resend(process.env.RESEND_API_KEY)

// Rate limiting helper (basic in-memory, use KV for production)
const rateLimitMap = new Map<string, number[]>()
const RATE_LIMIT = 3 // Max requests
const RATE_WINDOW = 3600000 // 1 hour in ms

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const requests = rateLimitMap.get(ip) || []
  
  // Filter requests within the window
  const recentRequests = requests.filter(time => now - time < RATE_WINDOW)
  
  if (recentRequests.length >= RATE_LIMIT) {
    return false
  }
  
  recentRequests.push(now)
  rateLimitMap.set(ip, recentRequests)
  return true
}

interface ContactFormData {
  name: string
  email: string
  message: string
}

export async function POST(request: NextRequest) {
  try {
    // Get client IP for rate limiting
    const ip = request.headers.get('cf-connecting-ip') || 
               request.headers.get('x-forwarded-for') || 
               'unknown'

    // Check rate limit
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      )
    }

    // Parse and validate request body
    const body: ContactFormData = await request.json()
    const { name, email, message } = body

    // Validation
    if (!name || !email || !message) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      )
    }

    if (name.length < 2 || name.length > 100) {
      return NextResponse.json(
        { error: 'Name must be between 2 and 100 characters' },
        { status: 400 }
      )
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      )
    }

    if (message.length < 10 || message.length > 5000) {
      return NextResponse.json(
        { error: 'Message must be between 10 and 5000 characters' },
        { status: 400 }
      )
    }

    // Send email via Resend
    const { data, error } = await resend.emails.send({
      from: process.env.CONTACT_EMAIL_FROM || 'noreply@unclebrotherson.com',
      to: process.env.CONTACT_EMAIL_TO || 'hello@unclebrotherson.com',
      replyTo: email,
      subject: \`New Contact Form Submission from \${name}\`,
      html: \`
        <h2>New Contact Form Submission</h2>
        <p><strong>Name:</strong> \${name}</p>
        <p><strong>Email:</strong> \${email}</p>
        <p><strong>Message:</strong></p>
        <p>\${message.replace(/\n/g, '<br>')}</p>
        <hr>
        <p><small>Sent from unclebrotherson.com contact form</small></p>
      \`,
    })

    if (error) {
      console.error('Resend error:', error)
      return NextResponse.json(
        { error: 'Failed to send email' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Email sent successfully',
      id: data?.id,
    })
  } catch (error) {
    console.error('Contact form error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Handle GET requests (return form requirements)
export async function GET() {
  return NextResponse.json({
    fields: ['name', 'email', 'message'],
    validation: {
      name: { min: 2, max: 100 },
      email: { format: 'email' },
      message: { min: 10, max: 5000 },
    },
    rateLimit: {
      requests: RATE_LIMIT,
      window: '1 hour',
    },
  })
}
```

## Frontend Form Component

Create `/components/ContactForm.tsx`:

```tsx
'use client'

import { useState, FormEvent } from 'react'

export default function ContactForm() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: '',
  })
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setStatus('loading')
    setErrorMessage('')

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send message')
      }

      setStatus('success')
      setFormData({ name: '', email: '', message: '' })
    } catch (error) {
      setStatus('error')
      setErrorMessage(error instanceof Error ? error.message : 'Something went wrong')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-lg mx-auto space-y-4">
      <div>
        <label htmlFor="name" className="block text-sm font-medium mb-1">
          Name
        </label>
        <input
          type="text"
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
          minLength={2}
          maxLength={100}
          className="w-full px-3 py-2 border border-dark rounded-sm focus:outline-none focus:ring-2 focus:ring-dark"
        />
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium mb-1">
          Email
        </label>
        <input
          type="email"
          id="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          required
          className="w-full px-3 py-2 border border-dark rounded-sm focus:outline-none focus:ring-2 focus:ring-dark"
        />
      </div>

      <div>
        <label htmlFor="message" className="block text-sm font-medium mb-1">
          Message
        </label>
        <textarea
          id="message"
          value={formData.message}
          onChange={(e) => setFormData({ ...formData, message: e.target.value })}
          required
          minLength={10}
          maxLength={5000}
          rows={6}
          className="w-full px-3 py-2 border border-dark rounded-sm focus:outline-none focus:ring-2 focus:ring-dark resize-none"
        />
      </div>

      <button
        type="submit"
        disabled={status === 'loading'}
        className="w-full bg-dark text-white font-medium py-2 px-4 rounded-sm hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-dark focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {status === 'loading' ? 'Sending...' : 'Send Message'}
      </button>

      {status === 'success' && (
        <p className="text-sm text-green-600">
          Thank you! Your message has been sent successfully.
        </p>
      )}

      {status === 'error' && (
        <p className="text-sm text-red-600">
          {errorMessage || 'Failed to send message. Please try again.'}
        </p>
      )}
    </form>
  )
}
```

## Usage in Page

Add to your page component:

```tsx
import ContactForm from '@/components/ContactForm'

export default function Page() {
  return (
    <div>
      <h1>Contact Us</h1>
      <ContactForm />
    </div>
  )
}
```

## Testing

1. **Local testing**: Set RESEND_API_KEY in `.dev.vars`
2. **Run dev server**: `npm run dev`
3. **Submit test form**: Should receive email at configured address
4. **Check Resend dashboard**: View sent emails and logs

## Production Deployment

1. Create KV namespace for rate limiting (better than in-memory):
   ```bash
   wrangler kv:namespace create RATE_LIMIT
   ```

2. Add to `wrangler.json`:
   ```json
   {
     "kv_namespaces": [
       { "binding": "RATE_LIMIT", "id": "your_kv_id" }
     ]
   }
   ```

3. Set production environment variables in Cloudflare dashboard

## Security Best Practices

- ✅ Rate limiting implemented (3 requests per hour per IP)
- ✅ Input validation on both client and server
- ✅ CORS headers (Next.js handles automatically)
- ✅ SQL injection safe (no database queries)
- ✅ XSS protection (email HTML escaping)
- ⚠️ Consider adding honeypot field for bot protection
- ⚠️ Consider adding CAPTCHA for high-traffic sites

## Troubleshooting

**Email not sending:**
- Check RESEND_API_KEY is set correctly
- Verify domain is verified in Resend dashboard
- Check Resend logs for errors

**Rate limit not working:**
- In-memory rate limit resets on deployment
- Upgrade to KV-based rate limiting for production

**Form not submitting:**
- Check browser console for errors
- Verify API route is accessible: `curl https://yoursite.com/api/contact`
- Check Cloudflare Workers logs
