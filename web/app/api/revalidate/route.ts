import { NextRequest, NextResponse } from 'next/server'
import { clearCache, setCache, type Env } from '@/lib/sanity/cache'
import { getHomepage } from '@/lib/sanity/queries'

export const runtime = 'edge'

/**
 * Webhook endpoint for Sanity to trigger cache revalidation
 * Called when content is published in Sanity
 * 
 * Usage:
 * POST /api/revalidate
 * Headers: x-webhook-secret: <your-secret>
 * Body: { _type: "homepage" }
 */
export async function POST(request: NextRequest) {
  try {
    // Verify webhook secret
    const secret = request.headers.get('x-webhook-secret')
    const expectedSecret = process.env.WEBHOOK_SECRET

    if (!expectedSecret) {
      return NextResponse.json(
        { error: 'Webhook secret not configured' },
        { status: 500 }
      )
    }

    if (secret !== expectedSecret) {
      return NextResponse.json(
        { error: 'Invalid webhook secret' },
        { status: 401 }
      )
    }

    // Get Cloudflare bindings (available in Workers/Pages Functions)
    const env = process.env as unknown as Env

    // Clear existing cache
    await clearCache(env)

    // Fetch fresh data from Sanity and repopulate cache
    const homepage = await getHomepage(env)

    if (!homepage) {
      return NextResponse.json(
        { error: 'Failed to fetch homepage data' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Cache cleared and repopulated',
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Revalidate error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    )
  }
}

/**
 * Handle GET requests (for testing)
 */
export async function GET() {
  return NextResponse.json({
    message: 'Revalidate endpoint is active',
    method: 'POST',
    headers: { 'x-webhook-secret': 'required' },
  })
}
