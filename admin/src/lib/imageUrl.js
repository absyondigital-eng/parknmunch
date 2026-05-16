// VITE_CUSTOMER_SITE_URL must be set in the admin Netlify site env vars
// so relative image paths (e.g. "images/rs5.jpeg") resolve against the customer site.
const CUSTOMER = (import.meta.env.VITE_CUSTOMER_SITE_URL || '').replace(/\/$/, '')

export function resolveImageUrl(url) {
  if (!url) return null
  if (
    url.startsWith('http://') ||
    url.startsWith('https://') ||
    url.startsWith('data:')
  ) {
    return url
  }
  const path = url.startsWith('/') ? url : '/' + url
  return CUSTOMER ? CUSTOMER + path : path
}
