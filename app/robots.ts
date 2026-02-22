import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/terms', '/privacy'],
        disallow: [
          '/dashboard',
          '/jobs',
          '/customers',
          '/settings',
          '/billing',
          '/invite',
          '/proposal/',
          '/api/',
          '/auth/',
          '/debug/',
        ],
      },
      // Allow AI crawlers (Perplexity, GPTBot, ClaudeBot) to index the landing
      {
        userAgent: ['GPTBot', 'ClaudeBot', 'PerplexityBot', 'anthropic-ai'],
        allow: ['/', '/terms', '/privacy'],
        disallow: ['/dashboard', '/jobs', '/api/', '/auth/'],
      },
    ],
    sitemap: 'https://roofback.app/sitemap.xml',
    host: 'https://roofback.app',
  }
}
