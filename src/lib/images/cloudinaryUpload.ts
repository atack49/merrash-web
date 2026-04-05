const CLOUDINARY_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.78;

const ensureCloudinaryConfig = () => {
    if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
        throw new Error('Falta configurar Cloudinary. Define NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME y NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET.');
    }
};

const isSvgFile = (file: File) => file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg');

const loadImageFromFile = async (file: File): Promise<HTMLImageElement> => {
    const objectUrl = URL.createObjectURL(file);

    try {
        return await new Promise<HTMLImageElement>((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error('No se pudo procesar la imagen.'));
            img.src = objectUrl;
        });
    } finally {
        URL.revokeObjectURL(objectUrl);
    }
};

const prepareRasterFile = async (file: File) => {
    const image = await loadImageFromFile(file);
    const maxSide = Math.max(image.width, image.height);
    const scale = maxSide > MAX_DIMENSION ? MAX_DIMENSION / maxSide : 1;

    const targetWidth = Math.max(1, Math.round(image.width * scale));
    const targetHeight = Math.max(1, Math.round(image.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const context = canvas.getContext('2d');
    if (!context) {
        throw new Error('No fue posible optimizar la imagen en el navegador.');
    }

    context.drawImage(image, 0, 0, targetWidth, targetHeight);

    const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY);
    });

    if (!blob) {
        throw new Error('No se pudo comprimir la imagen.');
    }

    const baseName = file.name.replace(/\.[^.]+$/, '') || 'service-image';
    return new File([blob], `${baseName}.jpg`, { type: 'image/jpeg' });
};

const buildOptimizedCloudinaryUrl = (secureUrl: string) => {
    return secureUrl.replace('/upload/', '/upload/f_auto,q_auto,w_1600/');
};

const buildCloudinaryUrl = (secureUrl: string, file: File) => {
    return file.type.startsWith('image/') ? buildOptimizedCloudinaryUrl(secureUrl) : secureUrl;
};

export async function uploadServiceImageToCloudinary(file: File): Promise<string> {
    ensureCloudinaryConfig();

    const preparedFile = isSvgFile(file) ? file : await prepareRasterFile(file);

    const formData = new FormData();
    formData.append('file', preparedFile);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET as string);
    formData.append('folder', 'merrash/services');

    const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
        method: 'POST',
        body: formData,
    });

    const payload = await response.json();
    if (!response.ok || !payload?.secure_url) {
        throw new Error(payload?.error?.message || 'No se pudo subir la imagen a Cloudinary.');
    }

    return buildOptimizedCloudinaryUrl(String(payload.secure_url));
}

export async function uploadFileToCloudinary(file: File, folder = 'merrash/course-materials'): Promise<string> {
    ensureCloudinaryConfig();

    const preparedFile = file.type.startsWith('image/') && !isSvgFile(file)
        ? await prepareRasterFile(file)
        : file;

    const formData = new FormData();
    formData.append('file', preparedFile);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET as string);
    formData.append('folder', folder);

    const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`, {
        method: 'POST',
        body: formData,
    });

    const payload = await response.json();
    if (!response.ok || !payload?.secure_url) {
        throw new Error(payload?.error?.message || 'No se pudo subir el archivo a Cloudinary.');
    }

    return buildCloudinaryUrl(String(payload.secure_url), preparedFile);
}
