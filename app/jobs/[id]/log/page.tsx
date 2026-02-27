'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useI18n } from '@/lib/i18n/context'
import { MobileNav } from '@/components/app/mobile-nav'
import { AppHeader } from '@/components/app/app-header'
import {
  ArrowLeft, Plus, Loader2, BookOpen, Pencil, Trash2, ImageIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import type { Job } from '@/lib/types'
import { format } from 'date-fns'
import Image from 'next/image'
import { ImageUploader } from '@/components/app/image-uploader'

const QUICK_TAGS = ['#material', '#issue', '#customer', '#inspection'] as const
const EDIT_WINDOW_MS = 10 * 60 * 1000

interface FieldLogEntry {
  id: string
  text: string
  author: string
  tags: string[]
  image_url: string | null
  created_at: string
}

export default function FieldLogPage() {
  const { id } = useParams<{ id: string }>()
  const { lang } = useI18n()
  const supabase = createClient()

  const [job, setJob] = useState<Job | null>(null)
  const [logs, setLogs] = useState<FieldLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [newText, setNewText] = useState('')
  const [author, setAuthor] = useState('')
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [imageUrl, setImageUrl] = useState<string | null>(null)

  const loadLogs = useCallback(async () => {
    const { data } = await supabase
      .from('job_field_logs')
      .select('*')
      .eq('job_id', id)
      .order('created_at', { ascending: false })
    setLogs((data as FieldLogEntry[]) || [])
  }, [id, supabase])

  useEffect(() => {
    async function load() {
      const { data: jobData } = await supabase.from('jobs').select('*').eq('id', id).single()
      setJob(jobData as Job)

      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: prof } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .single()
        setAuthor(prof?.full_name || user.email?.split('@')[0] || '')
      }

      await loadLogs()
      setLoading(false)
    }
    load()
  }, [id, supabase, loadLogs])

  function extractTags(text: string): string[] {
    return QUICK_TAGS.filter((tag) => text.toLowerCase().includes(tag.toLowerCase()))
  }

  async function handleAddNote() {
    if (!newText.trim()) {
      toast.error(lang === 'es' ? 'Escribí una nota' : 'Write a note')
      return
    }
    setSaving(true)
    try {
      const tags = extractTags(newText.trim())
      const { error } = await supabase.from('job_field_logs').insert({
        job_id: id,
        text: newText.trim(),
        author: author || undefined,
        tags,
        image_url: imageUrl || null,
      })
      if (error) throw error
      setNewText('')
      setImageUrl(null)
      await loadLogs()
      toast.success(lang === 'es' ? 'Nota agregada' : 'Note added')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error')
    } finally {
      setSaving(false)
    }
  }

  async function handleUpdate(idToEdit: string, newTextValue: string) {
    const entry = logs.find((l) => l.id === idToEdit)
    if (!entry) return
    const age = Date.now() - new Date(entry.created_at).getTime()
    if (age > EDIT_WINDOW_MS) {
      toast.error(lang === 'es' ? 'Solo se puede editar dentro de 10 minutos' : 'Can only edit within 10 minutes')
      return
    }
    setSaving(true)
    try {
      const tags = extractTags(newTextValue.trim())
      const { error } = await supabase
        .from('job_field_logs')
        .update({ text: newTextValue.trim(), tags, updated_at: new Date().toISOString() })
        .eq('id', idToEdit)
      if (error) throw error
      setEditingId(null)
      await loadLogs()
      toast.success(lang === 'es' ? 'Nota actualizada' : 'Note updated')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(logId: string) {
    const entry = logs.find((l) => l.id === logId)
    if (!entry) return
    const age = Date.now() - new Date(entry.created_at).getTime()
    if (age > EDIT_WINDOW_MS) {
      toast.error(lang === 'es' ? 'Solo se puede borrar dentro de 10 minutos' : 'Can only delete within 10 minutes')
      return
    }
    if (!confirm(lang === 'es' ? '¿Borrar esta nota?' : 'Delete this note?')) return
    const { error } = await supabase.from('job_field_logs').delete().eq('id', logId)
    if (!error) {
      await loadLogs()
      toast.success(lang === 'es' ? 'Nota borrada' : 'Note deleted')
    }
  }

  function addTag(tag: string) {
    setNewText((prev) => (prev ? `${prev} ${tag}` : tag))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0F1117]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#2A2D35] border-t-[#A8FF3E]" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0F1117] pb-24">
      <div className="mx-auto max-w-[430px]">
        <div className="bg-[#1E2228] border-b border-[#2A2D35] px-5 pt-12 pb-4">
          <Link href={`/jobs/${id}`} className="inline-flex items-center text-sm text-[#6B7280] mb-2 hover:text-white">
            <ArrowLeft className="h-4 w-4 mr-1" />
            {job?.client_name}
          </Link>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-[#A8FF3E]" />
            {lang === 'es' ? 'Field Log' : 'Field Log'}
          </h1>
        </div>

        <div className="px-5 py-5 space-y-4">
          {/* Add note form */}
          <div className="bg-[#1E2228] border border-[#2A2D35] rounded-xl p-4 space-y-3">
            <textarea
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              placeholder={lang === 'es' ? 'Escribí una nota... (usá #material #issue #customer #inspection)' : 'Write a note... (use #material #issue #customer #inspection)'}
              className="w-full min-h-[80px] p-3 text-sm bg-[#0F1117] border border-[#2A2D35] rounded-lg resize-none text-white placeholder:text-[#6B7280] focus:outline-none focus:border-[#A8FF3E]"
            />
            <div className="flex flex-wrap gap-1.5">
              {QUICK_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => addTag(tag)}
                  className="text-[10px] px-2 py-1 rounded-full bg-[#A8FF3E]/10 text-[#A8FF3E] border border-[#A8FF3E]/30 hover:bg-[#A8FF3E]/20"
                >
                  {tag}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <ImageUploader
                urls={imageUrl ? [imageUrl] : []}
                onChange={(urls) => setImageUrl(urls[0] || null)}
                storagePath={`${id}/field-log`}
                bucketName="job-photos"
                maxPhotos={1}
                lang={lang}
              />
              <button
                onClick={handleAddNote}
                disabled={saving || !newText.trim()}
                className="flex-1 h-10 rounded-xl btn-lime flex items-center justify-center gap-2 text-sm font-semibold disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                {lang === 'es' ? 'Agregar nota' : 'Add Note'}
              </button>
            </div>
          </div>

          {/* Log entries */}
          <div className="space-y-2">
            {logs.length === 0 ? (
              <p className="text-[#6B7280] text-sm text-center py-8">
                {lang === 'es' ? 'Sin notas todavía. Agregá la primera.' : 'No notes yet. Add the first one.'}
              </p>
            ) : (
              logs.map((entry) => {
                const age = Date.now() - new Date(entry.created_at).getTime()
                const canEdit = age <= EDIT_WINDOW_MS
                const isEditing = editingId === entry.id

                return (
                  <div
                    key={entry.id}
                    className="bg-[#1E2228] border border-[#2A2D35] rounded-xl p-4"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <p className="text-[10px] text-[#6B7280]">
                        {format(new Date(entry.created_at), 'MMM d, h:mm a')}
                        {entry.author && ` · ${entry.author}`}
                      </p>
                      {canEdit && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              setEditingId(entry.id)
                              setEditText(entry.text)
                            }}
                            className="p-1.5 text-[#6B7280] hover:text-white rounded"
                            aria-label="Edit"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(entry.id)}
                            className="p-1.5 text-[#6B7280] hover:text-red-400 rounded"
                            aria-label="Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                    {isEditing ? (
                      <div className="space-y-2">
                        <textarea
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          className="w-full min-h-[60px] p-2 text-sm bg-[#0F1117] border border-[#2A2D35] rounded text-white focus:outline-none focus:border-[#A8FF3E]"
                          autoFocus
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => setEditingId(null)}
                            className="flex-1 h-8 rounded-lg border border-[#2A2D35] text-[#6B7280] text-sm"
                          >
                            {lang === 'es' ? 'Cancelar' : 'Cancel'}
                          </button>
                          <button
                            onClick={() => handleUpdate(entry.id, editText)}
                            disabled={saving}
                            className="flex-1 h-8 rounded-lg btn-lime text-sm font-medium disabled:opacity-50"
                          >
                            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mx-auto" /> : (lang === 'es' ? 'Guardar' : 'Save')}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="text-sm text-white whitespace-pre-wrap">{entry.text}</p>
                        {entry.tags && entry.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {entry.tags.map((t) => (
                              <span
                                key={t}
                                className="text-[10px] px-2 py-0.5 rounded-full bg-[#A8FF3E]/10 text-[#A8FF3E]"
                              >
                                {t}
                              </span>
                            ))}
                          </div>
                        )}
                        {entry.image_url && (
                          <div className="mt-2 rounded-lg overflow-hidden border border-[#2A2D35]">
                            <Image
                              src={entry.image_url}
                              alt=""
                              width={200}
                              height={150}
                              className="w-full h-auto object-cover"
                            />
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>

      <AppHeader />
      <MobileNav />
    </div>
  )
}
