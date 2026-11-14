const cache = new WeakMap();
export function visibleSpriteBounds(image) {
    if (cache.has(image)) return cache.get(image);
    const fallback = { x: 0, y: 0, width: image.naturalWidth, height: image.naturalHeight };
    try {
        const canvas = document.createElement('canvas');
        canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(image, 0, 0);
        const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
        let left = canvas.width, right = -1, top = canvas.height, bottom = -1;
        for (let y = 0; y < canvas.height; y++) for (let x = 0; x < canvas.width; x++) {
            if (data[(y * canvas.width + x) * 4 + 3] < 128) continue;
            left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y);
        }
        const bounds = right < 0 ? fallback : { x: left, y: top, width: right - left + 1, height: bottom - top + 1 };
        cache.set(image, bounds); return bounds;
    } catch { cache.set(image, fallback); return fallback; }
}
