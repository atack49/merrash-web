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
                <div className="bg-blue-50 p-6 rounded-lg border border-blue-200 space-y-4">
                    <h3 className="font-semibold text-lg">Nuevo Testimonio</h3>
                    <div className="space-y-4">
                        <input
                            type="text"
                            placeholder="Nombre"
                            value={newTestimonial.name}
                            onChange={(e) => setNewTestimonial({ ...newTestimonial, name: e.target.value })}
                            className="w-full px-4 py-2 border rounded-lg"
                        />
                        <input
                            type="text"
                            placeholder="Servicio (ej: Acupuntura)"
                            value={newTestimonial.service}
                            onChange={(e) => setNewTestimonial({ ...newTestimonial, service: e.target.value })}
                            className="w-full px-4 py-2 border rounded-lg"
                        />
                        <textarea
                            placeholder="Testimonio"
                            value={newTestimonial.text}
                            onChange={(e) => setNewTestimonial({ ...newTestimonial, text: e.target.value })}
                            className="w-full px-4 py-2 border rounded-lg h-24 resize-none"
                        />
                        <div>
                            <label className="text-sm font-medium block mb-2">Calificación</label>
                            <div className="flex gap-2">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <button
                                        key={star}
                                        onClick={() => setNewTestimonial({ ...newTestimonial, rating: star })}
                                        className="transition-all hover:scale-110"
                                    >
                                        <Star
                                            className={cn(
                                                'w-6 h-6 transition-colors',
                                                star <= newTestimonial.rating
                                                    ? 'fill-yellow-400 text-yellow-400'
                                                    : 'text-slate-300'
                                            )}
                                        />
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={addTestimonial}
                                disabled={isLoading}
                                className="px-6 py-2 bg-green-600 text-white rounded-full hover:bg-green-700 disabled:opacity-50 font-medium transition-all"
                            >
                                Guardar
                            </button>
                            <button
                                onClick={() => setShowAddForm(false)}
                                className="px-6 py-2 bg-gray-300 text-gray-900 rounded-full hover:bg-gray-400 font-medium transition-all"
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
                            className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 disabled:opacity-50 disabled:cursor-not-allowed transition"
                        >
                            ← Anterior
                        </button>
                        <div className="flex items-center gap-2">
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                <button
                                    key={page}
                                    onClick={() => setCurrentPage(page)}
                                    className={`px-3 py-2 rounded-lg transition ${
                                        currentPage === page
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
                            className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 disabled:opacity-50 disabled:cursor-not-allowed transition"
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
                            "p-6 rounded-lg border-2 transition",
                            editingId === testimonial.id
                                ? 'border-blue-500 bg-blue-50'
                                : testimonial.active
                                    ? 'border-slate-200 bg-white hover:border-primary/50'
                                    : 'border-slate-200 bg-gray-100 opacity-60'
                        )}
                    >
                        {editingId === testimonial.id ? (
                            // Edit Mode
                            <div className="space-y-4">
                                <input
                                    type="text"
                                    placeholder="Nombre"
                                    value={editData.name || testimonial.name}
                                    onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                                    className="w-full px-3 py-2 border rounded text-sm"
                                />
                                <input
                                    type="text"
                                    placeholder="Servicio"
                                    value={editData.service || testimonial.service}
                                    onChange={(e) => setEditData({ ...editData, service: e.target.value })}
                                    className="w-full px-3 py-2 border rounded text-sm"
                                />
                                <textarea
                                    placeholder="Testimonio"
                                    value={editData.text || testimonial.text}
                                    onChange={(e) => setEditData({ ...editData, text: e.target.value })}
                                    className="w-full px-3 py-2 border rounded text-sm h-20 resize-none"
                                />
                                <div>
                                    <label className="text-xs font-medium block mb-2">Calificación</label>
                                    <div className="flex gap-2">
                                        {[1, 2, 3, 4, 5].map((star) => (
                                            <button
                                                key={star}
                                                onClick={() => setEditData({ ...editData, rating: star })}
                                                className="transition-all hover:scale-110"
                                            >
                                                <Star
                                                    className={cn(
                                                        'w-5 h-5 transition-colors',
                                                        star <= (editData.rating || testimonial.rating)
                                                            ? 'fill-yellow-400 text-yellow-400'
                                                            : 'text-slate-300'
                                                    )}
                                                />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => saveEdit(testimonial.id)}
                                        disabled={isLoading}
                                        className="flex-1 px-3 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700 disabled:opacity-50"
                                    >
                                        Guardar
                                    </button>
                                    <button
                                        onClick={() => { setEditingId(null); setEditData({}); }}
                                        className="flex-1 px-3 py-2 bg-gray-400 text-white rounded text-sm"
                                    >
                                        Cancelar
                                    </button>
                                </div>
                            </div>
                        ) : (
                            // View Mode
                            <>
                                <div className="flex items-start justify-between mb-4">
                                    <div>
                                        <h3 className="font-bold text-lg">{testimonial.name}</h3>
                                        <p className="text-sm text-primary font-medium">{testimonial.service}</p>
                                    </div>
                                    <span className={`text-xs px-2 py-1 rounded ${testimonial.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                        {testimonial.active ? 'Visible' : 'Oculto'}
                                    </span>
                                </div>
                                <p className="text-slate-600 mb-4 italic">"{testimonial.text}"</p>
                                <div className="flex gap-1 mb-4">
                                    {[...Array(testimonial.rating)].map((_, i) => (
                                        <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                                    ))}
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => { setEditingId(testimonial.id); setEditData(testimonial); }}
                                        className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200 transition"
                                    >
                                        <Edit2 className="w-4 h-4" />
                                        Editar
                                    </button>
                                    <button
                                        onClick={() => toggleActive(testimonial.id, testimonial.active)}
                                        className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-yellow-100 text-yellow-700 rounded text-sm hover:bg-yellow-200 transition"
                                    >
                                        {testimonial.active ? (
                                            <>
                                                <Eye className="w-4 h-4" />
                                                Ocultar
                                            </>
                                        ) : (
                                            <>
                                                <EyeOff className="w-4 h-4" />
                                                Mostrar
                                            </>
                                        )}
                                    </button>
                                    <button
                                        onClick={() => deleteTestimonial(testimonial.id)}
                                        className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200 transition"
                                    >
                                        <Trash2 className="w-4 h-4" />
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
                            className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 disabled:opacity-50 disabled:cursor-not-allowed transition"
                        >
                            ← Anterior
                        </button>
                        <span className="px-4 py-2 text-slate-700 font-semibold">
                            Página {currentPage} de {totalPages}
                        </span>
                        <button
                            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                            disabled={currentPage === totalPages}
                            className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 disabled:opacity-50 disabled:cursor-not-allowed transition"
                        >
                            Siguiente →
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
