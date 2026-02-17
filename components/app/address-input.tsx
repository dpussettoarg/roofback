'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { MapPin, ExternalLink, CheckCircle, Loader2 } from 'lucide-react'

interface AddressInputProps {
  value: string
  onChange: (address: string, lat?: number, lng?: number) => void
  placeholder?: string
  required?: boolean
  className?: string
  lang?: 'es' | 'en'
  showMap?: boolean
}

const GOOGLE_MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || ''

let googleLoaded = false
let googleLoadPromise: Promise<void> | null = null

function loadGoogleMaps(): Promise<void> {
  if (googleLoaded) return Promise.resolve()
  if (googleLoadPromise) return googleLoadPromise

  if (!GOOGLE_MAPS_KEY) return Promise.reject(new Error('No API key'))

  googleLoadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_KEY}&libraries=places`
    script.async = true
    script.onload = () => { googleLoaded = true; resolve() }
    script.onerror = () => reject(new Error('Failed to load Google Maps'))
    document.head.appendChild(script)
  })

  return googleLoadPromise
}

export function AddressInput({
  value,
  onChange,
  placeholder = '123 Main St, City, TX',
  required = false,
  className = '',
  lang = 'en',
  showMap = true,
}: AddressInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null)
  const [hasAutocomplete, setHasAutocomplete] = useState(false)
  const [validated, setValidated] = useState(false)
  const [mapUrl, setMapUrl] = useState('')
  const [loadingMap, setLoadingMap] = useState(false)

  const updateMapUrl = useCallback((address: string) => {
    if (!address || address.length < 5) {
      setMapUrl('')
      return
    }
    setLoadingMap(true)
    const encoded = encodeURIComponent(address)
    if (GOOGLE_MAPS_KEY) {
      setMapUrl(`https://www.google.com/maps/embed/v1/place?key=${GOOGLE_MAPS_KEY}&q=${encoded}&zoom=15`)
    } else {
      setMapUrl(`https://maps.google.com/maps?q=${encoded}&t=&z=15&ie=UTF8&iwloc=&output=embed`)
    }
    setTimeout(() => setLoadingMap(false), 1000)
  }, [])

  useEffect(() => {
    if (!GOOGLE_MAPS_KEY) return

    loadGoogleMaps().then(() => {
      if (!inputRef.current || autocompleteRef.current) return

      const autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
        types: ['address'],
        componentRestrictions: { country: 'us' },
        fields: ['formatted_address', 'geometry'],
      })

      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace()
        if (place.formatted_address) {
          const lat = place.geometry?.location?.lat()
          const lng = place.geometry?.location?.lng()
          onChange(place.formatted_address, lat, lng)
          setValidated(true)
          updateMapUrl(place.formatted_address)
        }
      })

      autocompleteRef.current = autocomplete
      setHasAutocomplete(true)
    }).catch(() => {
      // Google Maps not available, fall back to plain input
    })
  }, [onChange, updateMapUrl])

  useEffect(() => {
    if (value && value.length > 10 && !mapUrl) {
      updateMapUrl(value)
    }
  }, [value, mapUrl, updateMapUrl])

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newVal = e.target.value
    onChange(newVal)
    setValidated(false)
    if (newVal.length > 15) {
      updateMapUrl(newVal)
    } else {
      setMapUrl('')
    }
  }

  function openInMaps() {
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(value)}`, '_blank')
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          ref={inputRef}
          value={value}
          onChange={handleInputChange}
          placeholder={placeholder}
          required={required}
          className={`h-12 text-base pl-10 pr-10 ${className}`}
        />
        {validated && (
          <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#78BE20]" />
        )}
        {!validated && hasAutocomplete && value.length > 3 && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
              {lang === 'es' ? 'Seleccioná del menú' : 'Select from menu'}
            </span>
          </div>
        )}
      </div>

      {/* Map Preview */}
      {showMap && mapUrl && (
        <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
          {loadingMap && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-50">
              <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
            </div>
          )}
          <iframe
            src={mapUrl}
            width="100%"
            height="160"
            style={{ border: 0 }}
            allowFullScreen={false}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            className="block"
            onLoad={() => setLoadingMap(false)}
          />
          <button
            type="button"
            onClick={openInMaps}
            className="absolute bottom-2 right-2 flex items-center gap-1 bg-white/90 backdrop-blur-sm text-xs text-slate-600 px-2 py-1 rounded-lg shadow-sm hover:bg-white transition-colors"
          >
            <ExternalLink className="h-3 w-3" />
            {lang === 'es' ? 'Ver en Maps' : 'View in Maps'}
          </button>
        </div>
      )}

      {/* No map / no key fallback */}
      {showMap && !mapUrl && value.length > 15 && (
        <button
          type="button"
          onClick={openInMaps}
          className="flex items-center gap-1.5 text-xs text-[#008B99] hover:underline"
        >
          <MapPin className="h-3 w-3" />
          {lang === 'es' ? 'Verificar dirección en Google Maps' : 'Verify address on Google Maps'}
        </button>
      )}
    </div>
  )
}
