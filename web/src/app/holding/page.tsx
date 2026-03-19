import { getHomepage } from '@/sanity/queries'
import { HoldingPageClient } from './HoldingPageClient'

export default async function HoldingPage() {
  const data = await getHomepage()

  const slogan = data?.slogan || "An Ecommerce Design Collective for Visionary Brands"
  const email = data?.email || "hello@unclebrotherson.com"
  const emailCta = data?.emailCta || "Get in Touch"

  return <HoldingPageClient slogan={slogan} email={email} emailCta={emailCta} />
}

