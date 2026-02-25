/**
 * Centralized logger for RoofBack.
 * Only logs in development. Can be swapped for Sentry in production.
 */

const isDev = process.env.NODE_ENV === 'development'

export const logger = {
  debug: (...args: unknown[]) => {
    if (isDev) console.debug(...args)
  },
  info: (...args: unknown[]) => {
    if (isDev) console.info(...args)
  },
  warn: (...args: unknown[]) => {
    if (isDev) console.warn(...args)
  },
  error: (...args: unknown[]) => {
    // Always log errors — swap for Sentry in production
    console.error(...args)
  },
}
