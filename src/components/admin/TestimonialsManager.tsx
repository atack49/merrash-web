'use client';

import { useEffect, useMemo, useState } from 'react';
import { Edit2, Trash2, Eye, EyeOff, Plus, Star, CheckCircle2, Clock3 } from 'lucide-react';
import {
    getCategoryForService,
    getServicesForCategory,
    TestimonialForm,
    TESTIMONIAL_CATEGORIES,
} from '@/components/testimonials/TestimonialForm';
import { Modal } from '@/components/ui/Modal';
import { cn } from '@/lib/utils';

interface Testimonial {
    id: string;
    name: string;
    service: string;
    text: string;
    rating: number;
    source?: string;
    approved?: boolean;
    approvedAt?: string | null;
    active: boolean;
    order: number;
}

interface TestimonialsManagerProps {
    initialTestimonials: Testimonial[];
}

type PendingSubmission = {
    id: string;
    name: string;
    service: string;
    text?: string;
    rating: number;
    createdAt: string;
};

type Draft = Omit<Testimonial, 'id'>;

const EMPTY_DRAFT: Draft = {
    name: '',
    service: '',
    text: '',
    rating: 5,
    source: 'admin',
    approved: true,
    approvedAt: null,
    active: true,
    order: 0,
};

export function TestimonialsManager({ initialTestimonials }: TestimonialsManagerProps) {
    const [testimonials, setTestimonials] = useState<Testimonial[]>(initialTestimonials);
    const [pendingSubmissions, setPendingSubmissions] = useState<PendingSubmission[]>([]);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editData, setEditData] = useState<Partial<Testimonial>>({});
    const [editServiceCategory, setEditServiceCategory] = useState(TESTIMONIAL_CATEGORIES[0] || 'Cuerpo');
    const [showAddForm, setShowAddForm] = useState(false);
    const [newTestimonial, setNewTestimonial] = useState<Draft>(EMPTY_DRAFT);
    const [newServiceCategory, setNewServiceCategory] = useState(TESTIMONIAL_CATEGORIES[0] || 'Cuerpo');
    const [isLoading, setIsLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 8;

    useEffect(() => {
        const loadPending = async () => {
            try {
                const res = await fetch('/api/admin/testimonials/pending', { cache: 'no-store' });
                if (!res.ok) return;
                const data = await res.json();
                setPendingSubmissions(Array.isArray(data) ? data : []);
            } catch (error) {
                console.error('Error loading pending testimonials:', error);
            }
        };

        loadPending();
    }, []);

    const sortTestimonials = (items: Testimonial[]) =>
        [...items].sort((a, b) => {
            if (Number(Boolean(a.approved)) !== Number(Boolean(b.approved))) return Number(Boolean(a.approved)) - Number(Boolean(b.approved));
            if (Number(Boolean(a.active)) !== Number(Boolean(b.active))) return Number(Boolean(a.active)) - Number(Boolean(b.active));
            return a.order - b.order;
        });

    const updateItem = async (id: string, payload: Partial<Testimonial> | FormData) => {
        setIsLoading(true);
        try {
            const isFormData = payload instanceof FormData;
            const res = await fetch(`/api/admin/testimonials/${id}`, {
                method: 'PATCH',
                headers: isFormData ? undefined : { 'Content-Type': 'application/json' },
                body: isFormData ? payload : JSON.stringify(payload),
            });

            if (!res.ok) throw new Error('No se pudo actualizar');
            const updated = (await res.json()) as Testimonial;
            setTestimonials((prev) => sortTestimonials(prev.map((item) => (item.id === id ? updated : item))));
            return updated;
        } catch (error) {
            console.error('Error updating testimonial:', error);
            alert('Error al actualizar testimonio');
            return null;
        } finally {
            setIsLoading(false);
        }
    };

    const deleteTestimonial = async (id: string) => {
        if (!confirm('Seguro que quieres eliminar este testimonio?')) return;

        setIsLoading(true);
        try {
            const res = await fetch(`/api/admin/testimonials/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('No se pudo eliminar');
            setTestimonials((prev) => prev.filter((item) => item.id !== id));
        } catch (error) {
            console.error('Error deleting testimonial:', error);
            alert('Error al eliminar testimonio');
        } finally {
            setIsLoading(false);
        }
    };

    const saveEdit = async (id: string) => {
        const testimonial = testimonials.find((item) => item.id === id);
        if (!testimonial) return;

        const mergedValues = {
            ...testimonial,
            ...editData,
        };

        const payload = new FormData();
        payload.append('name', String(mergedValues.name || ''));
        payload.append('service', String(mergedValues.service || ''));
        payload.append('text', String(mergedValues.text || ''));
        payload.append('rating', String(mergedValues.rating || 5));
        payload.append('order', String(mergedValues.order || 0));
        payload.append('active', String(Boolean(mergedValues.active)));
        payload.append('approved', String(Boolean(mergedValues.approved)));

        const updated = await updateItem(id, payload);
        if (updated) {
            setEditingId(null);
            setEditData({});
        }
    };

    const addTestimonial = async () => {
        if (!newTestimonial.name || !newTestimonial.service) {
            alert('Nombre y servicio son obligatorios');
            return;
        }

        if (!newTestimonial.text.trim()) {
            alert('El testimonio en texto es obligatorio');
            return;
        }

        setIsLoading(true);
        try {
            const payload = new FormData();
            payload.append('name', newTestimonial.name);
            payload.append('service', newTestimonial.service);
            payload.append('text', newTestimonial.text || '');
            payload.append('rating', String(newTestimonial.rating || 5));
            payload.append('order', String(newTestimonial.order || 0));
            payload.append('active', String(Boolean(newTestimonial.active)));
            payload.append('approved', String(Boolean(newTestimonial.approved)));

            const res = await fetch('/api/admin/testimonials', {
                method: 'POST',
                body: payload,
            });

            if (!res.ok) throw new Error('No se pudo crear');
            const created = (await res.json()) as Testimonial;
            setTestimonials((prev) => sortTestimonials([created, ...prev]));
            setShowAddForm(false);
            setNewTestimonial(EMPTY_DRAFT);
            setNewServiceCategory(TESTIMONIAL_CATEGORIES[0] || 'Cuerpo');
        } catch (error) {
            console.error('Error adding testimonial:', error);
            alert('Error al agregar testimonio');
        } finally {
            setIsLoading(false);
        }
    };

    const processPending = async (id: string, action: 'approve' | 'archive' | 'delete') => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/admin/testimonials/pending', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, action }),
            });

            const payload = await res.json().catch(() => ({}));
            if (!res.ok) {
                throw new Error(payload?.error || 'No se pudo procesar el pendiente');
            }

            setPendingSubmissions((prev) => prev.filter((item) => item.id !== id));

            if (action === 'approve' && payload?.testimonial) {
                setTestimonials((prev) => sortTestimonials([payload.testimonial as Testimonial, ...prev]));
            }
        } catch (error) {
            console.error('Error processing pending testimonial:', error);
            alert(error instanceof Error ? error.message : 'Error al procesar pendiente');
        } finally {
            setIsLoading(false);
        }
    };

    const totalPages = Math.max(1, Math.ceil(testimonials.length / ITEMS_PER_PAGE));
    const currentSafePage = Math.min(currentPage, totalPages);
    const startIndex = (currentSafePage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const paginatedTestimonials = useMemo(() => testimonials.slice(startIndex, endIndex), [testimonials, startIndex, endIndex]);

    return (
        <div className="space-y-6">
            {pendingSubmissions.length > 0 && (
                <div className="space-y-3 rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
                    <h3 className="font-semibold text-amber-900">Pendientes locales</h3>
                    <p className="text-sm text-amber-800">Estos envios quedan guardados localmente hasta que los apruebes.</p>

                    <div className="grid grid-cols-1 gap-3">
                        {pendingSubmissions.map((pending) => (
                            <div key={pending.id} className="rounded-xl border border-amber-200 bg-white p-4">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div>
                                        <p className="font-semibold text-foreground">{pending.name}</p>
                                        <p className="text-sm text-muted-foreground">{pending.service}</p>
                                    </div>
                                    <span className="text-xs px-2.5 py-1 rounded-full bg-amber-100 text-amber-900">Pendiente local</span>
                                </div>

                                {pending.text && <p className="mt-2 text-sm text-muted-foreground">{pending.text}</p>}

                                <div className="mt-3 flex flex-wrap gap-2">
                                    <button onClick={() => processPending(pending.id, 'approve')} disabled={isLoading} className="px-4 py-2 rounded-full bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 disabled:opacity-60">Aprobar y publicar</button>
                                    <button onClick={() => processPending(pending.id, 'archive')} disabled={isLoading} className="px-4 py-2 rounded-full bg-secondary text-secondary-foreground text-xs font-medium hover:bg-secondary/80 disabled:opacity-60">Archivar local</button>
                                    <button onClick={() => processPending(pending.id, 'delete')} disabled={isLoading} className="px-4 py-2 rounded-full bg-destructive text-destructive-foreground text-xs font-medium hover:bg-destructive/90 disabled:opacity-60">Eliminar local</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <button
                onClick={() => setShowAddForm(true)}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-full hover:bg-primary/90 transition font-medium"
            >
                <Plus className="w-4 h-4" />
                Agregar Testimonio Manual
            </button>

            <Modal
                isOpen={showAddForm}
                onClose={() => {
                    setShowAddForm(false);
                    setNewTestimonial(EMPTY_DRAFT);
                    setNewServiceCategory(TESTIMONIAL_CATEGORIES[0] || 'Cuerpo');
                }}
                title="Nuevo testimonio manual"
                description="Completa el formulario para crear y publicar un testimonio desde el panel admin."
                maxWidthClassName="max-w-6xl"
            >
                <TestimonialForm
                    title="Nuevo Testimonio"
                    values={newTestimonial}
                    serviceCategory={newServiceCategory}
                    onChange={(patch) => setNewTestimonial((prev) => ({ ...prev, ...patch }))}
                    onServiceCategoryChange={(category) => {
                        setNewServiceCategory(category);
                        setNewTestimonial((prev) => ({
                            ...prev,
                            service: getServicesForCategory(category).some((service) => service.title === prev.service)
                                ? prev.service
                                : getServicesForCategory(category)[0]?.title || prev.service,
                        }));
                    }}
                    onSubmit={addTestimonial}
                    submitLabel="Guardar"
                    onCancel={() => {
                        setShowAddForm(false);
                        setNewTestimonial(EMPTY_DRAFT);
                        setNewServiceCategory(TESTIMONIAL_CATEGORIES[0] || 'Cuerpo');
                    }}
                    submitting={isLoading}
                    showApprovalControls
                />
            </Modal>

            <p className="text-sm text-muted-foreground">
                Pendientes primero para revisar: <span className="font-semibold">{pendingSubmissions.length + testimonials.filter((item) => !item.approved).length}</span>
            </p>

            <div className="grid grid-cols-1 gap-5">
                {paginatedTestimonials.map((testimonial) => (
                    <div key={testimonial.id} className={cn('p-6 rounded-2xl transition-all shadow-sm border border-border/50 bg-gradient-to-br', editingId === testimonial.id ? 'border-primary/50 from-primary/5 to-white ring-2 ring-primary/30 shadow-md' : testimonial.active ? 'from-secondary/5 to-secondary/10' : 'from-gray-50 to-gray-100')}>
                        {editingId === testimonial.id ? (
                            <TestimonialForm
                                values={{
                                    name: String(editData.name ?? testimonial.name),
                                    service: String(editData.service ?? testimonial.service),
                                    text: String(editData.text ?? testimonial.text),
                                    rating: Number(editData.rating ?? testimonial.rating),
                                    approved: Boolean(editData.approved ?? testimonial.approved),
                                    active: Boolean(editData.active ?? testimonial.active),
                                }}
                                serviceCategory={editServiceCategory}
                                onChange={(patch) => setEditData((prev) => ({ ...prev, ...patch }))}
                                onServiceCategoryChange={(category) => {
                                    setEditServiceCategory(category);
                                    setEditData((prev) => {
                                        const currentService = String(prev.service ?? testimonial.service);
                                        const matchingServices = getServicesForCategory(category);
                                        return {
                                            ...prev,
                                            service: matchingServices.some((service) => service.title === currentService)
                                                ? currentService
                                                : matchingServices[0]?.title || currentService,
                                        };
                                    });
                                }}
                                onSubmit={() => saveEdit(testimonial.id)}
                                submitLabel="Guardar"
                                onCancel={() => {
                                    setEditingId(null);
                                    setEditData({});
                                }}
                                submitting={isLoading}
                                showApprovalControls
                            />
                        ) : (
                            <>
                                <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                                    <div>
                                        <h3 className="font-bold text-lg text-foreground">{testimonial.name}</h3>
                                        <p className="text-sm font-medium text-primary">{testimonial.service}</p>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        <span className={cn('text-xs px-3 py-1.5 rounded-full font-medium border', testimonial.approved ? 'bg-green-50 text-green-700 border-green-200' : 'bg-amber-50 text-amber-700 border-amber-200')}>
                                            {testimonial.approved ? <CheckCircle2 className="w-3.5 h-3.5 inline mr-1" /> : <Clock3 className="w-3.5 h-3.5 inline mr-1" />}
                                            {testimonial.approved ? 'Aprobado' : 'Pendiente'}
                                        </span>
                                        <span className={cn('text-xs px-3 py-1.5 rounded-full font-medium border', testimonial.active ? 'bg-card text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200')}>
                                            {testimonial.active ? 'Visible' : 'Oculto'}
                                        </span>
                                        <span className="text-xs px-3 py-1.5 rounded-full font-medium border bg-slate-50 text-slate-700 border-slate-200">Origen: {testimonial.source || 'admin'}</span>
                                    </div>
                                </div>

                                {testimonial.text && <p className="text-muted-foreground mb-3 italic text-sm md:text-base leading-relaxed">{testimonial.text}</p>}

                                <div className="flex flex-wrap items-center gap-2 mb-4">
                                    <div className="flex gap-1">
                                        {[...Array(Math.max(1, Math.min(5, testimonial.rating)))].map((_, i) => <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />)}
                                    </div>
                                </div>

                                <div className="flex flex-wrap gap-2 w-full">
                                    <button onClick={() => { setEditingId(testimonial.id); setEditData(testimonial); setEditServiceCategory(getCategoryForService(testimonial.service)); }} className="flex items-center justify-center gap-1.5 px-5 py-2 bg-primary text-primary-foreground rounded-full text-xs font-medium hover:bg-primary/90"><Edit2 className="w-3.5 h-3.5" />Editar</button>
                                    <button onClick={() => updateItem(testimonial.id, { approved: !testimonial.approved })} className="flex items-center justify-center gap-1.5 px-5 py-2 bg-secondary text-secondary-foreground rounded-full text-xs font-medium hover:bg-secondary/80">{testimonial.approved ? 'Marcar pendiente' : 'Aprobar'}</button>
                                    <button onClick={() => updateItem(testimonial.id, { active: !testimonial.active })} className="flex items-center justify-center gap-1.5 px-5 py-2 bg-secondary text-secondary-foreground rounded-full text-xs font-medium hover:bg-secondary/80">{testimonial.active ? <><Eye className="w-3.5 h-3.5" />Ocultar</> : <><EyeOff className="w-3.5 h-3.5" />Mostrar</>}</button>
                                    <button onClick={() => deleteTestimonial(testimonial.id)} className="flex items-center justify-center gap-1.5 px-5 py-2 bg-destructive text-destructive-foreground rounded-full text-xs font-medium hover:bg-destructive/90"><Trash2 className="w-3.5 h-3.5" />Eliminar</button>
                                </div>
                            </>
                        )}
                    </div>
                ))}
            </div>

            {totalPages > 1 && (
                <div className="flex justify-center gap-2 pt-4 border-t border-border mt-4">
                    <button onClick={() => setCurrentPage(Math.max(1, currentSafePage - 1))} disabled={currentSafePage === 1} className="px-4 py-2 bg-slate-200 text-muted-foreground rounded-full hover:bg-slate-300 disabled:opacity-50">Anterior</button>
                    <span className="px-4 py-2 text-muted-foreground font-semibold">Pagina {currentSafePage} de {totalPages}</span>
                    <button onClick={() => setCurrentPage(Math.min(totalPages, currentSafePage + 1))} disabled={currentSafePage === totalPages} className="px-4 py-2 bg-slate-200 text-muted-foreground rounded-full hover:bg-slate-300 disabled:opacity-50">Siguiente</button>
                </div>
            )}
        </div>
    );
}
