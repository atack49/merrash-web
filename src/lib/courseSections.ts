import fs from 'fs/promises';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'course-sections.json');

const DEFAULT_SECTION_NAMES = ['Cuerpo', 'Mente', 'Espíritu'];

export interface CourseSection {
  id: string;
  name: string;
  order: number;
  createdAt: string;
  updatedAt: string;
}

async function ensureDataDir() {
  try {
    await fs.access(DATA_DIR);
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
  }
}

function normalizeName(value: string) {
  return value.trim();
}

function compareByOrderAndName(a: CourseSection, b: CourseSection) {
  if (a.order !== b.order) return a.order - b.order;
  return a.name.localeCompare(b.name, 'es', { sensitivity: 'base' });
}

async function writeSections(sections: CourseSection[]) {
  await ensureDataDir();
  await fs.writeFile(DATA_FILE, JSON.stringify(sections.sort(compareByOrderAndName), null, 2), 'utf-8');
}

export async function getCourseSections(): Promise<CourseSection[]> {
  await ensureDataDir();

  try {
    const raw = await fs.readFile(DATA_FILE, 'utf-8');
    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      throw new Error('Invalid sections format');
    }

    const normalized = parsed
      .filter((row) => row && typeof row === 'object')
      .map((row, index) => {
        const item = row as Record<string, unknown>;
        const id = String(item.id || crypto.randomUUID());
        const name = normalizeName(String(item.name || ''));
        const order = Number(item.order ?? index + 1);
        const createdAt = String(item.createdAt || new Date().toISOString());
        const updatedAt = String(item.updatedAt || createdAt);

        return { id, name, order, createdAt, updatedAt };
      })
      .filter((row) => row.name.length > 0)
      .sort(compareByOrderAndName);

    if (normalized.length > 0) {
      return normalized;
    }
  } catch {
    // Fall through to initialize defaults.
  }

  const now = new Date().toISOString();
  const defaults: CourseSection[] = DEFAULT_SECTION_NAMES.map((name, index) => ({
    id: crypto.randomUUID(),
    name,
    order: index + 1,
    createdAt: now,
    updatedAt: now,
  }));

  await writeSections(defaults);
  return defaults;
}

export async function createCourseSection(name: string) {
  const normalizedName = normalizeName(name);
  if (!normalizedName) {
    throw new Error('El nombre de la sección es obligatorio');
  }

  const sections = await getCourseSections();
  const duplicated = sections.some((section) => section.name.toLowerCase() === normalizedName.toLowerCase());
  if (duplicated) {
    throw new Error('Ya existe una sección con ese nombre');
  }

  const now = new Date().toISOString();
  const section: CourseSection = {
    id: crypto.randomUUID(),
    name: normalizedName,
    order: sections.length + 1,
    createdAt: now,
    updatedAt: now,
  };

  const next = [...sections, section];
  await writeSections(next);
  return section;
}

export async function updateCourseSection(id: string, name: string) {
  const normalizedName = normalizeName(name);
  if (!normalizedName) {
    throw new Error('El nombre de la sección es obligatorio');
  }

  const sections = await getCourseSections();
  const index = sections.findIndex((section) => section.id === id);
  if (index < 0) {
    throw new Error('La sección no existe');
  }

  const duplicated = sections.some(
    (section) => section.id !== id && section.name.toLowerCase() === normalizedName.toLowerCase()
  );
  if (duplicated) {
    throw new Error('Ya existe una sección con ese nombre');
  }

  const previous = sections[index];
  const updated: CourseSection = {
    ...previous,
    name: normalizedName,
    updatedAt: new Date().toISOString(),
  };

  const next = sections.map((section) => (section.id === id ? updated : section));
  await writeSections(next);

  return { previous, updated };
}

export async function deleteCourseSection(id: string) {
  const sections = await getCourseSections();
  const section = sections.find((item) => item.id === id);
  if (!section) {
    throw new Error('La sección no existe');
  }

  const remaining = sections
    .filter((item) => item.id !== id)
    .map((item, index) => ({
      ...item,
      order: index + 1,
      updatedAt: new Date().toISOString(),
    }));

  await writeSections(remaining);
  return section;
}
