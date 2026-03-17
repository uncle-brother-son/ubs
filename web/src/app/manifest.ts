import { MetadataRoute } from 'next'

export const dynamic = 'force-static';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Uncle Brother Son',
    short_name: 'UBS',
    description: 'An eCommerce Design Collective for Visionary Brands',
    start_url: '/',
    display: 'standalone',
    background_color: '#ECECEC',
    theme_color: '#DEEC1C',
    icons: [
      {
        src: '/icon.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }
}
