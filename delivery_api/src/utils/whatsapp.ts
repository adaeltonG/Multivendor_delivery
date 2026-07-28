export function normalizeWhatsAppPhone(
  phone: string | null | undefined
): string | null {
  if (!phone) return null
  const normalized = phone.replace(/[^\d]/g, '')
  return normalized.length >= 8 && normalized.length <= 15 ? normalized : null
}
