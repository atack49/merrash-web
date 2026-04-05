import crypto from 'crypto';

const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY;
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET;

const isCloudinaryHost = (host: string) => host === 'res.cloudinary.com' || host.endsWith('.res.cloudinary.com');

const isLikelyTransformationSegment = (segment: string) => {
    if (!segment) return false;
    if (segment.includes(',')) return true;
    return /^(?:[a-z]{1,3}_.+)$/.test(segment);
};

export const extractCloudinaryPublicId = (url: string): string | null => {
    try {
        const parsed = new URL(url);
        if (!isCloudinaryHost(parsed.hostname)) return null;

        const segments = parsed.pathname.split('/').filter(Boolean);
        const uploadIndex = segments.indexOf('upload');
        if (uploadIndex === -1) return null;

        let tail = segments.slice(uploadIndex + 1);
        if (tail.length === 0) return null;

        const versionIndex = tail.findIndex((segment) => /^v\d+$/.test(segment));
        if (versionIndex >= 0) {
            tail = tail.slice(versionIndex + 1);
        } else {
            while (tail.length > 1 && isLikelyTransformationSegment(tail[0])) {
                tail = tail.slice(1);
            }
        }

        if (tail.length === 0) return null;

        const last = tail[tail.length - 1].replace(/\.[^.]+$/, '');
        if (!last) return null;

        tail[tail.length - 1] = last;
        return tail.join('/');
    } catch {
        return null;
    }
};

export const deleteCloudinaryAssetByUrl = async (url?: string | null) => {
    if (!url) {
        return { deleted: false, skipped: true, reason: 'missing_url' as const };
    }

    if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
        return { deleted: false, skipped: true, reason: 'missing_credentials' as const };
    }

    const publicId = extractCloudinaryPublicId(url);
    if (!publicId) {
        return { deleted: false, skipped: true, reason: 'invalid_public_id' as const };
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const signaturePayload = `invalidate=true&public_id=${publicId}&timestamp=${timestamp}${CLOUDINARY_API_SECRET}`;
    const signature = crypto.createHash('sha1').update(signaturePayload).digest('hex');

    const body = new URLSearchParams({
        public_id: publicId,
        api_key: CLOUDINARY_API_KEY,
        timestamp: String(timestamp),
        signature,
        invalidate: 'true',
    });

    const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/destroy`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body,
    });

    const payload = await response.json().catch(() => null);
    const result = payload?.result;

    return {
        deleted: Boolean(response.ok && (result === 'ok' || result === 'not found')),
        skipped: false,
        result: typeof result === 'string' ? result : undefined,
        status: response.status,
        payload,
    };
};
