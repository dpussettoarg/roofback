import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import Link from 'next/link'
import './globals.css'
import { Providers } from '@/components/providers'

const SITE_URL = 'https://roofback.app'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-geist-sans',
  display: 'swap',
  weight: ['400', '500', '600', '700', '800', '900'],
})

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),

  title: {
    default: 'RoofBack | Software de Roofing por Techistas con 20 años de Experiencia',
    template: '%s | RoofBack',
  },
  description:
    'Optimizá tus presupuestos, controlá gastos y organizá tu equipo con la herramienta diseñada en el techo. Basada en 20 años de experiencia en USA y Latam. Probá gratis 14 días.',

  keywords: [
    'roofing software',
    'software para techistas',
    'roofing estimating app',
    'presupuestos de techos',
    'roofing contractor app',
    'gestión de trabajos de techo',
    'roofing CRM',
    'estimados de techado',
    'roofing business management',
    'aplicación para techistas',
  ],

  authors: [{ name: 'RoofBack', url: SITE_URL }],
  creator: 'RoofBack',
  publisher: 'RoofBack',

  // Canonical URL — prevents duplicate content penalties
  alternates: {
    canonical: SITE_URL,
    languages: {
      'en-US': `${SITE_URL}`,
      'es-419': `${SITE_URL}`,
    },
  },

  // Open Graph — controls how the link looks when shared on WhatsApp, LinkedIn, Slack, etc.
  openGraph: {
    type: 'website',
    locale: 'es_419',
    alternateLocale: ['en_US'],
    url: SITE_URL,
    siteName: 'RoofBack',
    title: 'RoofBack | Software de Roofing por Techistas con 20 años de Experiencia',
    description:
      'Controlá gastos, cronograma y equipo desde el celular. Presupuestos con IA en segundos. Firma digital del cliente incluida. Gratis 14 días.',
    images: [
      {
        url: '/og?title=Control%20total%20de%20tu%20negocio%20de%20techado&sub=Presupuestos%20con%20IA%2C%20cronograma%20visual%20y%20control%20de%20gastos%20en%20tiempo%20real.',
        width: 1200,
        height: 630,
        alt: 'RoofBack — Owner Dashboard con control de gastos y AI Advisor',
      },
    ],
  },

  // Twitter / X card
  twitter: {
    card: 'summary_large_image',
    site: '@roofbackapp',
    creator: '@roofbackapp',
    title: 'RoofBack | Software de Roofing por Techistas con 20 años de Experiencia',
    description:
      'Controlá gastos, cronograma y equipo desde el celular. Presupuestos con IA en segundos.',
    images: ['/og?title=Control%20total%20de%20tu%20negocio%20de%20techado'],
  },

  // PWA & icons
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/logo.png', type: 'image/png' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    shortcut: '/logo.png',
    apple: '/icons/icon-192.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'RoofBack',
  },

  // Indexing
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#0F1117',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={inter.variable}>
      <head />
      <body className="bg-[#0F1117] text-white antialiased font-sans">
        <Providers>{children}</Providers>
        <footer className="w-full border-t border-[#1E2228] py-3 px-4">
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] text-[#4B5563]">
            <span>© {new Date().getFullYear()} RoofBack</span>
            <span aria-hidden="true">·</span>
            <Link href="/terms" className="hover:text-[#A8FF3E] transition-colors">
              Terms of Service
            </Link>
            <span aria-hidden="true">·</span>
            <Link href="/privacy" className="hover:text-[#A8FF3E] transition-colors">
              Privacy Policy
            </Link>
            <span aria-hidden="true">·</span>
            <a href="mailto:hello@roofback.app" className="hover:text-[#A8FF3E] transition-colors">
              hello@roofback.app
            </a>
          </div>
        </footer>
      </body>
    </html>
  )
}
