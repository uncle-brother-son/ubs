import { getHomepage } from '@/sanity/queries';
import { Icon } from '@/components/Icons';

// On-demand revalidation only (triggered by Sanity webhook)
export const revalidate = false;

export default async function Home() {
  const data = await getHomepage();
  
  // Fallback values if Sanity data is not available
  const slogan = data?.slogan || "An Ecommerce Design Collective for Visionary Brands";
  const email = data?.email || "hello@unclebrotherson.com";
  const emailCta = data?.emailCta || "Get in Touch";

  return (
    <div className="flex min-h-screen items-center justify-center">
      <main className="flex flex-col items-center justify-center text-left" role="main">
        <div className="flex flex-col gap-3">
          <h1 className="sr-only">Uncle Brother Son - eCommerce Design Collective for Visionary Brands</h1>
          <Icon name="logo-desktop" className="self-start hidden md:block md:h-14 fill-dark" />
          <Icon name="logo-mobile" className="self-start md:hidden h-50 fill-dark" />
          <div className="flex flex-col gap-10 items-start">
            <p className="m-0">{slogan}</p>

            {/* <div className='flex justify-between'>
              <div className='flex gap-3'>
                <Icon name="logo-instagram" className="h-5 fill-dark" />
                <Icon name="logo-dribbble" className="h-5 fill-dark" />
                <Icon name="logo-linkedin" className="h-5 fill-dark" />
              </div>
              <Icon name="logo-mail" className="h-5 fill-dark" />
            </div> */}
            
            
            <a href={`mailto:${email}`} className="group relative inline-block bg-white px-3 py-1 rounded-sm focus:outline-none focus:ring-2 focus:ring-dark focus:ring-offset-2 focus:ring-offset-light" aria-label={`Send us an email at ${email}`}>
              <div className='absolute top-0 right-0 h-full rounded-sm w-0 bg-dark transition-[width,right,left] duration-300 ease-in-out group-hover:left-0 group-hover:right-auto group-hover:w-full' />
              <span className='relative mix-blend-difference text-12 text-white font-medium uppercase'>{emailCta}</span>
            </a>
           
          </div>
        </div>
      </main>
    </div>
  );
}

