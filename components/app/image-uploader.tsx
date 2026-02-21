'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'
import imageCompression from 'browser-image-compression'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Camera, ImageIcon, Loader2, X } from 'lucide-react'

interface ImageUploaderProps {
  /** Current array of public image URLs (controlled) */
  urls: string[]
  /** Called with the FULL updated array after each successful upload or removal */
  onChange: (urls: string[]) => void
  /** Storage path prefix, e.g. "jobId" or "jobId/activity" */
  storagePath: string
  /** Supabase Storage bucket name */
  bucketName?: string
  /** Maximum number of photos allowed */
  maxPhotos?: number
  /** Whether the uploader is disabled (e.g. approved/locked estimate) */
  disabled?: boolean
  /** Show camera icon instead of gallery icon (used for activity logs) */
  cameraMode?: boolean
  /** Language for labels */
  lang?: string
}

const COMPRESSION_OPTIONS = {
  maxSizeMB: 0.5,         // 500 KB output limit
  maxWidthOrHeight: 1920, // never larger than 1920px on any side
  useWebWorker: true,     // keep UI thread free
  fileType: 'image/jpeg', // consistent, broadly supported
}

export function ImageUploader({
  urls,
  onChange,
  storagePath,
  bucketName = 'job-photos',
  maxPhotos = 10,
  disabled = false,
  cameraMode = false,
  lang = 'es',
}: ImageUploaderProps) {
  const supabase = createClient()
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  const remaining = maxPhotos - urls.length
  const atLimit = remaining <= 0

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files || files.length === 0) return

    // Enforce the limit before doing any work
    if (atLimit) {
      toast.error(
        lang === 'es'
          ? `Máximo ${maxPhotos} fotos permitidas`
          : `Maximum ${maxPhotos} photos allowed`
      )
      if (inputRef.current) inputRef.current.value = ''
      return
    }

    const filesToProcess = Array.from(files).slice(0, remaining)
    if (Array.from(files).length > remaining) {
      toast.error(
        lang === 'es'
          ? `Solo se subirán ${filesToProcess.length} foto(s) para no exceder el límite de ${maxPhotos}`
          : `Only ${filesToProcess.length} photo(s) will upload to stay within the ${maxPhotos} limit`
      )
    }

    setUploading(true)
    try {
      const newUrls: string[] = []

      for (const file of filesToProcess) {
        // 1. Compress client-side before any network traffic
        let compressed: File | Blob
        try {
          compressed = await imageCompression(file, COMPRESSION_OPTIONS)
        } catch {
          // If compression fails for any reason, fall back to original
          compressed = file
        }

        // 2. Build a unique path inside the bucket
        const ext = 'jpg' // we always output jpeg after compression
        const filename = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
        const path = `${storagePath}/${filename}`

        // 3. Upload to Supabase Storage
        const { error: uploadErr } = await supabase.storage
          .from(bucketName)
          .upload(path, compressed, { contentType: 'image/jpeg', upsert: false })

        if (uploadErr) throw new Error(uploadErr.message)

        // 4. Get the public URL
        const { data: urlData } = supabase.storage.from(bucketName).getPublicUrl(path)
        newUrls.push(urlData.publicUrl)
      }

      const updated = [...urls, ...newUrls]
      onChange(updated)
      toast.success(
        newUrls.length === 1
          ? (lang === 'es' ? 'Foto subida y comprimida ✓' : 'Photo uploaded & compressed ✓')
          : (lang === 'es' ? `${newUrls.length} fotos subidas ✓` : `${newUrls.length} photos uploaded ✓`)
      )
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      toast.error(
        lang === 'es'
          ? `Error subiendo foto: ${msg}`
          : `Upload error: ${msg}`
      )
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  function removePhoto(index: number) {
    const updated = urls.filter((_, i) => i !== index)
    onChange(updated)
  }

  const isDisabled = disabled || uploading

  return (
    <div className="space-y-3">
      {/* Thumbnail grid */}
      {urls.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {urls.map((url, i) => (
            <div
              key={i}
              className="relative group rounded-[8px] overflow-hidden aspect-square bg-[#16191F]"
            >
              <Image src={url} alt="" fill className="object-cover" sizes="120px" />
              {!disabled && (
                <button
                  type="button"
                  onClick={() => removePhoto(i)}
                  className="absolute top-1 right-1 p-1 bg-black/70 rounded-full text-white opacity-0 group-hover:opacity-100 active:opacity-100 transition-opacity"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Upload button + counter */}
      {!disabled && (
        <div className="space-y-1.5">
          {/* Hidden file input — no capture attr so iOS/Android shows the
              native bottom sheet letting user choose camera OR library */}
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFileChange}
          />

          <button
            type="button"
            onClick={() => {
              if (atLimit) {
                toast.error(
                  lang === 'es'
                    ? `Máximo ${maxPhotos} fotos`
                    : `Maximum ${maxPhotos} photos`
                )
                return
              }
              inputRef.current?.click()
            }}
            disabled={isDisabled}
            className="w-full h-20 border-2 border-dashed border-[#2A2D35] rounded-[10px] text-[#6B7280] hover:border-[#A8FF3E] hover:text-[#A8FF3E] transition-colors flex flex-col items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin text-[#A8FF3E]" />
                <span className="text-xs font-medium text-[#A8FF3E]">
                  {lang === 'es' ? 'Comprimiendo y subiendo...' : 'Compressing & uploading...'}
                </span>
              </>
            ) : atLimit ? (
              <>
                <ImageIcon className="h-5 w-5 text-red-400" />
                <span className="text-xs text-red-400">
                  {lang === 'es' ? `Límite de ${maxPhotos} fotos alcanzado` : `${maxPhotos} photo limit reached`}
                </span>
              </>
            ) : (
              <>
                {cameraMode ? (
                  <Camera className="h-5 w-5" />
                ) : (
                  <ImageIcon className="h-5 w-5" />
                )}
                <span className="text-xs">
                  {lang === 'es' ? 'Tomar o elegir foto' : 'Take or choose photo'}
                </span>
              </>
            )}
          </button>

          {/* Counter */}
          <p className={`text-[11px] text-right pr-1 ${atLimit ? 'text-red-400 font-semibold' : 'text-[#4B5563]'}`}>
            {lang === 'es' ? 'Fotos:' : 'Photos:'} {urls.length}/{maxPhotos}
          </p>
        </div>
      )}
    </div>
  )
}
