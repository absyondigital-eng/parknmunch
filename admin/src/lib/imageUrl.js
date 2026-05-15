/**
 * Resolves a product image_url to a usable src attribute.
 * - Full URLs (http/https) are returned as-is
 * - Relative paths like "images/rs5-image.jpeg" become "/images/rs5-image.jpeg"
 *   so the Vite dev-server plugin (or the deployed site root) can serve them
 */
export function resolveImageUrl(url) {
  if (!url) return null
  if (
    url.startsWith('http://') ||
    url.startsWith('https://') ||
    url.startsWith('/') ||
    url.startsWith('data:')
  ) {
    return url
  }
  return '/' + url
}
