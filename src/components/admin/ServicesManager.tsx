'use client';

import { useState } from 'react';
import { Edit2, Trash2, Eye, EyeOff, Plus, X, CheckCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Service {
    id: string;
    title: string;
    description: string;
    icon?: string;
    category: string;
    active: boolean;
    order?: number;
}

interface ServicesManagerProps {
    initialServices: Service[];
}

interface Message {
    type: 'success' | 'error';
    text: string;
}

export function ServicesManager({ initialServices }: ServicesManagerProps) {
    const [services, setServices] = useState<Service[]>(initialServices);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editData, setEditData] = useState<Partial<Service>>({});
    const [showAddForm, setShowAddForm] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<string>('Cuerpo');
    const [newService, setNewService] = useState({
        title: '',
        description: '',
        icon: '',
        category: 'Cuerpo',
    });
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState<Message | null>(null);

    const categories = ['Cuerpo', 'Mente', 'Espíritu'];

    // Mostrar mensaje por 3 segundos
    const showMessage = (type: 'success' | 'error', text: string) => {
        setMessage({ type, text });
        setTimeout(() => setMessage(null), 3000);
    };

    // Filtrar servicios por categoría
    const filteredServices = services.filter(s => s.category === selectedCategory);

    // Handle toggle active/inactive
    const toggleActive = async (id: string, currentActive: boolean) => {
        setIsLoading(true);
        try {
            const res = await fetch(`/api/admin/services/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ active: !currentActive }),
            });
            
            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || 'Error al actualizar');
            }

            const updated = await res.json();
            setServices(services.map(s =>
                s.id === id ? updated : s
            ));
            showMessage('success', `Servicio ${!currentActive ? 'mostrado' : 'ocultado'}`);
        } catch (error) {
            console.error('Error toggling service:', error);
            showMessage('error', error instanceof Error ? error.message : 'Error al actualizar');
        } finally {
            setIsLoading(false);
        }
    };

    // Handle delete
    const deleteService = async (id: string) => {
        if (!confirm('¿Estás seguro de que quieres eliminar este servicio?')) return;
        setIsLoading(true);
        try {
            const res = await fetch(`/api/admin/services/${id}`, {
                method: 'DELETE',
            });
            
            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || 'Error al eliminar');
            }

            setServices(services.filter(s => s.id !== id));
            showMessage('success', 'Servicio eliminado');
        } catch (error) {
            console.error('Error deleting service:', error);
            showMessage('error', error instanceof Error ? error.message : 'Error al eliminar');
        } finally {
            setIsLoading(false);
        }
    };

    // Handle save edit
    const saveEdit = async (id: string) => {
        const service = services.find(s => s.id === id);
        if (!service) return;

        // Solo enviar los campos que efectivamente han cambiado
        const updateData: any = {};
        if (editData.title !== undefined && editData.title !== '') updateData.title = editData.title;
        if (editData.description !== undefined && editData.description !== '') updateData.description = editData.description;
        if (editData.category !== undefined) updateData.category = editData.category;

        // Si no hay cambios, no hacer nada
        if (Object.keys(updateData).length === 0) {
            showMessage('error', 'No hay cambios para guardar');
            return;
        }

        setIsLoading(true);
        try {
            const res = await fetch(`/api/admin/services/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updateData),
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || 'Error al guardar');
            }

            const updated = await res.json();
            setServices(services.map(s => (s.id === id ? updated : s)));
            setEditingId(null);
            setEditData({});
            showMessage('success', '✓ Cambios guardados correctamente');
        } catch (error) {
            console.error('Error updating service:', error);
            showMessage('error', error instanceof Error ? error.message : 'Error al guardar');
        } finally {
            setIsLoading(false);
        }
    };

    // Handle add new
    const addService = async () => {
        if (!newService.title || !newService.description) {
            showMessage('error', 'Completa todos los campos');
            return;
        }
        
        setIsLoading(true);
        try {
            const res = await fetch('/api/admin/services', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...newService,
                    order: services.length + 1,
                }),
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || 'Error al agregar');
            }

            const created = await res.json();
            setServices([...services, created]);
            setShowAddForm(false);
            setNewService({ title: '', description: '', icon: '', category: 'Cuerpo' });
            showMessage('success', 'Servicio agregado');
        } catch (error) {
            console.error('Error adding service:', error);
            showMessage('error', error instanceof Error ? error.message : 'Error al agregar');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-8">
            {/* Notification Messages */}
            {message && (
                <div className={cn(
                    "fixed top-4 right-4 z-50 p-4 rounded-lg flex items-center gap-3 shadow-lg animate-in slide-in-from-top-4",
                    message.type === 'success'
                        ? 'bg-green-100 border border-green-300 text-green-800'
                        : 'bg-red-100 border border-red-300 text-red-800'
                )}>
                    {message.type === 'success' ? (
                        <CheckCircle className="w-5 h-5" />
                    ) : (
                        <AlertCircle className="w-5 h-5" />
                    )}
                    <span className="font-medium">{message.text}</span>
                </div>
            )}

            {/* Add Button */}
            <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-full hover:bg-primary/90 transition font-medium shadow-sm"
            >
                <Plus className="w-5 h-5" />
                Nuevo Servicio
            </button>

            {/* Add Form Modal */}
            {showAddForm && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 md:p-7 shadow-2xl space-y-5">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xl font-bold text-slate-900">Nuevo Servicio</h3>
                            <button
                                onClick={() => setShowAddForm(false)}
                                className="p-2 hover:bg-slate-100 rounded-full transition"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-slate-700">Título</label>
                                <input
                                    type="text"
                                    placeholder="Ej. Acupuntura terapéutica"
                                    value={newService.title}
                                    onChange={(e) => setNewService({ ...newService, title: e.target.value })}
                                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-slate-700">Descripción</label>
                                <textarea
                                    placeholder="Describe brevemente el servicio"
                                    value={newService.description}
                                    onChange={(e) => setNewService({ ...newService, description: e.target.value })}
                                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl h-28 resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-slate-700">Categoría</label>
                                <div className="flex flex-wrap justify-center gap-2 pt-1">
                                    {categories.map((category) => (
                                        <button
                                            key={category}
                                            type="button"
                                            onClick={() => setNewService({ ...newService, category })}
                                            className={cn(
                                                "px-5 py-2.5 text-sm font-medium rounded-full transition-colors whitespace-nowrap",
                                                newService.category === category
                                                    ? "bg-primary text-white"
                                                    : "text-foreground hover:bg-slate-100"
                                            )}
                                        >
                                            {category}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-2 pt-1">
                            <button
                                onClick={addService}
                                disabled={isLoading}
                                className="flex-1 px-4 py-2.5 bg-primary text-white rounded-full hover:bg-primary/90 disabled:opacity-50 font-medium transition"
                            >
                                Guardar
                            </button>
                            <button
                                onClick={() => setShowAddForm(false)}
                                className="flex-1 px-4 py-2.5 bg-slate-200 text-slate-800 rounded-full hover:bg-slate-300 font-medium transition"
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Categoria Buttons */}
            <div className="flex justify-center flex-wrap gap-2 md:gap-3 mb-6 md:mb-8">
                {categories.map(category => (
                    <button
                        key={category}
                        onClick={() => setSelectedCategory(category)}
                        className={cn(
                            "px-5 py-2.5 text-sm font-medium rounded-full transition-colors whitespace-nowrap",
                            selectedCategory === category
                                ? "bg-primary text-white"
                                : "text-foreground hover:bg-slate-100"
                        )}
                    >
                        {category}
                    </button>
                ))}
            </div>

            {/* Contador */}
            {filteredServices.length > 0 && (
                <p className="text-xs md:text-sm lg:text-base text-slate-600 text-center mb-4 md:mb-6">
                    Mostrando <span className="font-semibold">{filteredServices.length}</span> servicio{filteredServices.length !== 1 ? 's' : ''} en {selectedCategory}
                </p>
            )}

            {/* Services Grid */}
            {filteredServices.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
                    {filteredServices.map((service) => (
                        <div
                            key={service.id}
                            className={cn(
                                "p-4 rounded-2xl border border-border/50 transition-all",
                                editingId === service.id
                                    ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-300 shadow-lg'
                                    : service.active
                                        ? 'bg-secondary/10 hover:bg-secondary/30 hover:shadow-md'
                                        : 'bg-gray-100 opacity-70'
                            )}
                        >
                            {editingId === service.id ? (
                                // Edit Mode
                                <div className="space-y-3">
                                    {/* Header identifying what's being edited */}
                                    <div className="bg-blue-100 border border-blue-300 rounded-lg p-2 mb-3">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex-1">
                                                <p className="text-xs font-semibold text-blue-900">🔄 EDITANDO</p>
                                                <p className="text-xs text-blue-700 mt-0.5"><strong>ID:</strong> {service.id.slice(0, 6)}...</p>
                                            </div>
                                            <span className="text-lg">✏️</span>
                                        </div>
                                    </div>
                                    
                                    <input
                                        type="text"
                                        placeholder="Título"
                                        value={editData.title !== undefined ? editData.title : service.title}
                                        onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                                        className="w-full px-2 py-1 border border-slate-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                    <textarea
                                        placeholder="Descripción"
                                        value={editData.description !== undefined ? editData.description : service.description}
                                        onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                                        className="w-full px-2 py-1 border border-slate-300 rounded text-xs h-16 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                    <select
                                        value={editData.category !== undefined ? editData.category : service.category}
                                        onChange={(e) => setEditData({ ...editData, category: e.target.value })}
                                        className="w-full px-2 py-1 border border-slate-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        {categories.map(cat => (
                                            <option key={cat} value={cat}>{cat}</option>
                                        ))}
                                    </select>
                                    
                                    <div className="flex gap-1 pt-2 border-t border-blue-200">
                                        <button
                                            onClick={() => saveEdit(service.id)}
                                            disabled={isLoading}
                                            className="flex-1 px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700 disabled:opacity-50 font-medium transition"
                                        >
                                            ✓ Guardar
                                        </button>
                                        <button
                                            onClick={() => { setEditingId(null); setEditData({}); }}
                                            className="flex-1 px-2 py-1 bg-gray-400 text-white rounded text-xs hover:bg-gray-500 font-medium transition"
                                        >
                                            ✕ Cancelar
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                // View Mode
                                <>
                                    <h3 className="font-semibold text-sm mb-1 line-clamp-2">{service.title}</h3>
                                    <p className="text-xs md:text-sm lg:text-base text-slate-600 mb-3 line-clamp-2">{service.description}</p>
                                    
                                    <div className="flex flex-wrap gap-1 mb-3">
                                        <span className="text-xs md:text-sm lg:text-base bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                                            {service.category}
                                        </span>
                                        <span className={`text-xs md:text-sm lg:text-base px-2 py-0.5 rounded-full ${service.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                            {service.active ? '✓ Visible' : '✗ Oculto'}
                                        </span>
                                    </div>
                                    
                                    <div className="flex gap-1">
                                        <button
                                            onClick={() => { setEditingId(service.id); setEditData({}); }}
                                            className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-blue-100 text-blue-700 rounded text-xs md:text-sm lg:text-base hover:bg-blue-200 transition font-medium"
                                        >
                                            <Edit2 className="w-3 h-3" />
                                            Editar
                                        </button>
                                        <button
                                            onClick={() => toggleActive(service.id, service.active)}
                                            className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-yellow-100 text-yellow-700 rounded text-xs md:text-sm lg:text-base hover:bg-yellow-200 transition font-medium"
                                        >
                                            {service.active ? (
                                                <>
                                                    <Eye className="w-3 h-3" />
                                                    Ocultar
                                                </>
                                            ) : (
                                                <>
                                                    <EyeOff className="w-3 h-3" />
                                                    Mostrar
                                                </>
                                            )}
                                        </button>
                                        <button
                                            onClick={() => deleteService(service.id)}
                                            className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-red-100 text-red-700 rounded text-xs md:text-sm lg:text-base hover:bg-red-200 transition font-medium"
                                        >
                                            <Trash2 className="w-3 h-3" />
                                            Eliminar
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-12">
                    <p className="text-slate-600 text-sm">No hay servicios en la categoría {selectedCategory}</p>
                </div>
            )}
        </div>
    );
}

