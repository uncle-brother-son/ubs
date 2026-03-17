import { client } from './client'

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
 * Get homepage data from Sanity
 * Note: OpenNext ISR automatically caches this data
 */
export async function getHomepage(): Promise<Homepage | null> {
  try {
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

    return homepage
  } catch (error) {
    console.error('Error fetching homepage data:', error)
    return null
  }
}
