# Cloudflare Workers Deployment Setup

This guide covers the manual steps needed to deploy your site to Cloudflare Workers.

## Step 1: Create KV Namespace

KV (Key-Value) storage for fast Sanity content caching.

```bash
# Create KV namespace
wrangler kv namespace create ubs-page-cache

# Output will show: 
# Created namespace with title "ubs-page-cache"
# Add the following to your wrangler.json:
# { binding = "SANITY_CACHE", id = "abc123..." }
```

Copy the `id` value and update `wrangler.json`:

```json
{
  "kv_namespaces": [
    {
      "binding": "SANITY_CACHE",
      "id": "YOUR_KV_ID_HERE"
    }
  ]
}
```

## Step 2: Create D1 Database

D1 (SQL database) for persistent Sanity content storage.

```bash
# Create D1 database
wrangler d1 create ubs-tag-cache

# Output will show:
# Created database ubs-tag-cache with id: xyz789...
# Add the following to your wrangler.json:
# [[d1_databases]]
# binding = "DB"
# database_name = "ubs-tag-cache"
# database_id = "xyz789..."
```

Copy the `database_id` and update `wrangler.json`:

```json
{
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "ubs-tag-cache",
      "database_id": "YOUR_D1_ID_HERE"
    }
  ]
}
```

## Step 3: Initialize D1 Schema

Create the cache table in D1:

```bash
# Create schema
wrangler d1 execute ubs-tag-cache --command "CREATE TABLE IF NOT EXISTS sanity_cache (key TEXT PRIMARY KEY, data TEXT NOT NULL, updated_at TEXT NOT NULL)"

# Verify table was created
wrangler d1 execute ubs-tag-cache --command "SELECT name FROM sqlite_master WHERE type='table'"
```

You should see `sanity_cache` in the output.

## Step 4: Generate Webhook Secret

Generate a secure secret for Sanity webhook authentication:

```bash
# Generate random secret
openssl rand -base64 32

# Or use Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Copy the generated secret - you'll need it for environment variables.

## Step 5: Set Environment Variables

Add secrets to your Workers project:

```bash
# Set webhook secret
wrangler secret put WEBHOOK_SECRET
# When prompted, paste the secret you generated in Step 4

# Verify secrets are set
wrangler secret list
```

Your `wrangler.json` already has these public vars:
- `NEXT_PUBLIC_SANITY_PROJECT_ID`
- `NEXT_PUBLIC_SANITY_DATASET`

## Step 6: Deploy to Cloudflare Workers

```bash
# Build and deploy
npm run deploy

# Or step by step
npm run pages:build
wrangler pages deploy .vercel/output/static
```

First deployment will prompt you to:
1. Choose a project name (e.g., "ubs")
2. Select production branch (main)

## Step 7: Configure Custom Domain

In Cloudflare Dashboard:

1. Go to **Workers & Pages** → **ubs** → **Settings** → **Domains & Routes**
2. Click **Add custom domain**
3. Enter your domain: `unclebrotherson.com`
4. Cloudflare will auto-configure DNS
5. Wait for SSL certificate provisioning (usually 1-2 minutes)

## Step 8: Update Sanity Webhook

In Sanity Dashboard (https://manage.sanity.io):

1. Select your project (9tqz91vf - UBS Site)
2. Go to **API** → **Webhooks**
3. Click **Create webhook** or edit existing webhook
4. Configure:
   - **Name**: Cloudflare Workers Cache Revalidation
   - **URL**: `https://unclebrotherson.com/api/revalidate`
   - **Dataset**: production
   - **Trigger on**: Create, Update, Delete
   - **Filter**: `_type == "homepage"` (optional - only homepage changes)
   - **HTTP method**: POST
   - **HTTP Headers**:
     - Name: `x-webhook-secret`
     - Value: [paste your WEBHOOK_SECRET from Step 4]
5. Click **Save**

## Step 9: Test the Setup

### Test caching:

```bash
# 1. Visit your site
curl https://unclebrotherson.com

# 2. Check if data is cached (should be fast on second load)
curl https://unclebrotherson.com

# 3. View cache status in logs
wrangler tail
```

### Test webhook (locally first):

```bash
# Terminal 1: Start local preview
npm run preview

# Terminal 2: Test webhook endpoint
curl -X POST http://localhost:8788/api/revalidate \
  -H "x-webhook-secret: dev_secret_change_in_production" \
  -H "Content-Type: application/json" \
  -d '{"_type":"homepage"}'

# Should respond: {"success":true,"message":"Cache cleared and repopulated",...}
```

### Test webhook (production):

```bash
curl -X POST https://unclebrotherson.com/api/revalidate \
  -H "x-webhook-secret: YOUR_PRODUCTION_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"_type":"homepage"}'
```

### Test Sanity integration:

1. Go to Sanity Studio: https://your-studio-url.sanity.studio
2. Edit the homepage content
3. Click **Publish**
4. Wait 2-3 seconds
5. Refresh your website - changes should appear

## Step 10: Monitor and Debug

View real-time logs:

```bash
# Watch Workers logs
wrangler tail

# Filter for specific endpoint
wrangler tail --format=pretty --grep=/api/revalidate
```

Check KV storage:

```bash
# List keys
wrangler kv:key list --namespace-id=YOUR_KV_ID

# Get cached value
wrangler kv:key get "homepage" --namespace-id=YOUR_KV_ID
```

Check D1 database:

```bash
# Query cache table
wrangler d1 execute ubs-tag-cache --command "SELECT * FROM sanity_cache"

# Check last update time
wrangler d1 execute ubs-tag-cache --command "SELECT key, updated_at FROM sanity_cache"
```

## Troubleshooting

**Build fails:**
- Run `npm run build` first to check for TypeScript errors
- Check that Next.js version is 15.5.2 (Cloudflare adapter requirement)

**KV/D1 not accessible:**
- Verify IDs in wrangler.json match dashboard
- Check bindings are in "production" environment (not "preview")

**Webhook not triggering:**
- Test webhook manually with curl
- Check Sanity webhook logs in dashboard
- Verify x-webhook-secret header matches WEBHOOK_SECRET
- Check Workers logs: `wrangler tail`

**Cache not clearing:**
- Verify D1 table exists and has correct schema
- Check Workers logs for cache errors
- Manually clear: `wrangler kv:key delete "homepage" --namespace-id=YOUR_KV_ID`

**Site not loading:**
- Check Workers logs: `wrangler tail`
- Verify deployment succeeded: `wrangler pages deployment list`
- Check DNS settings in Cloudflare dashboard

## Migration from Cloudflare Pages

If you're migrating from existing Cloudflare Pages deployment:

1. **Keep both running initially** (Pages and Workers)
2. **Test Workers deployment** on different subdomain first
3. **Update DNS** to point to Workers when ready
4. **Delete old Pages project** after verification

## Cost Estimation

Cloudflare Workers Free Tier:
- 100,000 requests/day
- KV: 100,000 reads/day, 1,000 writes/day
- D1: 100,000 rows read/day, 100,000 rows written/day
- More than enough for most small-to-medium sites

## Additional Resources

- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Wrangler CLI Docs](https://developers.cloudflare.com/workers/wrangler/)
- [KV Storage Docs](https://developers.cloudflare.com/kv/)
- [D1 Database Docs](https://developers.cloudflare.com/d1/)
- [Next.js on Cloudflare](https://developers.cloudflare.com/pages/framework-guides/nextjs/)

## Security Checklist

- ✅ Webhook secret configured (strong random value)
- ✅ Environment variables set via `wrangler secret` (not in code)
- ✅ CORS headers (handled by Next.js)
- ✅ Rate limiting on webhooks (TODO: implement if high traffic)
- ✅ Input validation in API routes
- ✅ KV/D1 access restricted to Workers runtime

## Next Steps

After deployment:
1. Set up monitoring/alerts in Cloudflare dashboard
2. Implement Resend contact form (see docs/RESEND_SETUP.md)
3. Add more content types to Sanity
4. Set up staging environment (optional)
5. Configure CDN cache rules (optional)
