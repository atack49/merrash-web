import fs from 'fs/promises';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'surveys.json');

export interface SurveyResponse {
    id: string;
    type: 'satisfaccion' | 'enterado';
    data: Record<string, any>;
    createdAt: string;
}

async function ensureDataDir() {
    try {
        await fs.access(DATA_DIR);
    } catch {
        await fs.mkdir(DATA_DIR, { recursive: true });
    }
}

export async function getSurveys(): Promise<SurveyResponse[]> {
    try {
        await ensureDataDir();
        const data = await fs.readFile(DATA_FILE, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        // Return empty array if file doesn't exist
        return [];
    }
}

export async function saveSurvey(response: Omit<SurveyResponse, 'id' | 'createdAt'>) {
    const surveys = await getSurveys();

    const newSurvey: SurveyResponse = {
        ...response,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
    };

    surveys.push(newSurvey);

    await ensureDataDir();
    await fs.writeFile(DATA_FILE, JSON.stringify(surveys, null, 2));

    return newSurvey;
}
