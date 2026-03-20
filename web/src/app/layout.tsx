import type { Metadata } from "next";
import "./globals.css";
import { getSeoData } from '@/sanity/queries';
import { urlFor } from '@/sanity/image';

export async function generateMetadata(): Promise<Metadata> {
  const data = await getSeoData();
  
  // Fallback values
  const title = data?.seoTitle || "Uncle Brother Son | eCommerce Design Collective for Visionary Brands";
  const description = data?.seoDescription || "Uncle Brother Son is an eCommerce design collective dedicated to creating exceptional digital experiences for visionary brands. Get in touch to transform your brand.";
  
  // Build OG image URL from Sanity or use fallback
  const ogImageUrl = data?.seoImage 
    ? urlFor(data.seoImage).width(1200).height(630).url()
    : '/og-image.png';

  return {
    title,
    description,
    keywords: ["eCommerce design", "design collective", "brand design", "digital design", "UX design", "web design"],
    authors: [{ name: "Uncle Brother Son" }],
    creator: "Uncle Brother Son",
    publisher: "Uncle Brother Son",
    metadataBase: new URL("https://unclebrotherson.com"),
    alternates: {
      canonical: "/",
    },
    icons: {
      icon: [
        { url: '/icon.png', sizes: '32x32', type: 'image/png' },
        { url: '/icon.svg', type: 'image/svg+xml' },
      ],
      apple: [
        { url: '/apple-icon.png', sizes: '180x180', type: 'image/png' },
      ],
    },
    openGraph: {
      title,
      description,
      url: "https://unclebrotherson.com",
      siteName: "Uncle Brother Son",
      locale: "en_US",
      type: "website",
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      creator: "@unclebrotherson",
      images: [ogImageUrl],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
  };
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#DEEC1C',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preload" href="/fonts/Aeonik-Regular.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <link rel="preload" href="/fonts/Aeonik-Medium.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
      </head>
      <body className="font-aeonik text-dark text-14 bg-light subpixel-antialiased">
        {children}
      </body>
    </html>
  );
}
