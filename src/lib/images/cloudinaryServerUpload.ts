import crypto from 'crypto';
import path from 'path';
import { readFile } from 'fs/promises';

const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY;
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET;

const ensureCloudinaryCredentials = () => {
    if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
        throw new Error('Faltan credenciales de Cloudinary para aprobar testimonios multimedia');
    }

    return {
        cloudName: CLOUDINARY_CLOUD_NAME,
        apiKey: CLOUDINARY_API_KEY,
        apiSecret: CLOUDINARY_API_SECRET,
    };
};

export const uploadLocalFileToCloudinary = async (filePath: string, folder: string) => {
    const { cloudName, apiKey, apiSecret } = ensureCloudinaryCredentials();
    const timestamp = Math.floor(Date.now() / 1000);
    const signaturePayload = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
    const signature = crypto.createHash('sha1').update(signaturePayload).digest('hex');

    const buffer = await readFile(filePath);
    const filename = path.basename(filePath);
    const mime = filename.match(/\.(mp4|mov|webm|m4v)$/i)
        ? 'video/mp4'
        : filename.match(/\.(mp3|wav|ogg|m4a)$/i)
          ? 'audio/mpeg'
          : 'application/octet-stream';

    const form = new FormData();
    form.append('file', new Blob([buffer], { type: mime }), filename);
    form.append('api_key', apiKey);
    form.append('timestamp', String(timestamp));
    form.append('signature', signature);
    form.append('folder', folder);

    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
        method: 'POST',
        body: form,
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.secure_url) {
        throw new Error(payload?.error?.message || 'No se pudo subir archivo a Cloudinary');
    }

    return String(payload.secure_url);
};

export const uploadFileToCloudinary = async (file: File, folder: string) => {
    const { cloudName, apiKey, apiSecret } = ensureCloudinaryCredentials();
    const timestamp = Math.floor(Date.now() / 1000);
    const signaturePayload = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
    const signature = crypto.createHash('sha1').update(signaturePayload).digest('hex');

    const filename = file.name || 'upload.bin';
    const mime = file.type || (filename.match(/\.(mp4|mov|webm|m4v)$/i) ? 'video/mp4' : filename.match(/\.(mp3|wav|ogg|m4a)$/i) ? 'audio/mpeg' : 'application/octet-stream');
    const arrayBuffer = await file.arrayBuffer();

    const form = new FormData();
    form.append('file', new Blob([arrayBuffer], { type: mime }), filename);
    form.append('api_key', apiKey);
    form.append('timestamp', String(timestamp));
    form.append('signature', signature);
    form.append('folder', folder);

    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
        method: 'POST',
        body: form,
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.secure_url) {
        throw new Error(payload?.error?.message || 'No se pudo subir archivo a Cloudinary');
    }

    return String(payload.secure_url);
};
