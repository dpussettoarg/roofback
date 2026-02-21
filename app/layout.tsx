import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import Link from 'next/link'
import './globals.css'
import { Providers } from '@/components/providers'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-geist-sans',
  display: 'swap',
  weight: ['400', '500', '600', '700', '800', '900'],
})

export const metadata: Metadata = {
  title: 'RoofBack',
  description: 'Job management and quoting for roofing contractors.',
  manifest: '/manifest.json',
  icons: {
    icon: '/logo.png',
    shortcut: '/logo.png',
    apple: '/logo.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'RoofBack',
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
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
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
