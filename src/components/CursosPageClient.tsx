'use client';

import { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import { Modal } from '@/components/ui/Modal';

type ContentType = 'TASK' | 'MATERIAL' | 'PDF' | 'TOOL';

interface CourseContent {
  id: string;
  title: string;
  description?: string | null;
  resourceUrl?: string | null;
  type: ContentType;
}

interface Course {
  id: string;
  title: string;
  description?: string | null;
  active: boolean;
  order: number;
  contents: CourseContent[];
}

interface Section {
  id: string;
  title: string;
  description?: string | null;
  courses: Course[];
}

interface CursosPageClientProps {
  sections: Section[];
}

function getCourseKey(courseId: string) {
  return courseId.slice(0, 8).toUpperCase();
}

function isYouTubeUrl(url?: string | null) {
  if (!url) return false;
  return /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)/i.test(url);
}

function getYouTubeEmbedUrl(url?: string | null) {
  if (!url) return '';
  const match = url.match(/(?:v=|youtu\.be\/|embed\/)([\w-]+)/);
  return match ? `https://www.youtube.com/embed/${match[1]}` : url;
}

export function CursosPageClient({ sections }: CursosPageClientProps) {
  const [joinedCourses, setJoinedCourses] = useState<string[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [courseKeyEntry, setCourseKeyEntry] = useState<string>('');
  const [courseKeyError, setCourseKeyError] = useState<string>('');
  const [showCourseKeyModal, setShowCourseKeyModal] = useState(false);
  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [activeMaterialId, setActiveMaterialId] = useState<string>('');

  useEffect(() => {
    const stored = localStorage.getItem('joinedCourses');
    if (stored) {
      setJoinedCourses(JSON.parse(stored));
    }
  }, []);

  const saveJoinedCourses = (courses: string[]) => {
    localStorage.setItem('joinedCourses', JSON.stringify(courses));
    setJoinedCourses(courses);
  };

  const allCourses = useMemo(() => sections.flatMap(section => section.courses), [sections]);

  const selectedCourse = useMemo(
    () => allCourses.find((course) => course.id === selectedCourseId) || null,
    [allCourses, selectedCourseId]
  );

  const joinedCourseObjects = useMemo(
    () => allCourses.filter(course => joinedCourses.includes(course.id)),
    [allCourses, joinedCourses]
  );

  const findCourseByKey = (key: string) => {
    const normalized = key.trim().toUpperCase();
    return allCourses.find((course) => getCourseKey(course.id) === normalized) || null;
  };

  const handleOpenCourseKeyModal = () => {
    setCourseKeyEntry('');
    setCourseKeyError('');
    setShowCourseKeyModal(true);
  };

  const handleCourseKeySubmit = () => {
    const course = findCourseByKey(courseKeyEntry);
    if (!course) {
      setCourseKeyError('Clave incorrecta. Revisa el código y vuelve a intentarlo.');
      return;
    }

    if (!joinedCourses.includes(course.id)) {
      const newJoined = [...joinedCourses, course.id];
      saveJoinedCourses(newJoined);
    }

    setSelectedCourseId(course.id);
    setShowCourseKeyModal(false);
    setCourseKeyError('');
  };

  const handleSelectJoinedCourse = (courseId: string) => {
    setSelectedCourseId(courseId);
  };

  const openMaterialModal = (contentId: string) => {
    setActiveMaterialId(contentId);
    setShowMaterialModal(true);
  };

  const activeMaterial = useMemo(
    () => selectedCourse?.contents.find((content) => content.id === activeMaterialId) || selectedCourse?.contents[0] || null,
    [selectedCourse, activeMaterialId]
  );

  return (
    <div className="container mx-auto px-4 py-16 lg:px-8">
      <div className="max-w-4xl space-y-4 text-center mx-auto mb-12">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-primary">Cursos</p>
        <h1 className="text-4xl font-semibold sm:text-5xl">Formación para alumnos y acompañamiento de clase</h1>
        <p className="text-base leading-8 text-muted-foreground">
          Accede a tus cursos con la clave proporcionada. Una vez dentro, podrás ver todos tus materiales y recursos.
        </p>
      </div>

      {joinedCourses.length === 0 ? (
        <div className="max-w-md mx-auto text-center space-y-6">
          <div className="rounded-3xl border border-border bg-card p-8 shadow-sm">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Bienvenido</p>
              <h2 className="mt-2 text-2xl font-semibold">Accede a tu primer curso</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Ingresa la clave del curso que te compartieron para comenzar.
              </p>
            </div>
            <div className="mt-6">
              <button
                type="button"
                onClick={handleOpenCourseKeyModal}
                className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white hover:bg-primary/90"
              >
                Meterme a curso
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold">Mis cursos</h2>
              <p className="text-sm text-muted-foreground">Cursos a los que tienes acceso.</p>
            </div>
            <button
              type="button"
              onClick={handleOpenCourseKeyModal}
              className="inline-flex items-center justify-center rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90"
            >
              Unirme a otro curso
            </button>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {joinedCourseObjects.map((course) => (
              <button
                key={course.id}
                type="button"
                onClick={() => handleSelectJoinedCourse(course.id)}
                className={`rounded-3xl border p-6 text-left transition ${
                  course.id === selectedCourseId
                    ? 'border-primary bg-primary/5'
                    : 'border-border/70 bg-card hover:border-primary/80'
                }`}
              >
                <div>
                  <h3 className="text-lg font-semibold">{course.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                    {course.description || 'Sin descripción'}
                  </p>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                      {course.contents.length} materiales
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {selectedCourse && (
            <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
              <div className="space-y-6">
                <div>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Curso seleccionado</p>
                      <h3 className="mt-2 text-2xl font-semibold">{selectedCourse.title}</h3>
                    </div>
                    <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                      {selectedCourse.contents.length} items
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">{selectedCourse.description || 'Este curso no tiene descripción aún.'}</p>
                </div>

                <div className="space-y-4">
                  {selectedCourse.contents.length === 0 ? (
                    <div className="rounded-3xl border border-dashed border-border/70 bg-background p-6 text-center text-sm text-muted-foreground">
                      No hay materiales añadidos todavía.
                    </div>
                  ) : (
                    selectedCourse.contents.map((content) => (
                      <div key={content.id} className="rounded-3xl border border-border p-4 bg-background">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">{content.type}</p>
                            <h4 className="mt-2 text-base font-semibold">{content.title}</h4>
                            {content.description ? <p className="mt-2 text-sm text-muted-foreground">{content.description}</p> : null}
                          </div>
                          {content.resourceUrl ? (
                            <button
                              type="button"
                              onClick={() => openMaterialModal(content.id)}
                              className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/20"
                            >
                              Ver material
                            </button>
                          ) : (
                            <span className="rounded-full bg-muted px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                              Sin archivo
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <Modal
        isOpen={showCourseKeyModal}
        onClose={() => setShowCourseKeyModal(false)}
        title="Acceso al curso"
        description="Ingresa la clave del curso para unirte."
        maxWidthClassName="max-w-xl"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Cada curso tiene una clave única. Ingresa la clave para unirte al curso.
          </p>
          <input
            type="text"
            value={courseKeyEntry}
            onChange={(e) => setCourseKeyEntry(e.target.value)}
            className="w-full rounded-2xl border border-border px-4 py-3 bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Ingresa la clave del curso"
          />
          {courseKeyError ? <p className="text-sm text-rose-600">{courseKeyError}</p> : null}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleCourseKeySubmit}
              className="inline-flex items-center justify-center rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90"
            >
              Unirme al curso
            </button>
            <button
              type="button"
              onClick={() => setShowCourseKeyModal(false)}
              className="inline-flex items-center justify-center rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted"
            >
              Cancelar
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showMaterialModal}
        onClose={() => setShowMaterialModal(false)}
        title="Recursos"
        description="Selecciona el material que quieres ver o abrir."
        maxWidthClassName="max-w-4xl"
      >
        <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
          <div className="space-y-3">
            {selectedCourse?.contents.map((content) => (
              <button
                key={content.id}
                type="button"
                onClick={() => setActiveMaterialId(content.id)}
                className={`w-full rounded-3xl border p-4 text-left transition ${
                  content.id === activeMaterial?.id ? 'border-primary bg-primary/5' : 'border-border/70 bg-background hover:border-primary/80'
                }`}
              >
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">{content.type}</p>
                <h4 className="mt-2 text-sm font-semibold">{content.title}</h4>
                <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{content.description || 'Sin descripción'}</p>
              </button>
            ))}
          </div>
          <div className="space-y-4 rounded-3xl border border-border bg-background p-4">
            {activeMaterial ? (
              <>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">{activeMaterial.type}</p>
                  <h3 className="mt-2 text-xl font-semibold">{activeMaterial.title}</h3>
                  <p className="mt-3 text-sm text-muted-foreground">{activeMaterial.description || 'No hay descripción adicional.'}</p>
                </div>
                {isYouTubeUrl(activeMaterial.resourceUrl) ? (
                  <div className="mt-4 aspect-video overflow-hidden rounded-3xl bg-black">
                    <iframe
                      src={getYouTubeEmbedUrl(activeMaterial.resourceUrl || '')}
                      title={activeMaterial.title}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="h-full w-full"
                    />
                  </div>
                ) : activeMaterial.resourceUrl ? (
                  <div className="mt-4 space-y-3">
                    <p className="text-sm text-muted-foreground">Recurso externo:</p>
                    <a
                      href={activeMaterial.resourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90"
                    >
                      Abrir en otra pestaña
                    </a>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No hay recurso disponible para este material.</p>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Selecciona un recurso para ver más detalles.</p>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}
