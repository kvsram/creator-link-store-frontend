const PRODUCT_IMAGE_TYPES = Object.freeze(['image/jpeg', 'image/png', 'image/webp']);
const MAX_PRODUCT_IMAGE_BYTES = 8 * 1024 * 1024;

export function productDetailPath(handle, productId) {
  const id = Number(productId);
  const normalizedHandle = String(handle || '').trim().toLowerCase();
  if (!normalizedHandle || !Number.isSafeInteger(id) || id <= 0) return '';
  return `/${encodeURIComponent(normalizedHandle)}/products/${id}`;
}

export function publicProductMedia(product = {}) {
  const cover = text(product.thumbnail_url ?? product.thumbnailUrl ?? product.cover_url ?? product.coverUrl);
  const rawGallery = Array.isArray(product.gallery) ? product.gallery : [];
  const gallery = rawGallery
    .map((item, index) => typeof item === 'string'
      ? {id: `gallery-${index}`, url: text(item), altText: ''}
      : {
          id: item?.id ?? `gallery-${index}`,
          url: text(item?.url ?? item?.public_url ?? item?.publicUrl),
          altText: text(item?.alt_text ?? item?.altText)
        })
    .filter(item => item.url);
  const images = cover
    ? [{id: 'cover', url: cover, altText: text(product.title)}, ...gallery.filter(item => item.url !== cover)]
    : gallery;
  return {cover, gallery, images};
}

export function publicProductHighlights(product = {}, derived = []) {
  const authored = Array.isArray(product.highlights) ? product.highlights : [];
  const values = [...authored, ...(Array.isArray(derived) ? derived : [])]
    .map(text)
    .filter(Boolean);
  return [...new Set(values)].slice(0, 8);
}

export function productImageValidation(file) {
  if (!file) return 'Choose an image to continue.';
  if (!PRODUCT_IMAGE_TYPES.includes(String(file.type || '').toLowerCase())) {
    return 'Use a JPG, PNG, or WebP image.';
  }
  if (Number(file.size || 0) > MAX_PRODUCT_IMAGE_BYTES) {
    return 'Each product image must be 8 MB or smaller.';
  }
  return '';
}

export function checkoutTrustLabel(product = {}) {
  return product.type === 'lead-magnet' || Number(product.price_subunits || 0) === 0
    ? 'Free access · no payment required'
    : 'Review your order before payment';
}

function text(value) {
  return value == null ? '' : String(value).trim();
}
