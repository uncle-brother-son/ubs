import { client } from './client'
import { getFromCache, setCache, type Env } from './cache'

export interface Homepage {
  slogan: string
  email: string
  emailCta: string
  seoTitle: string
  seoDescription: string
  seoImage?: {
    asset: {
      _ref: string
      _type: string
    }
  }
}

/**
 * Get homepage data with caching strategy:
 * 1. Check KV cache
 * 2. Check D1 cache
 * 3. Fetch from Sanity API
 * 4. Store in cache for next time
 * 
 * @param env - Cloudflare bindings (optional, only available in Workers/Pages Functions)
 */
export async function getHomepage(env?: Env): Promise<Homepage | null> {
  try {
    // Try cache first if env bindings available
    if (env) {
      const cached = await getFromCache(env)
      if (cached) {
        return cached
      }
    }

    // Cache miss or no env - fetch from Sanity
    console.log('Fetching from Sanity API')
    const homepage = await client.fetch<Homepage>(
      `*[_type == "homepage" && _id == "homepage"][0]{
        slogan,
        email,
        emailCta,
        seoTitle,
        seoDescription,
        seoImage
      }`
    )

    // Store in cache if env available
    if (homepage && env) {
      await setCache(env, homepage)
    }

    return homepage
  } catch (error) {
    console.error('Error fetching homepage data:', error)
    return null
  }
}
