import { mkdir, readFile, readdir, rm, stat, writeFile } from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';

export type PendingTestimonialStatus = 'pending' | 'archived';

export type PendingTestimonialRecord = {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    service: string;
    text?: string;
    rating: number;
    createdAt: string;
    status: PendingTestimonialStatus;
};

const ROOT_DIR = path.join(process.cwd(), 'data', 'pending-testimonials');

const ensureDirs = async () => {
    await mkdir(ROOT_DIR, { recursive: true });
};

const recordPathById = (id: string) => path.join(ROOT_DIR, `${id}.json`);

export const createPendingTestimonialRecord = async (input: {
    name: string;
    email?: string;
    phone?: string;
    service: string;
    text?: string;
    rating: number;
}) => {
    await ensureDirs();

    const id = `pending-${Date.now()}-${randomUUID().slice(0, 8)}`;
    const payload: PendingTestimonialRecord = {
        id,
        name: input.name,
        email: input.email,
        phone: input.phone,
        service: input.service,
        text: input.text,
        rating: input.rating,
        createdAt: new Date().toISOString(),
        status: 'pending',
    };

    await writeFile(recordPathById(id), JSON.stringify(payload, null, 2), 'utf-8');
    return payload;
};

export const listPendingTestimonialRecords = async (status: PendingTestimonialStatus = 'pending') => {
    await ensureDirs();
    const files = await readdir(ROOT_DIR);
    const records: PendingTestimonialRecord[] = [];

    for (const file of files) {
        if (!file.endsWith('.json')) continue;
        const fullPath = path.join(ROOT_DIR, file);
        try {
            const raw = await readFile(fullPath, 'utf-8');
            const parsed = JSON.parse(raw) as PendingTestimonialRecord;
            if (parsed.status === status) {
                records.push(parsed);
            }
        } catch {
            // ignore malformed files
        }
    }

    return records.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
};

export const getPendingTestimonialRecord = async (id: string) => {
    try {
        const raw = await readFile(recordPathById(id), 'utf-8');
        return JSON.parse(raw) as PendingTestimonialRecord;
    } catch {
        return null;
    }
};

export const updatePendingTestimonialStatus = async (id: string, status: PendingTestimonialStatus) => {
    const current = await getPendingTestimonialRecord(id);
    if (!current) return null;
    const next = { ...current, status };
    await writeFile(recordPathById(id), JSON.stringify(next, null, 2), 'utf-8');
    return next;
};

export const deletePendingTestimonialRecord = async (id: string) => {
    const current = await getPendingTestimonialRecord(id);
    if (!current) return false;

    try {
        await rm(recordPathById(id), { force: true });
        return true;
    } catch {
        return false;
    }
};

export const hasPendingStorage = async () => {
    try {
        const stats = await stat(ROOT_DIR);
        return stats.isDirectory();
    } catch {
        return false;
    }
};
