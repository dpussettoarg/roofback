'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useI18n } from '@/lib/i18n/context'
import { MobileNav } from '@/components/app/mobile-nav'
import {
  Search, Plus, ChevronRight, User, Phone, MapPin, Mail,
  X, Loader2, Trash2, Briefcase,
} from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import type { Customer } from '@/lib/types'

interface CustomerWithJobCount extends Customer {
  job_count?: number
}

const EMPTY_FORM = {
  full_name: '', address: '', phone: '', email: '', notes: '',
}

export default function CustomersPage() {
  const { lang } = useI18n()
  const supabase = createClient()

  const [customers, setCustomers] = useState<CustomerWithJobCount[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [orgId, setOrgId] = useState<string | null>(null)

  // Modal state
  const [showModal, setShowModal] = useState(false)
  const [editCustomer, setEditCustomer] = useState<CustomerWithJobCount | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const firstInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadData() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!profile?.organization_id) {
      setLoading(false)
      return
    }

    setOrgId(profile.organization_id)

    const { data } = await supabase
      .from('customers')
      .select('*')
      .eq('organization_id', profile.organization_id)
      .order('full_name')

    const custs = (data as Customer[]) || []

    // Get job counts per customer
    const { data: jobCounts } = await supabase
      .from('jobs')
      .select('customer_id')
      .eq('organization_id', profile.organization_id)
      .not('customer_id', 'is', null)

    const countMap: Record<string, number> = {}
    if (jobCounts) {
      for (const j of jobCounts as { customer_id: string }[]) {
        countMap[j.customer_id] = (countMap[j.customer_id] || 0) + 1
      }
    }

    setCustomers(custs.map(c => ({ ...c, job_count: countMap[c.id] || 0 })))
    setLoading(false)
  }

  // Subscribe to realtime changes
  useEffect(() => {
    if (!orgId) return
    const channel = supabase
      .channel('customers-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'customers',
        filter: `organization_id=eq.${orgId}`,
      }, () => { loadData() })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId])

  function openCreate() {
    setEditCustomer(null)
    setForm(EMPTY_FORM)
    setShowModal(true)
    setTimeout(() => firstInputRef.current?.focus(), 100)
  }

  function openEdit(c: CustomerWithJobCount) {
    setEditCustomer(c)
    setForm({ full_name: c.full_name, address: c.address, phone: c.phone, email: c.email, notes: c.notes })
    setShowModal(true)
    setTimeout(() => firstInputRef.current?.focus(), 100)
  }

  async function handleSave() {
    if (!form.full_name.trim()) {
      toast.error(lang === 'es' ? 'El nombre es obligatorio' : 'Name is required')
      return
    }
    if (!orgId) return
    setSaving(true)
    try {
      if (editCustomer) {
        const { error } = await supabase
          .from('customers')
          .update({ ...form, updated_at: new Date().toISOString() })
          .eq('id', editCustomer.id)
        if (error) throw error
        toast.success(lang === 'es' ? 'Cliente actualizado' : 'Customer updated')
      } else {
        const { error } = await supabase
          .from('customers')
          .insert({ ...form, organization_id: orgId })
        if (error) throw error
        toast.success(lang === 'es' ? 'Cliente creado' : 'Customer created')
      }
      setShowModal(false)
      loadData()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(c: CustomerWithJobCount) {
    const msg = lang === 'es'
      ? `¿Borrar a ${c.full_name}? Esto no borra sus trabajos.`
      : `Delete ${c.full_name}? Their jobs will not be deleted.`
    if (!confirm(msg)) return
    const { error } = await supabase.from('customers').delete().eq('id', c.id)
    if (error) { toast.error(error.message); return }
    toast.success(lang === 'es' ? 'Cliente eliminado' : 'Customer deleted')
    loadData()
  }

  const filtered = customers.filter(
    c =>
      c.full_name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search) ||
      c.address.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0F1117] pb-24">
        <div className="max-w-2xl mx-auto px-5 pt-14">
          <div className="h-8 w-40 bg-[#1E2228] rounded-lg animate-pulse mb-4" />
          <div className="h-11 w-full bg-[#1E2228] rounded-lg animate-pulse mb-4" />
          {[1,2,3].map(i => <div key={i} className="h-20 w-full bg-[#1E2228] rounded-xl animate-pulse mb-2" />)}
        </div>
        <MobileNav />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0F1117] pb-24">
      {/* Header */}
      <div className="max-w-2xl mx-auto px-5 pt-14 pb-3">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-[28px] font-bold text-white">
            {lang === 'es' ? 'Clientes' : 'Customers'}
          </h1>
          <button
            onClick={openCreate}
            className="h-9 px-4 text-sm font-bold rounded-lg btn-lime flex items-center gap-1.5"
          >
            <Plus className="h-4 w-4" />
            {lang === 'es' ? 'Nuevo' : 'New'}
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6B7280]" />
          <input
            placeholder={lang === 'es' ? 'Buscar cliente...' : 'Search customer...'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-11 pl-10 pr-4 rounded-lg input-dark text-sm"
          />
        </div>

        {/* Count */}
        <p className="text-xs text-[#6B7280] mb-2">
          {filtered.length} {lang === 'es' ? 'clientes' : 'customers'}
        </p>
      </div>

      {/* List */}
      <div className="max-w-2xl mx-auto px-5 space-y-2">
        {filtered.length === 0 ? (
          <div className="bg-[#1E2228] border border-[#2A2D35] rounded-xl p-10 text-center mt-2">
            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-[#A8FF3E]/10 flex items-center justify-center">
              <User className="h-6 w-6 text-[#A8FF3E]" />
            </div>
            <p className="text-white font-semibold mb-1">
              {search
                ? (lang === 'es' ? 'Sin resultados' : 'No results')
                : (lang === 'es' ? 'Sin clientes aún' : 'No customers yet')}
            </p>
            <p className="text-sm text-[#6B7280] mb-4">
              {lang === 'es'
                ? 'Agregá tu primer cliente para organizar tus trabajos.'
                : 'Add your first customer to organize your jobs.'}
            </p>
            {!search && (
              <button onClick={openCreate} className="h-10 px-6 text-sm font-bold rounded-lg btn-lime">
                <Plus className="h-4 w-4 mr-1 inline" />
                {lang === 'es' ? 'Agregar cliente' : 'Add customer'}
              </button>
            )}
          </div>
        ) : (
          filtered.map((c) => (
            <div
              key={c.id}
              className="bg-[#1E2228] border border-[#2A2D35] rounded-xl p-4 hover:border-[#3A3D45] transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <button
                  onClick={() => openEdit(c)}
                  className="flex-1 min-w-0 text-left"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-white truncate">{c.full_name}</p>
                  </div>
                  {c.address && (
                    <div className="flex items-center gap-1.5 text-xs text-[#6B7280] mb-0.5">
                      <MapPin className="h-3 w-3 flex-shrink-0" />
                      <span className="truncate">{c.address}</span>
                    </div>
                  )}
                  {c.phone && (
                    <div className="flex items-center gap-1.5 text-xs text-[#6B7280]">
                      <Phone className="h-3 w-3 flex-shrink-0" />
                      <span>{c.phone}</span>
                    </div>
                  )}
                  {c.email && (
                    <div className="flex items-center gap-1.5 text-xs text-[#6B7280]">
                      <Mail className="h-3 w-3 flex-shrink-0" />
                      <span className="truncate">{c.email}</span>
                    </div>
                  )}
                </button>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {(c.job_count ?? 0) > 0 && (
                    <Link href={`/jobs?customer=${c.id}`}>
                      <div className="flex items-center gap-1 text-xs font-semibold text-[#A8FF3E] bg-[#A8FF3E]/10 px-2 py-1 rounded-full">
                        <Briefcase className="h-3 w-3" />
                        {c.job_count}
                      </div>
                    </Link>
                  )}
                  <button
                    onClick={() => handleDelete(c)}
                    className="p-1.5 rounded text-[#4B5563] hover:text-red-400 hover:bg-red-400/10 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => openEdit(c)} className="p-1.5 rounded text-[#6B7280] hover:text-white">
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ── Create / Edit modal ──────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative bg-[#1E2228] rounded-t-2xl sm:rounded-[16px] w-full sm:max-w-lg p-6 pb-8 space-y-4 shadow-xl border border-[#2A2D35] max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">
                {editCustomer
                  ? (lang === 'es' ? 'Editar cliente' : 'Edit customer')
                  : (lang === 'es' ? 'Nuevo cliente' : 'New customer')}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-[#6B7280] hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              <FieldInput
                ref={firstInputRef}
                label={lang === 'es' ? 'Nombre completo *' : 'Full name *'}
                value={form.full_name}
                onChange={v => setForm(f => ({ ...f, full_name: v }))}
                placeholder="John Smith"
              />
              <FieldInput
                label={lang === 'es' ? 'Dirección' : 'Address'}
                value={form.address}
                onChange={v => setForm(f => ({ ...f, address: v }))}
                placeholder="123 Main St, City, TX"
              />
              <div className="grid grid-cols-2 gap-3">
                <FieldInput
                  label={lang === 'es' ? 'Teléfono' : 'Phone'}
                  value={form.phone}
                  onChange={v => setForm(f => ({ ...f, phone: v }))}
                  placeholder="(555) 123-4567"
                  type="tel"
                />
                <FieldInput
                  label="Email"
                  value={form.email}
                  onChange={v => setForm(f => ({ ...f, email: v }))}
                  placeholder="john@email.com"
                  type="email"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-[#6B7280]">
                  {lang === 'es' ? 'Notas internas' : 'Internal notes'}
                </label>
                <textarea
                  rows={2}
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder={lang === 'es' ? 'Notas del cliente...' : 'Customer notes...'}
                  className="w-full rounded-lg bg-[#0F1117] border border-[#2A2D35] px-3 py-2.5 text-white text-sm placeholder:text-[#4B5563] focus:outline-none focus:border-[#A8FF3E] resize-none"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 h-12 rounded-lg border border-[#2A2D35] bg-transparent text-[#6B7280] text-sm hover:bg-[#252830]"
              >
                {lang === 'es' ? 'Cancelar' : 'Cancel'}
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.full_name.trim()}
                className="flex-1 h-12 rounded-lg bg-[#A8FF3E] text-[#0F1117] font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {lang === 'es' ? 'Guardar' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      <MobileNav />
    </div>
  )
}

// Tiny reusable field
import { forwardRef } from 'react'
const FieldInput = forwardRef<HTMLInputElement, {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string
}>(function FieldInput({ label, value, onChange, placeholder, type = 'text' }, ref) {
  return (
    <div className="space-y-1">
      <label className="text-xs text-[#6B7280]">{label}</label>
      <input
        ref={ref}
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-11 rounded-lg bg-[#0F1117] border border-[#2A2D35] px-3 text-white text-sm placeholder:text-[#4B5563] focus:outline-none focus:border-[#A8FF3E] transition-colors"
      />
    </div>
  )
})
