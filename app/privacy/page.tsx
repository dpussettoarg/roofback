import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export const metadata = {
  title: 'Privacy Policy — RoofBack',
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-6 py-12">

        {/* Back link */}
        <Link
          href="/login"
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 mb-10 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>

        {/* Header */}
        <div className="mb-10 pb-8 border-b border-slate-200">
          <p className="text-xs font-semibold tracking-widest text-slate-400 uppercase mb-3">Legal</p>
          <h1 className="text-4xl font-bold text-slate-900 mb-3">Privacy Policy</h1>
          <p className="text-slate-400 text-sm">Last Updated: February 2026</p>
        </div>

        {/* Sections */}
        <div className="space-y-10">

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3 flex items-center gap-3">
              <span className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-100 text-slate-600 text-sm font-bold flex items-center justify-center">1</span>
              Data Collection
            </h2>
            <p className="text-slate-600 leading-relaxed pl-11">
              We collect your basic profile information (name, email) and the data you input to generate estimates
              (client names, addresses, job details).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3 flex items-center gap-3">
              <span className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-100 text-slate-600 text-sm font-bold flex items-center justify-center">2</span>
              Use of Data
            </h2>
            <p className="text-slate-600 leading-relaxed pl-11">
              Your data is used strictly to provide the RoofBack service. We{' '}
              <strong className="text-slate-800">do not sell</strong> your data or your clients&apos; data to
              third-party marketing companies.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3 flex items-center gap-3">
              <span className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-100 text-slate-600 text-sm font-bold flex items-center justify-center">3</span>
              Third-Party Services
            </h2>
            <p className="text-slate-600 leading-relaxed pl-11">
              We use secure third-party providers for essential app functions, including{' '}
              <strong className="text-slate-800">Supabase</strong> (database &amp; authentication),{' '}
              <strong className="text-slate-800">OpenAI</strong> (for proposal generation), and{' '}
              <strong className="text-slate-800">Stripe</strong> (for payment processing). By using our app, you
              consent to data processing by these providers according to their respective policies.
            </p>
          </section>

        </div>

        {/* Footer */}
        <div className="mt-16 pt-8 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-slate-400">© {new Date().getFullYear()} RoofBack. All rights reserved.</p>
          <div className="flex items-center gap-5 text-xs text-slate-400">
            <Link href="/terms" className="hover:text-slate-700 transition-colors">Terms of Service</Link>
            <a href="mailto:hello@roofback.app" className="hover:text-slate-700 transition-colors">hello@roofback.app</a>
          </div>
        </div>

      </div>
    </div>
  )
}
