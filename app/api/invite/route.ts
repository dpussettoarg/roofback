import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

function getBase() {
  const host = process.env.NEXT_PUBLIC_SITE_URL || 'https://roofback.app'
  return host.replace(/\/$/, '')
}

function inviteEmailHtml({
  inviterName,
  orgName,
  role,
  acceptUrl,
  lang,
}: {
  inviterName: string
  orgName: string
  role: string
  acceptUrl: string
  lang: string
}) {
  const isEs = lang === 'es'
  const roleLabel = role === 'owner'
    ? (isEs ? 'Propietario' : 'Owner')
    : (isEs ? 'Operaciones' : 'Operations')
  const logoUrl = `${getBase()}/logo.png`

  return `<!DOCTYPE html>
<html lang="${lang}">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0F1117;font-family:'Segoe UI',Arial,sans-serif;color:#FFFFFF;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0F1117;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#1E2228;border-radius:16px;border:1px solid #2A2D35;overflow:hidden;max-width:560px;width:100%;">

        <!-- Header -->
        <tr>
          <td style="background:#0F1117;padding:28px 32px;border-bottom:1px solid #2A2D35;">
            <img src="${logoUrl}" alt="RoofBack" height="36" style="display:block;">
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:36px 32px;">
            <h1 style="margin:0 0 8px;font-size:24px;font-weight:800;color:#FFFFFF;">
              ${isEs ? '¡Te invitaron a unirte!' : "You've been invited!"}
            </h1>
            <p style="margin:0 0 24px;font-size:15px;color:#9CA3AF;line-height:1.6;">
              ${isEs
                ? `<strong style="color:#FFFFFF">${inviterName}</strong> te invitó a colaborar en <strong style="color:#FFFFFF">${orgName}</strong> como <strong style="color:#A8FF3E">${roleLabel}</strong>.`
                : `<strong style="color:#FFFFFF">${inviterName}</strong> invited you to collaborate on <strong style="color:#FFFFFF">${orgName}</strong> as <strong style="color:#A8FF3E">${roleLabel}</strong>.`
              }
            </p>

            <!-- CTA Button -->
            <table cellpadding="0" cellspacing="0" style="margin:0 0 32px;">
              <tr>
                <td style="border-radius:10px;background:#A8FF3E;">
                  <a href="${acceptUrl}" style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:700;color:#0F1117;text-decoration:none;border-radius:10px;">
                    ${isEs ? 'Aceptar Invitación →' : 'Accept Invitation →'}
                  </a>
                </td>
              </tr>
            </table>

            <p style="margin:0 0 8px;font-size:13px;color:#6B7280;">
              ${isEs ? 'O copiá este link en tu navegador:' : 'Or copy this link into your browser:'}
            </p>
            <p style="margin:0;font-size:12px;color:#4B5563;word-break:break-all;">${acceptUrl}</p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:20px 32px;border-top:1px solid #2A2D35;background:#16191F;">
            <p style="margin:0;font-size:12px;color:#4B5563;">
              ${isEs
                ? `Este link vence en 7 días. Si no esperabas esta invitación, podés ignorar este email.`
                : `This link expires in 7 days. If you weren't expecting this invitation, you can ignore this email.`
              }
              <br>© 2026 RoofBack · <a href="${getBase()}/terms" style="color:#6B7280;">Terms</a> · <a href="${getBase()}/privacy" style="color:#6B7280;">Privacy</a>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (cs) => { cs.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) },
        },
      }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const body = await request.json()
    const { email, role } = body as { email: string; role: 'owner' | 'ops' }

    if (!email || !['owner', 'ops'].includes(role)) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
    }

    // Verify caller is owner
    const { data: callerProfile } = await supabase
      .from('profiles')
      .select('organization_id, role, full_name, company_name, language_preference')
      .eq('id', user.id)
      .single()

    if (!callerProfile || callerProfile.role !== 'owner') {
      return NextResponse.json({ error: 'Only owners can invite members' }, { status: 403 })
    }

    const orgId = callerProfile.organization_id
    if (!orgId) return NextResponse.json({ error: 'No organization found' }, { status: 400 })

    // Get org name
    const { data: orgData } = await supabase
      .from('organizations')
      .select('name')
      .eq('id', orgId)
      .single()
    const orgName = orgData?.name || callerProfile.company_name || 'RoofBack'

    // Upsert invitation (replace existing for same email+org)
    const { data: inv, error: invErr } = await supabase
      .from('invitations')
      .upsert(
        { organization_id: orgId, email: email.toLowerCase().trim(), role, expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() },
        { onConflict: 'organization_id,email', ignoreDuplicates: false }
      )
      .select('token')
      .single()

    if (invErr || !inv) {
      // If upsert not available, just insert
      const { data: newInv, error: insertErr } = await supabase
        .from('invitations')
        .insert({ organization_id: orgId, email: email.toLowerCase().trim(), role })
        .select('token')
        .single()
      if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 })

      const token = (newInv as { token: string }).token
      const acceptUrl = `${getBase()}/invite?token=${token}`
      const lang = callerProfile.language_preference || 'en'
      const html = inviteEmailHtml({
        inviterName: callerProfile.full_name || user.email || 'Your team',
        orgName, role, acceptUrl, lang,
      })

      await supabase.auth.admin // only available server-side via service role
      // Send via Supabase's built-in email (uses their SMTP)
      // We use the Auth admin API to send a magic link to register + join
      // Fallback: just return the URL so the owner can share it manually
      return NextResponse.json({ token, acceptUrl, html })
    }

    const token = (inv as { token: string }).token
    const acceptUrl = `${getBase()}/invite?token=${token}`
    const lang = callerProfile.language_preference || 'en'
    const html = inviteEmailHtml({
      inviterName: callerProfile.full_name || user.email || 'Your team',
      orgName, role, acceptUrl, lang,
    })

    // Send email via Supabase Edge Function or Resend if configured
    // For now: return the URL — owner can share it, and the HTML is logged
    console.log('[INVITE]', acceptUrl)

    return NextResponse.json({ token, acceptUrl })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
