'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useI18n } from '@/lib/i18n/context'
import { MobileNav } from '@/components/app/mobile-nav'
import { AppHeader } from '@/components/app/app-header'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Loader2, LogOut, Globe, Building2, CreditCard, Package, Plus, Trash2, X, ChevronDown, ChevronUp, ShieldCheck, Users, UserPlus, Mail, Shield, Copy, Check, UserX } from 'lucide-react'
import { useProfile } from '@/lib/hooks/useProfile'
import { useOrganization, type OrgMember } from '@/lib/hooks/useOrganization'
import { toast } from 'sonner'
import type { Profile } from '@/lib/types'
import { PricingCard } from '@/components/app/pricing-card'

export default function SettingsPage() {
  const { t, lang, setLang } = useI18n()
  const { isOwner } = useProfile()
  const { members, loadMembers, invalidate } = useOrganization()
  const supabase = createClient()
  const router = useRouter()

  const [profile, setProfile] = useState<Partial<Profile>>({})
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  // Team management
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'owner' | 'ops'>('ops')
  const [sendingInvite, setSendingInvite] = useState(false)
  const [inviteLink, setInviteLink] = useState('')
  const [copiedLink, setCopiedLink] = useState(false)
  const [removingMember, setRemovingMember] = useState<string | null>(null)

  // Material templates
  interface TemplateItem { name: string; quantity_needed: number; unit: string; provider?: string }
  interface Template { id?: string; name: string; items: TemplateItem[] }
  const [templates, setTemplates] = useState<Template[]>([])
  const [expandedTemplate, setExpandedTemplate] = useState<number | null>(null)
  const [savingTemplate, setSavingTemplate] = useState(false)
  const [newTmplName, setNewTmplName] = useState('')

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (data) {
        setProfile(data as Profile)
        // language_preference takes priority; fall back to legacy 'language' column
        const savedLang = (data.language_preference || data.language) as 'es' | 'en' | null
        if (savedLang === 'es' || savedLang === 'en') setLang(savedLang)

        // Load templates
        const { data: tmpl } = await supabase
          .from('material_templates')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at')
        setTemplates((tmpl as Template[]) || [])
      }
      setLoading(false)

      // Load team members if owner
      if (data?.role === 'owner') loadMembers()
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function update(field: string, value: string | number) {
    setProfile((p) => ({ ...p, [field]: value }))
  }

  function addNewTemplate() {
    if (!newTmplName.trim()) return
    const t: Template = { name: newTmplName.trim(), items: [] }
    setTemplates((prev) => [...prev, t])
    setExpandedTemplate(templates.length)
    setNewTmplName('')
  }

  function updateTemplateName(idx: number, name: string) {
    setTemplates((prev) => prev.map((t, i) => i === idx ? { ...t, name } : t))
  }

  function addTemplateItem(tmplIdx: number) {
    setTemplates((prev) => prev.map((t, i) =>
      i === tmplIdx
        ? { ...t, items: [...t.items, { name: '', quantity_needed: 1, unit: '', provider: '' }] }
        : t
    ))
  }

  function updateTemplateItem(tmplIdx: number, itemIdx: number, field: keyof TemplateItem, value: string | number) {
    setTemplates((prev) => prev.map((t, i) =>
      i === tmplIdx
        ? { ...t, items: t.items.map((it, j) => j === itemIdx ? { ...it, [field]: value } : it) }
        : t
    ))
  }

  function removeTemplateItem(tmplIdx: number, itemIdx: number) {
    setTemplates((prev) => prev.map((t, i) =>
      i === tmplIdx ? { ...t, items: t.items.filter((_, j) => j !== itemIdx) } : t
    ))
  }

  async function deleteTemplate(tmplIdx: number) {
    const tmpl = templates[tmplIdx]
    if (tmpl.id) {
      const { error } = await supabase.from('material_templates').delete().eq('id', tmpl.id)
      if (error) { toast.error(error.message); return }
    }
    setTemplates((prev) => prev.filter((_, i) => i !== tmplIdx))
    setExpandedTemplate(null)
    toast.success(lang === 'es' ? 'Plantilla eliminada' : 'Template deleted')
  }

  async function saveTemplate(tmplIdx: number) {
    const tmpl = templates[tmplIdx]
    if (!tmpl.name.trim()) { toast.error(lang === 'es' ? 'Ingresá un nombre' : 'Enter a name'); return }
    setSavingTemplate(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      const payload = { name: tmpl.name, items: tmpl.items, user_id: user.id, updated_at: new Date().toISOString() }
      if (tmpl.id) {
        const { error } = await supabase.from('material_templates').update(payload).eq('id', tmpl.id)
        if (error) throw error
      } else {
        const { data, error } = await supabase.from('material_templates').insert(payload).select().single()
        if (error) throw error
        setTemplates((prev) => prev.map((t, i) => i === tmplIdx ? { ...t, id: (data as { id: string }).id } : t))
      }
      toast.success(lang === 'es' ? '¡Plantilla guardada!' : 'Template saved!')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error')
    } finally {
      setSavingTemplate(false)
    }
  }

  async function handleInvite() {
    if (!inviteEmail.trim()) { toast.error(lang === 'es' ? 'Ingresá un email' : 'Enter an email'); return }
    setSendingInvite(true)
    try {
      const res = await fetch('/api/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      })
      const json = await res.json() as { error?: string; acceptUrl?: string }
      if (!res.ok || json.error) throw new Error(json.error || 'Error')
      setInviteLink(json.acceptUrl || '')
      setInviteEmail('')
      toast.success(lang === 'es' ? '¡Invitación creada! Compartí el link.' : 'Invitation created! Share the link.')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error')
    } finally {
      setSendingInvite(false)
    }
  }

  async function copyInviteLink() {
    if (!inviteLink) return
    try {
      await navigator.clipboard.writeText(inviteLink)
      setCopiedLink(true)
      setTimeout(() => setCopiedLink(false), 2000)
    } catch {
      toast.error('Could not copy')
    }
  }

  async function handleRemoveMember(memberId: string) {
    if (!confirm(lang === 'es' ? '¿Remover a este miembro?' : 'Remove this member?')) return
    setRemovingMember(memberId)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ organization_id: null, role: 'ops' })
        .eq('id', memberId)
      if (error) throw error
      invalidate()
      loadMembers()
      toast.success(lang === 'es' ? 'Miembro removido' : 'Member removed')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error')
    } finally {
      setRemovingMember(null)
    }
  }

  async function handleSave() {
    setSaving(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: profile.full_name,
          company_name: profile.company_name,
          phone: profile.phone,
          contact_email: profile.contact_email,
          website: profile.website,
          default_hourly_rate: profile.default_hourly_rate,
          default_overhead_pct: profile.default_overhead_pct,
          default_margin_pct: profile.default_margin_pct,
          language: lang,
          language_preference: lang,
          updated_at: new Date().toISOString(),
        })
        .eq('id', profile.id)

      if (error) throw error
      toast.success(t('settings.saved'))
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t('common.error'))
    } finally {
      setSaving(false)
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0F1117] flex items-center justify-center">
        <div className="w-full max-w-[430px] mx-auto px-5 space-y-4">
          {/* Skeleton header */}
          <div className="pt-12 pb-4 space-y-2">
            <div className="h-7 w-40 bg-[#1E2228] rounded-lg animate-pulse" />
            <div className="h-4 w-64 bg-[#1E2228] rounded-lg animate-pulse" />
          </div>
          {/* Skeleton cards */}
          <div className="h-72 bg-[#1E2228] border border-[#2A2D35] rounded-2xl animate-pulse" />
          <div className="h-44 bg-[#1E2228] border border-[#2A2D35] rounded-2xl animate-pulse" />
          <div className="h-16 bg-[#1E2228] border border-[#2A2D35] rounded-2xl animate-pulse" />
          <div className="h-48 bg-[#1E2228] border border-[#2A2D35] rounded-2xl animate-pulse" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0F1117] pb-24">
      {/* Header */}
      <div className="w-full max-w-[430px] mx-auto px-5 pt-12 pb-4">
        <h1 className="text-2xl font-bold text-white">{t('settings.title')}</h1>
        <p className="text-sm text-[#6B7280] mt-1">
          {lang === 'es'
            ? 'Tu información aparece en los presupuestos'
            : 'Your info appears on estimates & quotes'}
        </p>
      </div>

      <div className="w-full max-w-[430px] mx-auto px-5 space-y-4">
        {/* Business Info Card */}
        <div className="bg-[#1E2228] border border-[#2A2D35] rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2.5">
            <Building2 className="h-5 w-5 text-[#A8FF3E]" />
            <h3 className="text-sm font-semibold text-white">{t('settings.profile')}</h3>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-[#6B7280]">{t('settings.name')}</Label>
            <Input
              value={profile.full_name || ''}
              onChange={(e) => update('full_name', e.target.value)}
              placeholder="John Perez"
              className="input-dark h-12 rounded-lg bg-[#16191F] border-[#2A2D35] text-white placeholder:text-[#3A3F4B] focus:border-[#A8FF3E] focus:ring-[#A8FF3E]/20"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-[#6B7280]">{t('settings.company')}</Label>
            <Input
              value={profile.company_name || ''}
              onChange={(e) => update('company_name', e.target.value)}
              placeholder={lang === 'es' ? 'Ej: Techos Perez LLC' : 'E.g.: Perez Roofing LLC'}
              className="input-dark h-12 rounded-lg bg-[#16191F] border-[#2A2D35] text-white placeholder:text-[#3A3F4B] focus:border-[#A8FF3E] focus:ring-[#A8FF3E]/20"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-[#6B7280]">{t('settings.phone')}</Label>
            <Input
              value={profile.phone || ''}
              onChange={(e) => update('phone', e.target.value)}
              placeholder="(555) 123-4567"
              type="tel"
              className="input-dark h-12 rounded-lg bg-[#16191F] border-[#2A2D35] text-white placeholder:text-[#3A3F4B] focus:border-[#A8FF3E] focus:ring-[#A8FF3E]/20"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-[#6B7280]">
              {lang === 'es' ? 'Email de contacto' : 'Contact email'}
            </Label>
            <Input
              value={profile.contact_email || ''}
              onChange={(e) => update('contact_email', e.target.value)}
              placeholder="info@myroofing.com"
              type="email"
              className="input-dark h-12 rounded-lg bg-[#16191F] border-[#2A2D35] text-white placeholder:text-[#3A3F4B] focus:border-[#A8FF3E] focus:ring-[#A8FF3E]/20"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-[#6B7280]">
              {lang === 'es' ? 'Pagina web' : 'Website'}
            </Label>
            <Input
              value={profile.website || ''}
              onChange={(e) => update('website', e.target.value)}
              placeholder="www.myroofing.com"
              className="input-dark h-12 rounded-lg bg-[#16191F] border-[#2A2D35] text-white placeholder:text-[#3A3F4B] focus:border-[#A8FF3E] focus:ring-[#A8FF3E]/20"
            />
          </div>
        </div>

        {/* Defaults Card */}
        <div className="bg-[#1E2228] border border-[#2A2D35] rounded-2xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-white">{t('settings.defaults')}</h3>

          <div className="space-y-1.5">
            <Label className="text-xs text-[#6B7280]">{t('settings.hourlyRate')}</Label>
            <Input
              type="number"
              min="0"
              step="0.5"
              value={profile.default_hourly_rate || 35}
              onChange={(e) => update('default_hourly_rate', parseFloat(e.target.value) || 0)}
              className="input-dark h-12 rounded-lg bg-[#16191F] border-[#2A2D35] text-white placeholder:text-[#3A3F4B] focus:border-[#A8FF3E] focus:ring-[#A8FF3E]/20"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-[#6B7280]">{t('settings.overheadPct')}</Label>
              <Input
                type="number"
                min="0"
                max="100"
                value={profile.default_overhead_pct || 15}
                onChange={(e) => update('default_overhead_pct', parseFloat(e.target.value) || 0)}
                className="input-dark h-12 rounded-lg bg-[#16191F] border-[#2A2D35] text-white placeholder:text-[#3A3F4B] focus:border-[#A8FF3E] focus:ring-[#A8FF3E]/20"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-[#6B7280]">{t('settings.marginPct')}</Label>
              <Input
                type="number"
                min="0"
                max="100"
                value={profile.default_margin_pct || 20}
                onChange={(e) => update('default_margin_pct', parseFloat(e.target.value) || 0)}
                className="input-dark h-12 rounded-lg bg-[#16191F] border-[#2A2D35] text-white placeholder:text-[#3A3F4B] focus:border-[#A8FF3E] focus:ring-[#A8FF3E]/20"
              />
            </div>
          </div>
        </div>

        {/* Language Card */}
        <div className="bg-[#1E2228] border border-[#2A2D35] rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Globe className="h-5 w-5 text-[#A8FF3E]" />
              <span className="text-sm font-semibold text-white">{t('settings.language')}</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setLang('es')}
                className={`px-4 py-2 rounded-lg text-sm transition-all ${
                  lang === 'es'
                    ? 'bg-[#A8FF3E] text-[#0F1117] font-bold'
                    : 'bg-[#16191F] text-[#6B7280] border border-[#2A2D35]'
                }`}
              >
                Espanol
              </button>
              <button
                onClick={() => setLang('en')}
                className={`px-4 py-2 rounded-lg text-sm transition-all ${
                  lang === 'en'
                    ? 'bg-[#A8FF3E] text-[#0F1117] font-bold'
                    : 'bg-[#16191F] text-[#6B7280] border border-[#2A2D35]'
                }`}
              >
                English
              </button>
            </div>
          </div>
        </div>

        {/* ── Team Management — owners only ──────────────────────────── */}
        {isOwner && (
          <div className="bg-[#1E2228] border border-[#2A2D35] rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2.5">
              <Users className="h-5 w-5 text-[#A8FF3E]" />
              <h3 className="text-sm font-semibold text-white">
                {lang === 'es' ? 'Equipo' : 'Team'}
              </h3>
            </div>

            {/* Member list */}
            {members.length > 0 && (
              <div className="space-y-2">
                {members.map((m: OrgMember) => (
                  <div
                    key={m.id}
                    className="flex items-center gap-3 px-3 py-2.5 bg-[#16191F] rounded-xl border border-[#2A2D35]"
                  >
                    <div className="w-8 h-8 rounded-full bg-[#A8FF3E]/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-[#A8FF3E]">
                        {(m.full_name || m.email || '?')[0].toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{m.full_name || m.email}</p>
                      <p className="text-xs text-[#6B7280] truncate">{m.email}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        m.role === 'owner'
                          ? 'bg-[#A8FF3E]/10 text-[#A8FF3E]'
                          : 'bg-blue-500/10 text-blue-400'
                      }`}>
                        {m.role === 'owner'
                          ? (lang === 'es' ? 'Propietario' : 'Owner')
                          : (lang === 'es' ? 'Operaciones' : 'Ops')}
                      </span>
                      {m.id !== profile.id && (
                        <button
                          onClick={() => handleRemoveMember(m.id)}
                          disabled={removingMember === m.id}
                          className="p-1.5 rounded text-[#4B5563] hover:text-red-400 hover:bg-red-400/10 transition-colors disabled:opacity-50"
                          title={lang === 'es' ? 'Remover miembro' : 'Remove member'}
                        >
                          {removingMember === m.id
                            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            : <UserX className="h-3.5 w-3.5" />}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Invite form */}
            <div className="space-y-3 pt-1">
              <div className="flex items-center gap-1.5">
                <UserPlus className="h-3.5 w-3.5 text-[#6B7280]" />
                <span className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider">
                  {lang === 'es' ? 'Invitar miembro' : 'Invite member'}
                </span>
              </div>

              <div className="flex gap-2">
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
                  placeholder={lang === 'es' ? 'Email del nuevo miembro' : "New member's email"}
                  className="flex-1 h-10 rounded-lg bg-[#0F1117] border border-[#2A2D35] px-3 text-white text-sm placeholder:text-[#4B5563] focus:outline-none focus:border-[#A8FF3E] transition-colors"
                />
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as 'owner' | 'ops')}
                  className="h-10 px-3 rounded-lg bg-[#0F1117] border border-[#2A2D35] text-white text-sm focus:outline-none focus:border-[#A8FF3E] transition-colors"
                >
                  <option value="ops">{lang === 'es' ? 'Operaciones' : 'Operations'}</option>
                  <option value="owner">{lang === 'es' ? 'Propietario' : 'Owner'}</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <Shield className="h-3.5 w-3.5 text-[#6B7280]" />
                <p className="text-[11px] text-[#6B7280]">
                  {inviteRole === 'ops'
                    ? (lang === 'es' ? 'Ops: ve trabajos y materiales, no ve ganancias.' : 'Ops: sees jobs & materials, not profit.')
                    : (lang === 'es' ? 'Propietario: acceso completo igual que vos.' : 'Owner: full access, same as you.')}
                </p>
              </div>

              <button
                onClick={handleInvite}
                disabled={sendingInvite || !inviteEmail.trim()}
                className="w-full h-10 rounded-lg border border-[#A8FF3E]/40 text-[#A8FF3E] text-sm font-semibold flex items-center justify-center gap-1.5 hover:bg-[#A8FF3E]/5 disabled:opacity-40 transition-all"
              >
                {sendingInvite
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  : <Mail className="h-3.5 w-3.5" />}
                {lang === 'es' ? 'Generar link de invitación' : 'Generate invite link'}
              </button>

              {inviteLink && (
                <div className="bg-[#0F1117] rounded-xl border border-[#2A2D35] p-3 space-y-2">
                  <p className="text-[11px] text-[#6B7280] font-medium uppercase tracking-wider">
                    {lang === 'es' ? 'Link de invitación (válido 7 días):' : 'Invite link (valid 7 days):'}
                  </p>
                  <p className="text-xs text-white break-all">{inviteLink}</p>
                  <button
                    onClick={copyInviteLink}
                    className="flex items-center gap-1.5 text-xs text-[#A8FF3E] font-semibold hover:underline"
                  >
                    {copiedLink
                      ? <><Check className="h-3 w-3" /> {lang === 'es' ? '¡Copiado!' : 'Copied!'}</>
                      : <><Copy className="h-3 w-3" /> {lang === 'es' ? 'Copiar link' : 'Copy link'}</>}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Material Templates ──────────────────────────────────────── */}
        <div className="bg-[#1E2228] border border-[#2A2D35] rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2.5">
            <Package className="h-5 w-5 text-[#A8FF3E]" />
            <h3 className="text-sm font-semibold text-white">
              {lang === 'es' ? 'Plantillas de materiales' : 'Bill of Materials Templates'}
            </h3>
          </div>

          {/* Existing templates */}
          {templates.length > 0 && (
            <div className="space-y-2">
              {templates.map((tmpl, tmplIdx) => (
                <div key={tmplIdx} className="border border-[#2A2D35] rounded-xl overflow-hidden">
                  {/* Template header */}
                  <div className="flex items-center gap-2 px-3 py-2.5 bg-[#16191F]">
                    <button
                      onClick={() => setExpandedTemplate(expandedTemplate === tmplIdx ? null : tmplIdx)}
                      className="flex-1 flex items-center gap-2 text-left"
                    >
                      {expandedTemplate === tmplIdx
                        ? <ChevronUp className="h-4 w-4 text-[#6B7280] flex-shrink-0" />
                        : <ChevronDown className="h-4 w-4 text-[#6B7280] flex-shrink-0" />
                      }
                      <span className="text-sm font-semibold text-white truncate">{tmpl.name || (lang === 'es' ? 'Sin nombre' : 'Untitled')}</span>
                      <span className="text-xs text-[#6B7280] flex-shrink-0">{tmpl.items.length} items</span>
                    </button>
                    <button
                      onClick={() => deleteTemplate(tmplIdx)}
                      className="p-1.5 rounded text-[#4B5563] hover:text-red-400 hover:bg-red-400/10 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* Template body */}
                  {expandedTemplate === tmplIdx && (
                    <div className="p-3 space-y-3">
                      <input
                        value={tmpl.name}
                        onChange={(e) => updateTemplateName(tmplIdx, e.target.value)}
                        placeholder={lang === 'es' ? 'Nombre de la plantilla' : 'Template name'}
                        className="w-full h-10 rounded-lg bg-[#0F1117] border border-[#2A2D35] px-3 text-white text-sm focus:outline-none focus:border-[#A8FF3E] transition-colors"
                      />

                      {/* Items */}
                      {tmpl.items.map((item, itemIdx) => (
                        <div key={itemIdx} className="grid gap-2 grid-cols-[1fr_60px_60px_80px_32px] items-center">
                          <input
                            value={item.name}
                            onChange={(e) => updateTemplateItem(tmplIdx, itemIdx, 'name', e.target.value)}
                            placeholder={lang === 'es' ? 'Material' : 'Material'}
                            className="h-9 rounded-lg bg-[#0F1117] border border-[#2A2D35] px-2 text-white text-xs focus:outline-none focus:border-[#A8FF3E]"
                          />
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={item.quantity_needed}
                            onChange={(e) => updateTemplateItem(tmplIdx, itemIdx, 'quantity_needed', parseFloat(e.target.value) || 1)}
                            placeholder="Qty"
                            className="h-9 rounded-lg bg-[#0F1117] border border-[#2A2D35] px-2 text-white text-xs focus:outline-none focus:border-[#A8FF3E] text-center"
                          />
                          <input
                            value={item.unit}
                            onChange={(e) => updateTemplateItem(tmplIdx, itemIdx, 'unit', e.target.value)}
                            placeholder={lang === 'es' ? 'Ud.' : 'Unit'}
                            className="h-9 rounded-lg bg-[#0F1117] border border-[#2A2D35] px-2 text-white text-xs focus:outline-none focus:border-[#A8FF3E]"
                          />
                          <input
                            value={item.provider || ''}
                            onChange={(e) => updateTemplateItem(tmplIdx, itemIdx, 'provider', e.target.value)}
                            placeholder={lang === 'es' ? 'Proveedor' : 'Vendor'}
                            className="h-9 rounded-lg bg-[#0F1117] border border-[#2A2D35] px-2 text-white text-xs focus:outline-none focus:border-[#A8FF3E]"
                          />
                          <button
                            onClick={() => removeTemplateItem(tmplIdx, itemIdx)}
                            className="h-9 w-8 flex items-center justify-center rounded-lg text-[#4B5563] hover:text-red-400 hover:bg-red-400/10 transition-colors"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}

                      {/* Column labels */}
                      {tmpl.items.length === 0 && (
                        <p className="text-xs text-[#4B5563] text-center py-2">
                          {lang === 'es' ? 'Sin ítems. Agregá uno abajo.' : 'No items yet. Add one below.'}
                        </p>
                      )}
                      {tmpl.items.length > 0 && (
                        <div className="grid gap-2 grid-cols-[1fr_60px_60px_80px_32px] px-0.5">
                          {[lang === 'es' ? 'Nombre' : 'Name', lang === 'es' ? 'Cant.' : 'Qty', lang === 'es' ? 'Ud.' : 'Unit', lang === 'es' ? 'Proveedor' : 'Vendor', ''].map((l, i) => (
                            <span key={i} className="text-[10px] text-[#4B5563] text-center">{l}</span>
                          ))}
                        </div>
                      )}

                      <div className="flex gap-2">
                        <button
                          onClick={() => addTemplateItem(tmplIdx)}
                          className="flex-1 h-9 rounded-lg border border-dashed border-[#2A2D35] text-[#A8FF3E] text-xs font-medium flex items-center justify-center gap-1.5 hover:bg-[#A8FF3E]/5 transition-colors"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          {lang === 'es' ? 'Agregar ítem' : 'Add item'}
                        </button>
                        <button
                          onClick={() => saveTemplate(tmplIdx)}
                          disabled={savingTemplate}
                          className="h-9 px-4 rounded-lg bg-[#A8FF3E] text-[#0F1117] text-xs font-bold flex items-center gap-1.5 disabled:opacity-50"
                        >
                          {savingTemplate ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                          {lang === 'es' ? 'Guardar' : 'Save'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Create new template */}
          <div className="flex gap-2">
            <input
              value={newTmplName}
              onChange={(e) => setNewTmplName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addNewTemplate()}
              placeholder={lang === 'es' ? 'Nombre nueva plantilla...' : 'New template name...'}
              className="flex-1 h-10 rounded-lg bg-[#0F1117] border border-[#2A2D35] px-3 text-white text-sm placeholder:text-[#4B5563] focus:outline-none focus:border-[#A8FF3E] transition-colors"
            />
            <button
              onClick={addNewTemplate}
              disabled={!newTmplName.trim()}
              className="h-10 px-4 rounded-lg bg-[#A8FF3E] text-[#0F1117] font-bold text-sm flex items-center gap-1.5 disabled:opacity-40"
            >
              <Plus className="h-4 w-4" />
              {lang === 'es' ? 'Crear' : 'Create'}
            </button>
          </div>
        </div>

        {/* Subscription Card — owners only */}
        {isOwner && (
          <div className="bg-[#1E2228] border border-[#2A2D35] rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2.5 mb-4">
              <CreditCard className="h-5 w-5 text-[#A8FF3E]" />
              {lang === 'es' ? 'Plan' : 'Plan'}
              {profile.subscription_status === 'active' && (
                <span className="ml-auto text-xs font-medium px-2.5 py-0.5 rounded-full bg-[#A8FF3E]/10 text-[#A8FF3E]">
                  {lang === 'es' ? 'Activo' : 'Active'}
                </span>
              )}
            </h3>
            {profile.subscription_status !== 'active' ? (
              <PricingCard
                priceId="price_1T2ODTBiIxuQmwGuua83OmC0"
                title={lang === 'es' ? 'Pro' : 'Pro'}
                price="$9"
                period={lang === 'es' ? '/mes' : '/month'}
                features={
                  lang === 'es'
                    ? ['Presupuestos ilimitados', 'PDF profesional', 'App movil optimizada']
                    : ['Unlimited estimates', 'Professional PDFs', 'Mobile-optimized app']
                }
                highlighted
                lang={lang as 'es' | 'en'}
                buttonLabel="subscribe"
              />
            ) : (
              <p className="text-sm text-[#6B7280]">
                {lang === 'es'
                  ? 'Tu suscripcion esta activa. Gracias por elegir RoofBack.'
                  : 'Your subscription is active. Thanks for choosing RoofBack.'}
              </p>
            )}
          </div>
        )}

        {/* Role badge for non-owners */}
        {!isOwner && profile.role && (
          <div className="bg-[#1E2228] border border-[#2A2D35] rounded-2xl p-4 flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-[#A8FF3E]" />
            <div>
              <p className="text-sm font-semibold text-white capitalize">{profile.role}</p>
              <p className="text-xs text-[#6B7280]">
                {lang === 'es' ? 'Tu rol en la organización' : 'Your role in the organization'}
              </p>
            </div>
          </div>
        )}

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-lime w-full h-12 text-base font-semibold rounded-lg bg-[#A8FF3E] text-[#0F1117] hover:bg-[#9BEF35] disabled:opacity-50 transition-all flex items-center justify-center gap-2"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {saving ? t('settings.saving') : t('settings.save')}
        </button>

        <Separator className="bg-[#2A2D35]" />

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="w-full h-12 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-400/10 transition-all flex items-center justify-center gap-2 text-sm font-medium"
        >
          <LogOut className="h-4 w-4" />
          {t('settings.logout')}
        </button>
      </div>

      <AppHeader />
      <MobileNav />
    </div>
  )
}
