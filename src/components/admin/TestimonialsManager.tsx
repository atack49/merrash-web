'use client';

import { useState } from 'react';
import { Edit2, Trash2, Eye, EyeOff, Plus, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Testimonial {
    id: string;
    name: string;
    service: string;
    text: string;
    rating: number;
    active: boolean;
}

interface TestimonialsManagerProps {
    initialTestimonials: Testimonial[];
}

export function TestimonialsManager({ initialTestimonials }: TestimonialsManagerProps) {
    const [testimonials, setTestimonials] = useState<Testimonial[]>(initialTestimonials);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editData, setEditData] = useState<Partial<Testimonial>>({});
    const [showAddForm, setShowAddForm] = useState(false);
    const [newTestimonial, setNewTestimonial] = useState({
        name: '',
        service: '',
        text: '',
        rating: 5,
    });
    const [isLoading, setIsLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 10;

    // Handle toggle active/inactive
    const toggleActive = async (id: string, currentActive: boolean) => {
        setIsLoading(true);
        try {
            const res = await fetch(`/api/admin/testimonials/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ active: !currentActive }),
            });
            if (res.ok) {
                setTestimonials(testimonials.map(t =>
                    t.id === id ? { ...t, active: !currentActive } : t
                ));
            }
        } catch (error) {
            console.error('Error toggling testimonial:', error);
            alert('Error al actualizar');
        } finally {
            setIsLoading(false);
        }
    };

    // Handle delete
    const deleteTestimonial = async (id: string) => {
        if (!confirm('¿Estás seguro de que quieres eliminar este testimonio?')) return;
        setIsLoading(true);
        try {
            const res = await fetch(`/api/admin/testimonials/${id}`, {
                method: 'DELETE',
            });
            if (res.ok) {
                setTestimonials(testimonials.filter(t => t.id !== id));
            }
        } catch (error) {
            console.error('Error deleting testimonial:', error);
            alert('Error al eliminar');
        } finally {
            setIsLoading(false);
        }
    };

    // Handle save edit
    const saveEdit = async (id: string) => {
        setIsLoading(true);
        try {
            const res = await fetch(`/api/admin/testimonials/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editData),
            });
            if (res.ok) {
                const updated = await res.json();
                setTestimonials(testimonials.map(t => (t.id === id ? updated : t)));
                setEditingId(null);
                setEditData({});
            }
        } catch (error) {
            console.error('Error updating testimonial:', error);
            alert('Error al guardar');
        } finally {
            setIsLoading(false);
        }
    };

    // Handle add new
    const addTestimonial = async () => {
        if (!newTestimonial.name || !newTestimonial.service || !newTestimonial.text) {
            alert('Completa todos los campos');
            return;
        }
        setIsLoading(true);
        try {
            const res = await fetch('/api/admin/testimonials', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newTestimonial),
            });
            if (res.ok) {
                const created = await res.json();
                setTestimonials([...testimonials, created]);
                setShowAddForm(false);
                setNewTestimonial({ name: '', service: '', text: '', rating: 5 });
            }
        } catch (error) {
            console.error('Error adding testimonial:', error);
            alert('Error al agregar');
        } finally {
            setIsLoading(false);
        }
    };

    // Pagination logic
    const totalPages = Math.ceil(testimonials.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const paginatedTestimonials = testimonials.slice(startIndex, endIndex);

    return (
        <div className="space-y-6">
            {/* Add Button */}
            <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-full hover:bg-primary/90 transition font-medium"
            >
                <Plus className="w-4 h-4" />
                Agregar Testimonio
            </button>

            {/* Add Form */}
            {showAddForm && (
                <div className="bg-gradient-to-br from-primary/5 to-white ring-2 ring-primary/30 rounded-2xl border border-primary/50 shadow-lg p-6 md:p-8 space-y-4 w-full">
                    <h3 className="font-bold text-lg text-slate-900">Nuevo Testimonio</h3>
                    <div className="space-y-4 w-full">
                        <input
                            type="text"
                            placeholder="Nombre"
                            value={newTestimonial.name}
                            onChange={(e) => setNewTestimonial({ ...newTestimonial, name: e.target.value })}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-full focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                        />
                        <input
                            type="text"
                            placeholder="Servicio (ej: Acupuntura)"
                            value={newTestimonial.service}
                            onChange={(e) => setNewTestimonial({ ...newTestimonial, service: e.target.value })}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-full focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                        />
                        <textarea
                            placeholder="Testimonio"
                            value={newTestimonial.text}
                            onChange={(e) => setNewTestimonial({ ...newTestimonial, text: e.target.value })}
                            className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-3xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary h-24 resize-none transition-all"
                        />
                        <div>
                            <label className="text-sm font-medium text-slate-700 block mb-2 px-1">Calificación</label>
                            <div className="inline-flex gap-1.5 bg-white px-4 py-2.5 rounded-full border border-slate-200 shadow-sm">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <button
                                        key={star}
                                        onClick={() => setNewTestimonial({ ...newTestimonial, rating: star })}
                                        className="transition-all hover:scale-110 focus:outline-none"
                                        title={`Calificar con ${star} estrellas`}
                                    >
                                        <Star
                                            className={cn(
                                                'w-6 h-6 transition-colors',
                                                star <= newTestimonial.rating
                                                    ? 'fill-amber-400 text-amber-400'
                                                    : 'text-slate-200 hover:text-amber-200'
                                            )}
                                        />
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-primary/20">
                            <button
                                onClick={addTestimonial}
                                disabled={isLoading}
                                className="flex-1 px-6 py-2.5 bg-primary text-white rounded-full hover:bg-primary/90 disabled:opacity-50 font-medium transition-all shadow-sm flex items-center justify-center gap-2"
                            >
                                Guardar
                            </button>
                            <button
                                onClick={() => setShowAddForm(false)}
                                className="flex-1 px-6 py-2.5 bg-secondary text-secondary-foreground rounded-full hover:bg-secondary/80 font-medium transition-all border border-secondary-foreground/10 flex items-center justify-center gap-2"
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Testimonials Grid */}
            <div className="space-y-6">
                {/* Info y Pagination */}
                <div className="flex flex-col md:flex-row items-center justify-between gap-4 px-2">
                    <p className="text-sm text-slate-600">
                        Mostrando <span className="font-semibold">{startIndex + 1}</span> a <span className="font-semibold">{Math.min(endIndex, testimonials.length)}</span> de <span className="font-semibold">{testimonials.length}</span> testimonios
                    </p>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                            disabled={currentPage === 1}
                            className="px-4 py-2 bg-slate-200 text-slate-700 rounded-full hover:bg-slate-300 disabled:opacity-50 disabled:cursor-not-allowed transition"
                        >
                            ← Anterior
                        </button>
                        <div className="flex items-center gap-2">
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                <button
                                    key={page}
                                    onClick={() => setCurrentPage(page)}
                                    className={`px-3 py-2 rounded-full transition ${currentPage === page
                                            ? 'bg-primary text-white font-semibold'
                                            : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                                        }`}
                                >
                                    {page}
                                </button>
                            ))}
                        </div>
                        <button
                            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                            disabled={currentPage === totalPages}
                            className="px-4 py-2 bg-slate-200 text-slate-700 rounded-full hover:bg-slate-300 disabled:opacity-50 disabled:cursor-not-allowed transition"
                        >
                            Siguiente →
                        </button>
                    </div>
                </div>

                {/* Grid */}
                <div className="grid grid-cols-1 gap-6">
                    {paginatedTestimonials.map((testimonial) => (
                        <div
                            key={testimonial.id}
                            className={cn(
                                "p-6 rounded-2xl transition-all shadow-sm border border-border/50 flex flex-col items-start min-h-[140px] bg-gradient-to-br",
                                editingId === testimonial.id
                                    ? 'border-primary/50 from-primary/5 to-white ring-2 ring-primary/30 shadow-md'
                                    : testimonial.active
                                        ? 'from-secondary/5 to-secondary/10 hover:from-secondary/10 hover:to-secondary/20 hover:shadow-md'
                                        : 'from-gray-50 to-gray-100 opacity-70'
                            )}
                        >
                            {editingId === testimonial.id ? (
                                // Edit Mode
                                <div className="space-y-4 w-full">
                                    <input
                                        type="text"
                                        placeholder="Nombre"
                                        value={editData.name || testimonial.name}
                                        onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-full focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-sm md:text-base transition-all"
                                    />
                                    <input
                                        type="text"
                                        placeholder="Servicio"
                                        value={editData.service || testimonial.service}
                                        onChange={(e) => setEditData({ ...editData, service: e.target.value })}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-full focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-sm md:text-base transition-all"
                                    />
                                    <textarea
                                        placeholder="Testimonio"
                                        value={editData.text || testimonial.text}
                                        onChange={(e) => setEditData({ ...editData, text: e.target.value })}
                                        className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-3xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-sm md:text-base h-24 resize-none transition-all"
                                    />
                                    <div>
                                        <label className="text-xs font-medium text-slate-700 block mb-2 px-1">Calificación</label>
                                        <div className="inline-flex gap-1.5 bg-white px-4 py-2.5 rounded-full border border-slate-200 shadow-sm">
                                            {[1, 2, 3, 4, 5].map((star) => (
                                                <button
                                                    key={star}
                                                    onClick={() => setEditData({ ...editData, rating: star })}
                                                    className="transition-all hover:scale-110 focus:outline-none"
                                                    title={`Calificar con ${star} estrellas`}
                                                >
                                                    <Star
                                                        className={cn(
                                                            'w-6 h-6 transition-colors',
                                                            star <= (editData.rating || testimonial.rating)
                                                                ? 'fill-amber-400 text-amber-400'
                                                                : 'text-slate-200 hover:text-amber-200'
                                                        )}
                                                    />
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="flex flex-col sm:flex-row gap-2 pt-4 border-t border-primary/20 mt-4">
                                        <button
                                            onClick={() => saveEdit(testimonial.id)}
                                            disabled={isLoading}
                                            className="flex-1 px-4 py-2.5 bg-primary text-white rounded-full text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition shadow-sm"
                                        >
                                            Guardar
                                        </button>
                                        <button
                                            onClick={() => { setEditingId(null); setEditData({}); }}
                                            className="flex-1 px-4 py-2.5 bg-secondary text-secondary-foreground rounded-full text-sm font-medium hover:bg-secondary/80 border border-secondary-foreground/10 transition shadow-sm"
                                        >
                                            Cancelar
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                // View Mode
                                <>
                                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between w-full mb-3 gap-2 md:gap-4">
                                        <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
                                            <h3 className="font-bold text-lg md:text-xl text-slate-800">{testimonial.name}</h3>
                                            <div className="hidden md:block w-1.5 h-1.5 rounded-full bg-slate-300"></div>
                                            <p className="text-sm font-medium text-primary bg-primary/10 px-3 py-1 rounded-full">{testimonial.service}</p>
                                        </div>
                                        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
                                            <div className="flex gap-1 bg-white/50 px-3 py-1.5 rounded-full border border-slate-200/60">
                                                {[...Array(testimonial.rating)].map((_, i) => (
                                                    <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                                                ))}
                                            </div>
                                            <span className={cn(
                                                "text-xs px-3 py-1.5 rounded-full font-medium shadow-sm border",
                                                testimonial.active ? 'bg-white text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'
                                            )}>
                                                {testimonial.active ? '✓ Visible' : '✕ Oculto'}
                                            </span>
                                        </div>
                                    </div>

                                    <p className="text-slate-600 mb-6 italic text-sm md:text-base leading-relaxed bg-white/40 p-4 rounded-xl border border-white flex-1 w-full relative">
                                        <span className="text-3xl text-primary/20 absolute -top-1 -left-1 font-serif">"</span>
                                        {testimonial.text}
                                        <span className="text-3xl text-primary/20 absolute -bottom-4 right-1 font-serif">"</span>
                                    </p>

                                    <div className="flex flex-wrap gap-2 w-full mt-auto">
                                        <button
                                            onClick={() => { setEditingId(testimonial.id); setEditData(testimonial); }}
                                            className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-6 py-2 bg-primary text-primary-foreground rounded-full text-xs font-medium hover:bg-primary/90 transition shadow-sm"
                                        >
                                            <Edit2 className="w-3.5 h-3.5" />
                                            Editar
                                        </button>
                                        <button
                                            onClick={() => toggleActive(testimonial.id, testimonial.active)}
                                            className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-6 py-2 bg-secondary text-secondary-foreground rounded-full text-xs font-medium hover:bg-secondary/80 transition shadow-sm border border-secondary-foreground/10"
                                        >
                                            {testimonial.active ? (
                                                <>
                                                    <Eye className="w-3.5 h-3.5" />
                                                    Ocultar
                                                </>
                                            ) : (
                                                <>
                                                    <EyeOff className="w-3.5 h-3.5" />
                                                    Mostrar
                                                </>
                                            )}
                                        </button>
                                        <button
                                            onClick={() => deleteTestimonial(testimonial.id)}
                                            className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-6 py-2 bg-destructive text-destructive-foreground rounded-full text-xs font-medium hover:bg-destructive/90 transition shadow-sm"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                            Eliminar
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    ))}
                </div>

                {/* Pagination Info */}
                {totalPages > 1 && (
                    <div className="flex justify-center gap-2 pt-4 border-t border-slate-200 mt-4">
                        <button
                            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                            disabled={currentPage === 1}
                            className="px-4 py-2 bg-slate-200 text-slate-700 rounded-full hover:bg-slate-300 disabled:opacity-50 disabled:cursor-not-allowed transition"
                        >
                            ← Anterior
                        </button>
                        <span className="px-4 py-2 text-slate-700 font-semibold">
                            Página {currentPage} de {totalPages}
                        </span>
                        <button
                            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                            disabled={currentPage === totalPages}
                            className="px-4 py-2 bg-slate-200 text-slate-700 rounded-full hover:bg-slate-300 disabled:opacity-50 disabled:cursor-not-allowed transition"
                        >
                            Siguiente →
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
