'use client';

import { useMemo, useState, useSyncExternalStore } from 'react';
import { Modal } from '@/components/ui/Modal';
import { BookOpen } from 'lucide-react';

interface Course {
  id: string;
  title: string;
  description: string;
  active: boolean;
  order: number;
  icon?: string | null;
  category: string;
  price?: string | null;
}

interface CursosPageClientProps {
  courses: Course[];
}

const isImageSource = (value?: string | null) => {
  if (!value) return false;
  return value.trim().length > 5;
};

function useIsDesktop() {
  return useSyncExternalStore(
    (onStoreChange) => {
      if (typeof window === 'undefined') {
        return () => {};
      }

      const mq = window.matchMedia('(min-width: 768px)');
      mq.addEventListener('change', onStoreChange);
      return () => mq.removeEventListener('change', onStoreChange);
    },
    () => {
      if (typeof window === 'undefined') {
        return false;
      }
      return window.matchMedia('(min-width: 768px)').matches;
    },
    () => false
  );
}

export function CursosPageClient({ courses }: CursosPageClientProps) {
  const isDesktop = useIsDesktop();
  const categories = useMemo(() => {
    const values = courses.map((course) => course.category).filter(Boolean);
    return Array.from(new Set(values));
  }, [courses]);
  const [visibleCategory, setVisibleCategory] = useState<string | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);

  const activeCategory = visibleCategory ?? (isDesktop ? categories[0] ?? null : null);

  const coursesToShow = useMemo(() => {
    if (!activeCategory) return [];
    return courses.filter((item) => item.category === activeCategory);
  }, [courses, activeCategory]);

  const totalCourses = useMemo(
    () => courses.length,
    [courses]
  );

  return (
    <section id="cursos" className="bg-background pt-32 pb-24 md:pt-40 md:pb-32 transition-all duration-300">
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center max-w-2xl mx-auto mb-16 md:mb-20 space-y-4">
          <h1 className="text-3xl md:text-5xl font-bold text-primary tracking-tight">Nuestros Cursos</h1>
          <p className="text-lg text-muted-foreground font-light">
            Elige una categoría y descubre los cursos con su material disponible.
          </p>
          <p className="text-sm text-muted-foreground">
            Actualmente tenemos <span className="font-semibold text-foreground">{totalCourses}</span> curso{totalCourses !== 1 ? 's' : ''} publicados.
          </p>
        </div>

        <div className="flex justify-center flex-wrap gap-3 md:gap-4 mb-12 md:mb-16">
          {categories.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => setVisibleCategory(category)}
              className={[
                'px-4 md:px-6 py-2.5 rounded-full text-xs md:text-sm font-medium transition-all duration-300 border',
                activeCategory === category
                  ? 'bg-primary text-primary-foreground border-primary shadow-md scale-105'
                  : 'bg-transparent text-muted-foreground border-border hover:border-primary/50 hover:text-primary hover:scale-105',
              ].join(' ')}
            >
              {category}
            </button>
          ))}
        </div>

        {coursesToShow.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
            {coursesToShow.map((course, index) => (
              <article
                key={course.id}
                style={{ animationDelay: `${index * 70}ms` }}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedCourse(course)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    setSelectedCourse(course);
                  }
                }}
                className="group relative min-h-[220px] md:min-h-[260px] overflow-hidden rounded-3xl border border-border/50 shadow-md transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/50 animate-[fadeUp_0.45s_ease-out_forwards]"
              >
                <div className="absolute inset-0 bg-service-card" />

                <div
                  className="absolute inset-0 service-card-shapes"
                  style={{
                    backgroundImage:
                      'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 800 600\' preserveAspectRatio=\'xMidYMid slice\'%3E%3Cpath fill=\'%2343C6B5\' fill-opacity=\'0.15\' d=\'M0 0 L0 250 Q 200 350 450 150 T 800 50 L 800 0 Z\' /%3E%3Cpath fill=\'%238FD9D0\' fill-opacity=\'0.25\' d=\'M0 0 L0 100 Q 250 200 500 50 T 800 200 L 800 0 Z\' /%3E%3Cpath fill=\'%231DB4A1\' fill-opacity=\'0.1\' d=\'M800 600 L800 350 Q 550 200 300 450 T 0 500 L 0 600 Z\' /%3E%3C/svg%3E")',
                    backgroundSize: 'cover',
                  }}
                />

                <div className="absolute inset-0 service-card-highlight" />

                {isImageSource(course.icon) && (
                  <>
                    <div
                      className="absolute inset-0 bg-cover bg-no-repeat bg-center"
                      style={{ backgroundImage: `url('${course.icon}')` }}
                    />
                    <div className="absolute inset-0 bg-card/75 dark:bg-card/65 transition-colors" />
                  </>
                )}

                <div className="relative z-10 flex h-full flex-col justify-between p-4 md:p-5">
                  <div className="h-10 w-10 text-primary rounded-full bg-card/70 shadow-sm backdrop-blur-md flex items-center justify-center border border-border/50">
                    <BookOpen className="w-5 h-5 text-primary" />
                  </div>

                  <div className="mt-auto">
                    <h3 className="text-base md:text-xl font-bold text-foreground leading-tight mb-2 line-clamp-2">{course.title}</h3>
                    <p className="text-[11px] md:text-sm font-medium text-muted-foreground line-clamp-3 max-w-[90%] [word-break:break-word] mb-3">
                      {course.description || 'Sin descripción por el momento.'}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      <span className="text-[11px] bg-card text-primary px-2 py-0.5 rounded-full border border-border shadow-sm font-medium">
                        {activeCategory}
                      </span>
                      {course.price && (
                        <span className="text-[11px] bg-card text-muted-foreground px-2 py-0.5 rounded-full border border-border shadow-sm font-medium">
                          {course.price}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="mx-auto max-w-lg text-center rounded-3xl border border-dashed border-border/70 bg-card p-8 text-sm text-muted-foreground">
            No hay cursos disponibles en esta categoría todavía.
          </div>
        )}
      </div>
      <Modal
        isOpen={!!selectedCourse}
        onClose={() => setSelectedCourse(null)}
        title={selectedCourse?.title}
        description="Detalle del curso y materiales disponibles"
        maxWidthClassName="max-w-xl"
      >
        {selectedCourse && (
          <div className="space-y-5">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs bg-primary/10 text-primary px-3 py-1 rounded-full border border-primary/20 font-medium">
                {activeCategory}
              </span>
              {selectedCourse.price && (
                <span className="text-xs bg-muted text-muted-foreground px-3 py-1 rounded-full border border-border font-medium">
                  {selectedCourse.price}
                </span>
              )}
            </div>

            <p className="text-sm md:text-base leading-relaxed text-muted-foreground whitespace-pre-line">
              {selectedCourse.description || 'Este curso no tiene descripción por el momento.'}
            </p>
          </div>
        )}
      </Modal>
    </section>
  );
}
