"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Star, ChevronLeft, ChevronRight, User } from "lucide-react";

interface Testimonial {
  id: number;
  name: string;
  service: string;
  text: string;
  rating?: number;
}

const toSafeRating = (value: unknown) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 5;
  return Math.max(1, Math.min(5, Math.round(numeric)));
};

const normalizeTestimonials = (payload: unknown): Testimonial[] => {
  if (!Array.isArray(payload)) return [];

  return payload
    .filter((item) => item && typeof item === 'object')
    .map((item, index) => {
      const row = item as Record<string, unknown>;
      return {
        id: Number(row.id) || index + 1,
        name: String(row.name || 'Cliente'),
        service: String(row.service || 'Servicio'),
        text: String(row.text || ''),
        rating: toSafeRating(row.rating),
      };
    })
    .filter((item) => item.text.trim().length > 0);
};

const styles = `
@keyframes fadeSlideIn {
  from {
    opacity: 0;
    transform: translateY(24px) scale(0.98);
    filter: blur(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
    filter: blur(0);
  }
}

@keyframes fadeSlideOut {
  from {
    opacity: 1;
    transform: translateY(0) scale(1);
    filter: blur(0);
  }
  to {
    opacity: 0;
    transform: translateY(-16px) scale(0.98);
    filter: blur(4px);
  }
}

@keyframes starPop {
  from {
    opacity: 0;
    transform: scale(0.6);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.animate-testimonial {
  animation: fadeSlideIn 0.6s cubic-bezier(0.22, 1, 0.36, 1);
}

.animate-star {
  animation: starPop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}
`;

export function Testimonials() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlay, setIsAutoPlay] = useState(true);
  const [loading, setLoading] = useState(true);

  // Obtener testimonios de la API
  useEffect(() => {
    const fetchTestimonials = async () => {
      try {
        const res = await fetch('/api/testimonials');
        if (!res.ok) {
          setTestimonials([]);
          return;
        }
        const data = await res.json();
        setTestimonials(normalizeTestimonials(data));
      } catch (error) {
        console.warn('Error fetching testimonials:', error);
        setTestimonials([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTestimonials();
  }, []);

  useEffect(() => {
    if (!isAutoPlay || testimonials.length === 0) return;
    const interval = setInterval(() => {
      setCurrentIndex(i => (i + 1) % testimonials.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [isAutoPlay, testimonials.length]);

  useEffect(() => {
    if (testimonials.length === 0) {
      setCurrentIndex(0);
      return;
    }

    if (currentIndex >= testimonials.length) {
      setCurrentIndex(0);
    }
  }, [currentIndex, testimonials.length]);

  const changeSlide = (index: number) => {
    setCurrentIndex(index);
    setIsAutoPlay(false);
  };

  if (loading || testimonials.length === 0) {
    return null;
  }

  const testimonial = testimonials[currentIndex] || testimonials[0];
  if (!testimonial) return null;
  const stars = toSafeRating(testimonial.rating);

  return (
    <section id="testimonios" className="py-28 bg-white">
      <style>{styles}</style>

      <div className="container mx-auto px-4 md:px-6">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
          <h2 className="text-3xl md:text-5xl font-bold text-primary">
            Testimonios
          </h2>
          <p className="text-lg text-muted-foreground font-light">
            Experiencias reales de personas que transformaron su bienestar.
          </p>
        </div>

        {/* Card */}
        <div className="max-w-4xl mx-auto relative">
          {/* Glow */}
          <div className="absolute -inset-4 bg-primary/10 blur-3xl rounded-3xl" />

          <div
            key={currentIndex}
            className="relative bg-white rounded-3xl p-10 md:p-14 border border-primary/10 shadow-xl animate-testimonial"
          >
            {/* Stars */}
            <div className="flex gap-1 mb-6">
              {[...Array(stars)].map((_, i) => (
                <Star
                  key={i}
                  style={{ animationDelay: `${i * 60}ms` }}
                  className="w-6 h-6 fill-yellow-400 text-yellow-400 animate-star"
                />
              ))}
            </div>

            {/* Text */}
            <p className="text-xl md:text-2xl leading-relaxed italic text-foreground mb-10">
              “{testimonial.text}”
            </p>

            {/* Author */}
            <div className="flex items-center gap-4 pt-6 border-t border-primary/20">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="w-7 h-7 text-primary/60" />
              </div>
              <div>
                <p className="font-semibold text-lg">{testimonial.name}</p>
                <p className="text-sm text-primary font-medium">
                  {testimonial.service}
                </p>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-between mt-10">
              <button
                onClick={() =>
                  changeSlide(
                    currentIndex === 0
                      ? testimonials.length - 1
                      : currentIndex - 1
                  )
                }
                className="p-2 rounded-full hover:bg-primary/10 transition"
              >
                <ChevronLeft />
              </button>

              <div className="flex gap-2">
                {testimonials.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => changeSlide(i)}
                    className={`h-2 rounded-full transition-all ${
                      i === currentIndex
                        ? "w-8 bg-primary"
                        : "w-2 bg-primary/30"
                    }`}
                  />
                ))}
              </div>

              <button
                onClick={() =>
                  changeSlide((currentIndex + 1) % testimonials.length)
                }
                className="p-2 rounded-full hover:bg-primary/10 transition"
              >
                <ChevronRight />
              </button>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center mt-14">
          <Link
            href="/testimonios"
            className="inline-flex px-8 py-3 rounded-full bg-primary text-primary-foreground font-medium shadow-md hover:shadow-lg transition"
          >
            Ver más testimonios
          </Link>
        </div>
      </div>
    </section>
  );
}
