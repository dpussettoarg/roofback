import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export const metadata = {
  title: 'Terms of Service — RoofBack',
}

export default function TermsPage() {
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
          <h1 className="text-4xl font-bold text-slate-900 mb-3">Terms of Service</h1>
          <p className="text-slate-400 text-sm">Last Updated: February 2026</p>
        </div>

        {/* Intro */}
        <p className="text-slate-600 leading-relaxed mb-10">
          Welcome to RoofBack. By using our application, you agree to these terms.
        </p>

        {/* Sections */}
        <div className="space-y-10">

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3 flex items-center gap-3">
              <span className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-100 text-slate-600 text-sm font-bold flex items-center justify-center">1</span>
              Tool, Not a Guarantee
            </h2>
            <p className="text-slate-600 leading-relaxed pl-11">
              RoofBack provides software tools, calculators, and AI-generated templates to assist roofing contractors.
              We <strong className="text-slate-800">DO NOT</strong> guarantee the accuracy, completeness, or
              profitability of any estimates, material counts, or proposals generated using our platform.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3 flex items-center gap-3">
              <span className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-100 text-slate-600 text-sm font-bold flex items-center justify-center">2</span>
              Contractor Responsibility
            </h2>
            <p className="text-slate-600 leading-relaxed pl-11">
              You, the user, are the professional. You are <strong className="text-slate-800">solely responsible</strong> for
              reviewing, verifying, and approving all numbers, pricing, and contract terms{' '}
              <strong className="text-slate-800">BEFORE</strong> sending any proposal to a client. RoofBack is not a
              party to the contract between you and your clients.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3 flex items-center gap-3">
              <span className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-100 text-slate-600 text-sm font-bold flex items-center justify-center">3</span>
              AI-Generated Content
            </h2>
            <p className="text-slate-600 leading-relaxed pl-11">
              Our app uses Artificial Intelligence to draft proposal descriptions. AI can make mistakes (hallucinate).
              You <strong className="text-slate-800">must read and edit</strong> the AI output to ensure it accurately
              reflects your scope of work.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3 flex items-center gap-3">
              <span className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-100 text-slate-600 text-sm font-bold flex items-center justify-center">4</span>
              Limitation of Liability
            </h2>
            <p className="text-slate-600 leading-relaxed pl-11">
              Under no circumstances shall RoofBack, its founders, or affiliates be liable for any direct, indirect,
              incidental, or consequential damages, including but not limited to lost profits, lost contracts, or
              miscalculated material costs arising from the use of our software.
            </p>
          </section>

        </div>

        {/* Footer */}
        <div className="mt-16 pt-8 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-slate-400">© {new Date().getFullYear()} RoofBack. All rights reserved.</p>
          <div className="flex items-center gap-5 text-xs text-slate-400">
            <Link href="/privacy" className="hover:text-slate-700 transition-colors">Privacy Policy</Link>
            <a href="mailto:hello@roofback.app" className="hover:text-slate-700 transition-colors">hello@roofback.app</a>
          </div>
        </div>

      </div>
    </div>
  )
}
