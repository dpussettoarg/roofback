import { Suspense } from 'react'
import { Loader2 } from 'lucide-react'
import InviteClient from './invite-client'

export default function InvitePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0F1117] flex items-center justify-center">
          <Loader2 className="h-8 w-8 text-[#A8FF3E] animate-spin" />
        </div>
      }
    >
      <InviteClient />
    </Suspense>
  )
}
