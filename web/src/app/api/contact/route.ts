import { getHomepage } from '@/sanity/queries'
import { NextResponse } from 'next/server'

export async function GET() {
  const data = await getHomepage()
  if (!data?.email) return NextResponse.json({}, { status: 404 })
  return NextResponse.json({ e: data.email })
}
