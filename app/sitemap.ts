import type { MetadataRoute } from 'next'

const SITE_URL = 'https://roofback.app'

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()

  return [
    {
      url: SITE_URL,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    {
      url: `${SITE_URL}/terms`,
      lastModified: new Date('2026-02-01'),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/privacy`,
      lastModified: new Date('2026-02-01'),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ]
}
