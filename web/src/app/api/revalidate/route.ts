import { revalidatePath } from 'next/cache'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge'

/**
 * Webhook endpoint for Sanity to trigger on-demand revalidation
 * Called when content is published in Sanity
 * 
 * Usage:
 * POST /api/revalidate
 * Headers: x-sanity-webhook-secret: <your-secret>
 * Body: { _type: "homepage", slug: { current: "..." } }
 */

// Map Sanity document types to Next.js paths
const TYPE_TO_PATH_MAP: Record<string, string> = {
  homepage: '/',
  // Add more document types here as your site grows
  // page: '/[slug]',  // Dynamic pages
  // post: '/blog/[slug]',
}

export async function POST(request: NextRequest) {
  try {
    // Verify webhook secret
    const secret = request.headers.get('x-sanity-webhook-secret')
    
    if (!process.env.REVALIDATION_SECRET) {
      return NextResponse.json(
        { error: 'Webhook secret not configured' },
        { status: 500 }
      )
    }

    if (secret !== process.env.REVALIDATION_SECRET) {
      return NextResponse.json(
        { error: 'Invalid webhook secret' },
        { status: 401 }
      )
    }

    // Parse webhook payload
    const body = await request.json()
    const documentType = body._type

    if (!documentType) {
      return NextResponse.json(
        { error: 'Missing _type in webhook payload' },
        { status: 400 }
      )
    }

    // Get path to revalidate
    let path = TYPE_TO_PATH_MAP[documentType]

    // Handle dynamic paths with slugs
    if (body.slug?.current && path?.includes('[slug]')) {
      path = path.replace('[slug]', body.slug.current)
    }

    if (!path) {
      return NextResponse.json(
        { error: `No path mapping for document type: ${documentType}` },
        { status: 400 }
      )
    }

    // Revalidate the path (clears OpenNext ISR cache)
    revalidatePath(path)

    // Optional: Warm cache by fetching the page
    // This ensures the next visitor gets a fast cached response
    try {
      const protocol = request.headers.get('x-forwarded-proto') || 'https'
      const host = request.headers.get('host')
      if (host) {
        const warmUrl = `${protocol}://${host}${path}`
        // Fire and forget - don't wait for response
        fetch(warmUrl, {
          headers: { 'User-Agent': 'Sanity-Webhook-Cache-Warmer' },
          cache: 'no-store'
        }).catch(err => console.error('Cache warming failed:', err))
      }
    } catch (warmError) {
      // Cache warming is optional, don't fail the webhook
      console.error('Cache warming error:', warmError)
    }

    return NextResponse.json({
      revalidated: true,
      path,
      documentType,
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
    headers: { 'x-sanity-webhook-secret': 'required' },
    body: { _type: 'required', slug: 'optional' },
  })
}

