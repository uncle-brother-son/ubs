import { MetadataRoute } from 'next'

export const dynamic = 'force-static';

export default function robots(): MetadataRoute.Robots {
  // Block .pages.dev domains from being indexed
  const isPagesDevDomain = process.env.VERCEL_URL?.includes('.pages.dev') || 
                           process.env.CF_PAGES_URL?.includes('.pages.dev');
  
  if (isPagesDevDomain) {
    return {
      rules: {
        userAgent: '*',
        disallow: '/',
      },
    };
  }
  
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [],
    },
    sitemap: 'https://unclebrotherson.com/sitemap.xml',
  }
}
