# Next.js + Cloudflare + Sanity Project Setup Guide

Complete setup instructions for deploying a Next.js 15 application with Sanity CMS to Cloudflare Workers with ISR caching.

---

## Table of Contents

1. [Overview](#overview)
2. [Tech Stack & Versions](#tech-stack--versions)
3. [Prerequisites](#prerequisites)
4. [Project Structure](#project-structure)
5. [Initial Setup](#initial-setup)
6. [Cloudflare Infrastructure](#cloudflare-infrastructure)
7. [ISR & Caching Strategy](#isr--caching-strategy)
8. [Sanity Webhook Setup](#sanity-webhook-setup)
9. [Email Configuration (Optional)](#email-configuration-optional)
10. [Deployment](#deployment)
11. [Environment Variables](#environment-variables)
12. [Troubleshooting](#troubleshooting)

---

## Overview

This setup deploys a Next.js 15 application to Cloudflare Workers using `@opennextjs/cloudflare`. Key features:

- **Static generation** with **Incremental Static Regeneration (ISR)**
- **KV cache** for page data storage at the edge
- **D1 database** for tag-based cache invalidation
- **Sanity CMS** for content management
- **Webhook-based on-demand revalidation** for instant content updates
- **Email API integration** (optional, via Resend or similar)

---

## Tech Stack & Versions

### Core Framework
```json
{
  "next": "^15.1.0",
  "react": "^19.0.0",
  "react-dom": "^19.0.0",
  "typescript": "^5.7.3"
}
```

### Deployment & Edge Runtime
```json
{
  "@opennextjs/cloudflare": "^1.17.1",
  "@cloudflare/workers-types": "^4.20250115.0",
  "wrangler": "^4.71.0"
}
```

### CMS & Data Fetching
```json
{
  "sanity": "^4.22.0",
  "@sanity/client": "^7.0.2",
  "@sanity/image-url": "^1.1.0",
  "@sanity/vision": "^4.22.0",
  "@portabletext/react": "^3.1.0"
}
```

### Styling
```json
{
  "tailwindcss": "^4.0.0",
  "@tailwindcss/postcss": "^4.0.0",
  "postcss": "^8.4.49"
}
```

### Email Service
```json
{
  "resend": "^4.0.3"
}
```
*Note: Any email service can be used (Resend, SendGrid, etc.)*

### Development Tools
```json
{
  "eslint": "^9.18.0",
  "eslint-config-next": "^16.0.2",
  "@next/bundle-analyzer": "^16.1.6"
}
```

### Node.js Version
- **Required:** `22.16.0` (specified in `.node-version`)
- Use `nvm`, `fnm`, or `asdf` to manage versions automatically

---

## Prerequisites

1. **Node.js 22.16.0** (or compatible with Next.js 15 + React 19)
2. **Cloudflare Account** with Workers enabled
3. **Sanity Account** and project
4. **Resend Account** (for email functionality)
5. **Git** installed locally

---

## Project Structure

```
[projectname]/
├── .node-version              # Node.js version lock
├── package.json               # Root workspace config (optional)
├── README.md
├── PROJECT_SETUP.md          # This file
│
├── web/                       # Next.js application
│   ├── package.json           # Web dependencies
│   ├── next.config.ts         # Next.js configuration
│   ├── open-next.config.ts    # OpenNext Cloudflare config
│   ├── wrangler.jsonc         # Cloudflare Worker config
│   ├── tsconfig.json
│   ├── tailwind.config.ts
│   ├── postcss.config.js
│   │
│   ├── .open-next/            # Build output (generated)
│   ├── .wrangler/             # Wrangler cache (generated)
│   │
│   ├── public/                # Static assets
│   │
│   └── src/
│       ├── app/               # Next.js App Router
│       │   ├── layout.tsx     # Root layout
│       │   ├── page.tsx       # Homepage
│       │   ├── globals.css    # Global styles
│       │   └── api/           # API routes
│       │       └── revalidate/ # Webhook endpoint (required)
│       │
│       ├── components/        # React components
│       ├── contexts/          # React Context providers (optional)
│       ├── lib/               # Utility functions
│       ├── queries/           # Sanity GROQ queries
│       └── sanity/            # Sanity client & types
│
└── studio/                    # Sanity Studio
    ├── package.json           # Studio dependencies
    ├── sanity.config.ts       # Sanity configuration
    ├── structure.ts           # Custom studio structure (optional)
    └── schemaTypes/           # Content schemas
```

---

## Initial Setup

### 1. Clone and Install

```bash
# Clone repository
git clone <your-repo-url>
cd [projectname]

# Install web dependencies
cd web
npm install

# Install studio dependencies
cd ../studio
npm install
```

### 2. Configure Node Version

Ensure Node.js 22.16.0 is active:

```bash
# Using nvm
nvm use

# Using fnm
fnm use

# Or install if not available
nvm install 22.16.0
```

### 3. Set Up Environment Variables

Create `.env.local` in the `web/` directory:

```bash
# Sanity Configuration
NEXT_PUBLIC_SANITY_PROJECT_ID=your_project_id
NEXT_PUBLIC_SANITY_DATASET=production
NEXT_PUBLIC_SANITY_API_VERSION=2024-01-01

# Email API (if using)
EMAIL_API_KEY=your_email_api_key
CONTACT_EMAIL=your-email@example.com

# Webhook Security
REVALIDATION_SECRET=your-random-secret-string
```

Create `.env` in the `studio/` directory:

```bash
SANITY_STUDIO_PROJECT_ID=your_project_id
SANITY_STUDIO_DATASET=production
```

### 4. Configure Sanity Client

**Important:** Set `useCdn: false` in your Sanity client for instant webhook updates.

In `web/lib/sanity.ts` (or wherever your Sanity client is configured):

```typescript
import { createClient } from "@sanity/client";

export const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET!,
  apiVersion: "2024-01-01",
  useCdn: false, // CRITICAL: Disable CDN for instant webhook updates
});
```

**Why `useCdn: false`?**
- Sanity CDN has 2-5 second propagation delay
- Cache warming would fetch stale data before CDN updates
- Results in "one-change-behind" behavior
- Direct API queries get fresh data immediately
- KV edge caching protects against excessive API calls

---

## Cloudflare Infrastructure

### 1. Create Cloudflare Worker

The worker is automatically created on first deployment, but you can pre-provision it:

```bash
cd web
npx wrangler deploy
```

### 2. Create KV Namespace (for ISR Cache)

```bash
npx wrangler kv:namespace create "NEXT_INC_CACHE_KV"
```

This returns a namespace ID like: `f9535c192a1744eba286d65d3f789e8c`

### 3. Create D1 Database (for Tag Cache)

```bash
npx wrangler d1 create [projectname]-tag-cache
```

This returns a database ID like: `0dfce98c-f4a1-45c8-b628-f40d7ae58e15`

### 4. Update `wrangler.jsonc`

Update your `web/wrangler.jsonc` with the IDs from above:

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "[projectname]",
  "compatibility_date": "2026-03-06",
  "main": ".open-next/worker.js",
  "assets": {
    "directory": ".open-next/assets",
    "binding": "ASSETS"
  },
  "services": [
    {
      "binding": "WORKER_SELF_REFERENCE",
      "service": "[projectname]"
    }
  ],
  "compatibility_flags": ["nodejs_compat", "global_fetch_strictly_public"],
  "vars": {
    "CONTACT_EMAIL": "your-email@example.com"
    // Add any other non-sensitive environment variables here
  },
  "kv_namespaces": [
    {
      "binding": "NEXT_INC_CACHE_KV",
      "id": "your-kv-namespace-id"
    }
  ],
  "d1_databases": [
    {
      "binding": "NEXT_TAG_CACHE_D1",
      "database_id": "your-d1-database-id",
      "database_name": "[projectname]-tag-cache"
    }
  ],
  "workers_dev": true,
  "preview_urls": false
}
```

### 5. Set Cloudflare Secrets

Store sensitive values as encrypted secrets:

```bash
cd web

# Set email API key (if using email service)
npx wrangler secret put EMAIL_API_KEY
# Paste your API key when prompted

# Set revalidation webhook secret
npx wrangler secret put REVALIDATION_SECRET
# Paste your random secret string when prompted
```

**Important:** Secrets are encrypted and not part of `wrangler.jsonc`. They're set separately and persist across deployments.

---

## ISR & Caching Strategy

### Configuration Files

#### `open-next.config.ts`

Enables KV cache for ISR and D1 for tag-based revalidation:

```typescript
import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import kvIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/kv-incremental-cache";
import d1NextTagCache from "@opennextjs/cloudflare/overrides/tag-cache/d1-next-tag-cache";

export default defineCloudflareConfig({
  // Enable KV caching for ISR
  incrementalCache: kvIncrementalCache,
  // Enable D1 tag cache for on-demand revalidation (revalidatePath/revalidateTag)
  tagCache: d1NextTagCache
});
```

#### `next.config.ts` — Static Asset Cache Headers

Add a `headers()` function to ensure static JS/CSS files are cached by the browser and Cloudflare's CDN, while HTML pages remain uncached:

```typescript
async headers() {
  return [
    {
      source: '/_next/static/:path*',
      headers: [
        { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
      ],
    },
  ];
},
```

**Why this is needed:**
- OpenNext automatically sets `private, no-store` on **all** responses by default — including static JS/CSS
- Without this rule, browsers re-download every stylesheet and script on every page load
- `/_next/static/` files are safe to cache permanently because Next.js includes a **content hash** in every filename — a new build generates new filenames, so there's no risk of stale files
- HTML pages intentionally keep `private, no-store` so Cloudflare's CDN never caches them — they are served from **KV cache** by the Worker instead

#### Page-Level Revalidation

All pages use **on-demand revalidation only**:

```typescript
// In any page.tsx file
export const revalidate = false // On-demand revalidation only
```

### How ISR Works

1. **First Request:** Page is generated and stored in KV cache
2. **Subsequent Requests:** Served from KV cache instantly
3. **Content Update in Sanity:** Webhook triggers revalidation
4. **Cache Invalidation:** Specific page removed from KV + D1 tag cache
5. **Next Request:** Page regenerated and cached again

**Benefits:**
- Near-instant page loads (served from edge)
- No stale content (on-demand revalidation)
- Low database reads (content cached at edge)

### Cache Metrics

From a production deployment:
- **KV Writes:** ~450 (initial generation)
- **KV Reads:** ~3,620
- **Read/Write Ratio:** 8:1 (excellent efficiency)

---

## Sanity Webhook Setup

### 1. Webhook Endpoint

**URL Pattern:**
```
https://your-worker-url.workers.dev/api/revalidate
```

Or with custom domain:
```
https://yourdomain.com/api/revalidate
```

### 2. Configure in Sanity Studio

1. Go to **Sanity Management Console** → Your Project → **API** → **Webhooks**
2. Click **Create Webhook**
3. Configure:

   - **Name:** `Production Revalidation`
   - **URL:** `https://your-worker-url.workers.dev/api/revalidate`
   - **Dataset:** `production`
   - **Trigger on:** `Create`, `Update`, `Delete`
   - **HTTP method:** `POST`
   - **HTTP Headers:**
     ```
     x-sanity-webhook-secret: your-random-secret-string
     ```
   - **Projection (GROQ):**
     ```groq
     {
       _type,
       "slug": slug.current
     }
     ```
   - **Include drafts:** `No`

4. Click **Save**

### 3. Webhook Logic

The webhook endpoint (`/api/revalidate/route.ts`) should map your Sanity document types to their corresponding Next.js paths:

```typescript
// Example mapping - customize for your project
const TYPE_TO_PATH_MAP: Record<string, string> = {
  homepage: '/',
  page: '/[slug]',  // Will use slug from webhook payload
  global: '/',      // Global settings affect all pages
  // Add your document types here
}
```

**Implementation Pattern:**

```typescript
import { revalidatePath } from 'next/cache'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    // Verify webhook secret
    const secret = request.headers.get('x-sanity-webhook-secret')
    if (secret !== process.env.REVALIDATION_SECRET) {
      return NextResponse.json({ error: 'Invalid secret' }, { status: 401 })
    }

    const body = await request.json()
    const documentType = body._type
    
    // Map document type to path
    let path = TYPE_TO_PATH_MAP[documentType]
    
    // Handle dynamic paths (e.g., pages with slugs)
    if (body.slug?.current) {
      path = `/your-base-path/${body.slug.current}`
    }
    
    // Handle global changes (affects all pages)
    if (documentType === 'global') {
      revalidatePath('/', 'layout')
    } else if (path) {
      revalidatePath(path)
    }
    
    return NextResponse.json({ revalidated: true }, { status: 200 })
  } catch (error) {
    return NextResponse.json({ error: 'Error revalidating' }, { status: 500 })
  }
}
```

### 4. Cache Warming

After revalidation, the endpoint automatically fetches the page to warm the cache:

```typescript
// Fire and forget - don't wait for response
fetch(warmUrl, { 
  headers: { 'User-Agent': 'Sanity-Webhook-Cache-Warmer' },
  cache: 'no-store' 
}).catch(err => console.error('Cache warming failed:', err))
```

This ensures the next visitor gets a fast cached response.

---

## Email Configuration (Optional)

If your project includes email functionality, you can integrate any email service (Resend, SendGrid, Postmark, etc.).

### General Setup Pattern

1. **Get API Key** from your email service provider
2. **Store as Secret** in Cloudflare:
   ```bash
   npx wrangler secret put EMAIL_API_KEY
   ```
3. **Create API Route** for email sending (e.g., `/api/contact/route.ts`)
4. **Use Environment Variable** in your API route:
   ```typescript
   const apiKey = process.env.EMAIL_API_KEY
   ```

### Rate Limiting Considerations

Most email services have rate limits. Common strategies:
- Add delays between multiple email sends in one request
- Implement queueing for bulk operations
- Upgrade to paid tiers for higher limits

**Example with rate limiting:**
```typescript
// Send first email
await sendEmail(email1)

// Wait 1 second before second email
await new Promise(resolve => setTimeout(resolve, 1000))

// Send second email
await sendEmail(email2)
```

---

## Deployment

### Development

```bash
# Web (Next.js)
cd web
npm run dev
# Opens at http://localhost:3000

# Studio (Sanity)
cd studio
npm run dev
# Opens at http://localhost:3333
```

### Production Deployment

#### Deploy Sanity Studio

```bash
cd studio
npm run deploy
```

This deploys to `https://your-project.sanity.studio`

#### Deploy Next.js to Cloudflare

```bash
cd web
npm run deploy
```

This runs:
1. `opennextjs-cloudflare build` - Builds Next.js app for Cloudflare
2. `opennextjs-cloudflare deploy` - Deploys to Cloudflare Workers

**First deployment creates:**
- Worker URL: `https://your-worker-name.workers.dev`
- KV namespace bindings
- D1 database bindings

**Subsequent deployments:**
- Update existing worker
- Preserve KV data
- Preserve secrets

### Custom Domain Setup

1. **Cloudflare Dashboard** → **Workers & Pages** → Your Worker
2. **Settings** → **Domains & Routes** → **Add Custom Domain**
3. Enter your domain (must be on Cloudflare)
4. SSL/TLS automatically configured

---

## Environment Variables

### Required Variables

#### Cloudflare Worker (via `wrangler.jsonc` vars)

```jsonc
"vars": {
  "CONTACT_EMAIL": "your-email@example.com"
  // Add any other non-sensitive environment variables here
  // These are public and visible in the Worker dashboard
}
```

#### Cloudflare Secrets (via `wrangler secret put`)

```bash
EMAIL_API_KEY         # From your email service provider (if using)
REVALIDATION_SECRET   # Random string for webhook security
```

#### Sanity Configuration (Public)

```bash
NEXT_PUBLIC_SANITY_PROJECT_ID    # From sanity.io project settings
NEXT_PUBLIC_SANITY_DATASET       # Usually "production"
NEXT_PUBLIC_SANITY_API_VERSION   # e.g., "2024-01-01"
```

### Local Development (`.env.local`)

All of the above, plus any others needed for local testing.

---

## Troubleshooting

### Issue: Webhook Not Triggering Revalidation

**Symptoms:** Content updates in Sanity don't appear on site

**Diagnosis:**
1. Check webhook configured in Sanity dashboard
2. Verify `x-sanity-webhook-secret` header matches `REVALIDATION_SECRET`
3. Check Cloudflare Worker logs:
   ```bash
   npx wrangler tail
   ```
4. Submit content change in Sanity and watch logs

**Common Fixes:**
- Regenerate webhook secret and update in both places
- Ensure webhook URL uses `https://` not `http://`
- Check webhook is enabled in Sanity

---

### Issue: Content Updates One Change Behind

**Symptoms:** Webhook fires successfully (200 OK) but website shows previous version, not latest

**Cause:** Sanity client using CDN with 2-5 second propagation delay. Cache warming fetches stale data before CDN updates.

**Solution:**
Disable CDN in your Sanity client configuration:

```typescript
// lib/sanity.ts
import { createClient } from "@sanity/client";

export const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET!,
  apiVersion: "2024-01-01",
  useCdn: false, // Disable CDN for instant updates via webhook
});
```

**Impact:**
- Queries go directly to Sanity API (no CDN delay)
- Cache warming gets fresh data immediately
- Minimal increase in API calls (~20-30/month for typical usage)
- Edge caching via KV still protects against excessive API calls

---

### Issue: Pages Not Caching / High KV Writes

**Cause:** ISR not properly configured

**Solution:**
1. Verify `open-next.config.ts` includes both `kvIncrementalCache` and `d1NextTagCache`
2. Check `wrangler.jsonc` has KV and D1 bindings with correct IDs
3. Ensure pages export `revalidate = false`
4. Rebuild and redeploy

---

### Issue: Cannot Find Module Errors After Deployment

**Cause:** Missing dependencies in production build

**Solution:**
1. Delete `.open-next/` folder
2. Delete `node_modules/`
3. Run `npm install`
4. Run `npm run deploy`

---

### Issue: Worker Exceeds CPU Limits

**Symptom:** 500 errors, "Worker exceeded CPU time limit"

**Diagnosis:**
```bash
npx wrangler tail
# Look for CPU time in ms
```

**Solutions:**
- Optimize large data queries (use smaller result sets)
- Reduce complex rendering operations
- Consider pagination for large lists
- Cache expensive operations

---

## Performance Benchmarks

### Typical Metrics
- **Bundle Sizes:** 150-200 kB per page (with code splitting)
- **Cold Start:** ~1.2s (includes generation + cache write)
- **Cached Load:** ~180ms (served from edge)
- **KV Hit Rate:** 90-95%
- **Edge Response:** 99%+ of requests

### Cache Efficiency
- **Read/Write Ratio:** 8:1 or better
- **KV Writes:** Primarily on first generation and after revalidation
- **KV Reads:** Serve most traffic from cache

---

## Additional Resources

- **Next.js 15 Docs:** https://nextjs.org/docs
- **OpenNext Cloudflare:** https://opennext.js.org/cloudflare
- **Sanity Docs:** https://www.sanity.io/docs
- **Cloudflare Workers:** https://developers.cloudflare.com/workers/

---

## Support & Maintenance

### Regular Tasks

1. **Update Dependencies:** Monthly
   ```bash
   cd web && npm update
   cd ../studio && npm update
   ```

2. **Monitor Cloudflare Usage:**
   - Check KV read/write limits
   - Monitor Worker CPU time
   - Review D1 database size

3. **Check Email Service Quota** (if applicable):
   - Monitor daily/monthly limits
   - Upgrade if exceeding limits

### Backup Strategy

1. **Sanity Content:** Auto-backed up by Sanity
2. **Code:** Git repository
3. **KV Cache:** Regenerated automatically (no backup needed)
4. **Environment Variables:** Document separately in secure location

---

*Last Updated: March 17, 2026*
