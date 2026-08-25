/** Slug normalizatsiya — UI'da ishlab turish uchun (client-side). */
export function normalizeSlug(slug: string): string {
  return slug.trim().toLowerCase();
}