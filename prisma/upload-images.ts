import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

const CLOUDINARY_URL = 'https://api.cloudinary.com/v1_1/dn5rjgtqq/image/upload';
const UPLOAD_PRESET = 'merrash_services_unsigned';
const BRAIN_DIR = 'C:\\Users\\axelm\\.gemini\\antigravity\\brain\\552bf0e3-f1bb-486e-b240-53c659d7c852';

const mappings = [
  { file: 'media__1778815311776.jpg', title: 'Tanatología' },
  { file: 'media__1778815429480.png', title: 'Tapping (EFT)' },
  { file: 'media__1778815481380.png', title: 'Liberación Emocional' },
  { file: 'media__1778815746697.png', title: 'Tarot de Flores de Bach' },
  { file: 'media__1778815801928.png', title: 'Realización de Hikuri (Ojo de Dios)' },
  { file: 'media__1778815962960.png', title: 'Mandalas con Flores de Bach' },
  { file: 'media__1778815994759.png', title: "Ho'oponopono para Niños" },
  { file: 'media__1778816049766.png', title: 'Taller de Espejo de Obsidiana' },
  { file: 'media__1778816118996.png', title: "Ho'oponopono para Adultos" },
  { file: 'media__1778816183867.jpg', title: 'Respiración Consciente y Celular' }
];

async function uploadToCloudinary(filePath: string) {
    const fileBuffer = fs.readFileSync(filePath);
    const ext = path.extname(filePath).substring(1) || 'png';
    const base64Data = fileBuffer.toString('base64');
    const dataUri = `data:image/${ext};base64,${base64Data}`;

    const formData = new FormData();
    formData.append('file', dataUri);
    formData.append('upload_preset', UPLOAD_PRESET);
    formData.append('folder', 'merrash/courses');

    const res = await fetch(CLOUDINARY_URL, {
        method: 'POST',
        body: formData as any
    });

    if (!res.ok) {
        const err = await res.text();
        throw new Error(`Cloudinary error: ${err}`);
    }

    const data = await res.json();
    return data.secure_url;
}

async function main() {
    console.log('🚀 Starting Cloudinary upload and DB update...');
    
    for (const mapping of mappings) {
        const fullPath = path.join(BRAIN_DIR, mapping.file);
        if (!fs.existsSync(fullPath)) {
            console.log(`⚠️ File not found: ${mapping.file}, skipping...`);
            continue;
        }

        console.log(`⏳ Uploading image for course: ${mapping.title}...`);
        try {
            const secureUrl = await uploadToCloudinary(fullPath);
            console.log(`✅ Uploaded! URL: ${secureUrl}`);
            
            const course = await prisma.course.findFirst({ where: { title: mapping.title } });
            if (course) {
                await prisma.course.update({
                    where: { id: course.id },
                    data: { icon: secureUrl }
                });
                console.log(`✅ DB updated for: ${mapping.title}`);
            } else {
                console.log(`⚠️ Course not found in DB: ${mapping.title}`);
            }
        } catch (e) {
            console.error(`❌ Failed to process ${mapping.title}:`, e);
        }
    }
    console.log('✨ All done!');
}

main().finally(async () => {
    await prisma.$disconnect();
});
