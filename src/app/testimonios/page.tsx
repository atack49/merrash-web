'use client';

import { useEffect, useMemo, useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Star, Send, Plus } from 'lucide-react';
import {
    getCategoryForService,
    getServicesForCategory,
    TestimonialForm,
    TESTIMONIAL_CATEGORIES,
} from '@/components/testimonials/TestimonialForm';
import { Modal } from '@/components/ui/Modal';
import { cn } from '@/lib/utils';

type Testimonial = {
    id: string;
    name: string;
    service: string;
    text: string;
    rating: number;
};

const categories = TESTIMONIAL_CATEGORIES;

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
                id: String(row.id || `t-${index}`),
                name: String(row.name || 'Cliente'),
                service: String(row.service || 'Servicio'),
                text: String(row.text || ''),
                rating: toSafeRating(row.rating),
            };
        })
        .filter((item) => item.text.trim().length > 0);
};

export default function TestimoniosPage() {
    const [activeCategory, setActiveCategory] = useState('Cuerpo');
    const [items, setItems] = useState<Testimonial[]>([]);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [message, setMessage] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [selectedServiceCategory, setSelectedServiceCategory] = useState(categories[0] || 'Cuerpo');
    const [form, setForm] = useState({
        name: '',
        service: getServicesForCategory(categories[0] || 'Cuerpo')[0]?.title || '',
        text: '',
        rating: 5,
    });

    useEffect(() => {
        const fetchTestimonials = async () => {
            try {
                const res = await fetch('/api/testimonials', { cache: 'no-store' });
                if (!res.ok) {
                    setItems([]);
                    return;
                }
                const payload = await res.json();
                setItems(normalizeTestimonials(payload));
            } catch (error) {
                console.error('Error fetching testimonials', error);
                setItems([]);
            } finally {
                setLoading(false);
            }
        };

        fetchTestimonials();
    }, []);

    const groupedTestimonials = useMemo(() => {
        return items.reduce((groups, testimonial) => {
            const category = getCategoryForService(testimonial.service) || 'Espíritu';
            if (!groups[category]) groups[category] = [];
            groups[category].push(testimonial);
            return groups;
        }, {} as Record<string, Testimonial[]>);
    }, [items]);

    const filteredTestimonials = groupedTestimonials[activeCategory] || [];

    const submitClientTestimonial = async () => {
        if (!form.name.trim() || !form.service.trim()) {
            setMessage('Nombre y servicio son obligatorios.');
            return;
        }

        if (!form.text.trim()) {
            setMessage('Comparte tu experiencia en texto para enviar tu testimonio.');
            return;
        }

        setSending(true);
        setMessage('');

        try {
            const payload = new FormData();
            payload.append('name', form.name.trim());
            payload.append('service', form.service.trim());
            payload.append('text', form.text.trim());
            payload.append('rating', String(form.rating));

            const res = await fetch('/api/testimonials', {
                method: 'POST',
                body: payload,
            });

            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                setMessage(data?.error || 'No se pudo enviar tu testimonio.');
                return;
            }

            setForm({
                name: '',
                service: getServicesForCategory(selectedServiceCategory)[0]?.title || '',
                text: '',
                rating: 5,
            });
            setMessage('Gracias. Tu testimonio fue enviado y quedara visible al ser aprobado por el equipo.');
            setShowForm(false);
        } catch {
            setMessage('Ocurrio un error al enviar tu testimonio. Intenta nuevamente.');
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="flex flex-col min-h-screen">
            <Header />

            <main className="grow">
                <section className="py-20 bg-background">
                    <div className="container mx-auto px-4 md:px-6">
                        <div className="text-center max-w-3xl mx-auto mb-10 space-y-4">
                            <h1 className="text-3xl md:text-5xl font-bold text-primary tracking-tight">
                                Todos Nuestros Testimonios
                            </h1>
                            <p className="text-lg text-muted-foreground font-light">
                                Explora experiencias reales y comparte la tuya con texto, audio o video.
                            </p>
                        </div>

                        <div className="bg-card border border-border rounded-3xl p-6 md:p-8 mb-12 shadow-sm">
                            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                                <div>
                                    <h2 className="text-xl md:text-2xl font-semibold text-foreground">Dejar mi testimonio</h2>
                                    <p className="text-muted-foreground text-sm">Tu envio se revisa antes de publicarse.</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setShowForm(true)}
                                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
                                >
                                    <Plus className="w-4 h-4" />
                                    Dejar mi testimonio
                                </button>
                            </div>
                        </div>

                        <Modal
                            isOpen={showForm}
                            onClose={() => setShowForm(false)}
                            title="Comparte tu testimonio"
                            description="Completa este formulario y tu envio se revisara antes de publicarse."
                            maxWidthClassName="max-w-6xl"
                        >
                            <TestimonialForm
                                values={form}
                                serviceCategory={selectedServiceCategory}
                                onChange={(patch) => setForm((prev) => ({ ...prev, ...patch }))}
                                onServiceCategoryChange={(category) => {
                                    setSelectedServiceCategory(category);
                                    setForm((prev) => ({
                                        ...prev,
                                        service: getServicesForCategory(category).some((service) => service.title === prev.service)
                                            ? prev.service
                                            : getServicesForCategory(category)[0]?.title || prev.service,
                                    }));
                                }}
                                onSubmit={submitClientTestimonial}
                                submitLabel="Enviar testimonio"
                                submitIcon={<Send className="w-4 h-4" />}
                                message={message}
                                submitting={sending}
                            />
                        </Modal>

                        <div className="flex justify-center mb-10 flex-wrap gap-4">
                            {categories.map((category) => (
                                <button key={category} onClick={() => setActiveCategory(category)} className={cn('px-6 py-2 rounded-full text-sm font-medium transition-all duration-300 border', activeCategory === category ? 'bg-primary text-primary-foreground border-primary shadow-md' : 'bg-transparent text-muted-foreground border-border hover:border-primary/50 hover:text-primary')}>
                                    {category}
                                </button>
                            ))}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 min-h-[320px]">
                            {!loading && filteredTestimonials.length === 0 && (
                                <p className="text-muted-foreground">Aun no hay testimonios visibles en esta categoria.</p>
                            )}

                            {filteredTestimonials.map((testimonial, index) => (
                                <div key={testimonial.id} style={{ animationDelay: `${index * 70}ms` }} className="p-6 rounded-2xl border border-border/50 bg-secondary/10 hover:bg-secondary/30 hover:shadow-md transition-all duration-300 animate-[fadeUp_0.45s_ease-out_forwards]">
                                    <div className="flex items-center mb-4">
                                        {[...Array(testimonial.rating)].map((_, i) => (
                                            <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                                        ))}
                                    </div>

                                    {testimonial.text && <p className="text-muted-foreground mb-4 leading-relaxed italic">{testimonial.text}</p>}

                                    <div>
                                        <p className="font-semibold text-foreground">{testimonial.name}</p>
                                        <p className="text-sm text-muted-foreground">{testimonial.service}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            </main>

            <Footer />
        </div>
    );
}
