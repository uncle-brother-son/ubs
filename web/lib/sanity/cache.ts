import { Homepage } from './queries'

// Type for Cloudflare bindings (will be available in edge runtime)
export interface Env {
  SANITY_CACHE: KVNamespace
  DB: D1Database
  WEBHOOK_SECRET: string
}

const CACHE_KEY = 'homepage'
const CACHE_TTL = 86400 // 24 hours in seconds

/**
 * Get homepage data from cache (KV first, then D1 fallback)
 */
export async function getFromCache(env: Env): Promise<Homepage | null> {
  try {
    // Try KV first (fastest)
    const kvData = await env.SANITY_CACHE.get(CACHE_KEY, 'json')
    if (kvData) {
      console.log('Cache hit: KV')
      return kvData as Homepage
    }

    // Fallback to D1
    const d1Result = await env.DB.prepare(
      'SELECT data FROM sanity_cache WHERE key = ?'
    )
      .bind(CACHE_KEY)
      .first<{ data: string }>()

    if (d1Result) {
      const data = JSON.parse(d1Result.data) as Homepage
      // Repopulate KV cache
      await env.SANITY_CACHE.put(CACHE_KEY, JSON.stringify(data), {
        expirationTtl: CACHE_TTL,
      })
      console.log('Cache hit: D1 (repopulated KV)')
      return data
    }

    console.log('Cache miss: No data in KV or D1')
    return null
  } catch (error) {
    console.error('Error reading from cache:', error)
    return null
  }
}

/**
 * Store homepage data in both KV and D1
 */
export async function setCache(env: Env, data: Homepage): Promise<void> {
  try {
    const jsonData = JSON.stringify(data)

    // Store in KV with TTL
    await env.SANITY_CACHE.put(CACHE_KEY, jsonData, {
      expirationTtl: CACHE_TTL,
    })

    // Store in D1 (persistent backup)
    await env.DB.prepare(
      `INSERT INTO sanity_cache (key, data, updated_at) 
       VALUES (?, ?, datetime('now'))
       ON CONFLICT(key) 
       DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at`
    )
      .bind(CACHE_KEY, jsonData)
      .run()

    console.log('Cache updated: KV + D1')
  } catch (error) {
    console.error('Error writing to cache:', error)
  }
}

/**
 * Clear cache (both KV and D1)
 */
export async function clearCache(env: Env): Promise<void> {
  try {
    await env.SANITY_CACHE.delete(CACHE_KEY)
    await env.DB.prepare('DELETE FROM sanity_cache WHERE key = ?')
      .bind(CACHE_KEY)
      .run()
    console.log('Cache cleared: KV + D1')
  } catch (error) {
    console.error('Error clearing cache:', error)
  }
}

/**
 * Initialize D1 database schema
 * Run this once manually or via migration:
 * wrangler d1 execute ubs-sanity --command "CREATE TABLE IF NOT EXISTS sanity_cache (key TEXT PRIMARY KEY, data TEXT NOT NULL, updated_at TEXT NOT NULL)"
 */
export const D1_SCHEMA = `
CREATE TABLE IF NOT EXISTS sanity_cache (
  key TEXT PRIMARY KEY,
  data TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
`
