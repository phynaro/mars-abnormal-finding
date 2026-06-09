const API_ORIGIN = (import.meta.env.VITE_API_URL || 'http://localhost:3001/api').replace(/\/api\/?$/, '');

export function resolveEquipmentImageSrc(imageUrl?: string | null): string | null {
  if (!imageUrl?.trim()) return null;
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) return imageUrl;
  return `${API_ORIGIN}${imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`}`;
}
