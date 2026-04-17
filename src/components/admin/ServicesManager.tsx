'use client';

import { useState } from 'react';
import { Edit2, Trash2, Eye, EyeOff, Plus, X, CheckCircle, AlertCircle, Brain, HeartPulse, Sparkles, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Modal } from '@/components/ui/Modal';
import { uploadServiceImageToCloudinary } from '@/lib/images/cloudinaryUpload';

interface Service {
    id: string;
    title: string;
    description: string;
    icon?: string | null;
    category: string;
    active: boolean;
    order?: number;
}

const categoryVisuals: Record<string, { iconBg: string; icon: typeof Brain }> = {
    Cuerpo: { iconBg: '#3CB8A8', icon: HeartPulse },
    Mente: { iconBg: '#5B8BD0', icon: Brain },
    Espíritu: { iconBg: '#7FBFA6', icon: Sparkles },
};

const sharedGradient = 'linear-gradient(135deg, #43C6B5 0%, #8FD9D0 52%, #C2F0E9 100%)';

const isImageSource = (value?: string | null) => {
    if (!value) return false;
    return value.startsWith('data:image/') || value.startsWith('http://') || value.startsWith('https://') || value.startsWith('/');
};

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
        if (editData.icon !== undefined) updateData.icon = editData.icon;
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

    const handleImageSelection = async (file: File, mode: 'new' | 'edit') => {
        setIsLoading(true);
        try {
            const imageUrl = await uploadServiceImageToCloudinary(file);
            if (mode === 'new') {
                setNewService((prev) => ({ ...prev, icon: imageUrl }));
            } else {
                setEditData((prev) => ({ ...prev, icon: imageUrl }));
            }
            showMessage('success', 'Imagen cargada y optimizada correctamente');
        } catch (error) {
            console.error('Error uploading image:', error);
            showMessage('error', error instanceof Error ? error.message : 'No se pudo subir la imagen');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-8">
            {/* Notification Messages */}
            {message && (
                <div className={cn(
                    "fixed top-4 right-4 z-50 p-4 rounded-lg flex items-center gap-3 shadow-lg animate-in slide-in-from-top-4 font-medium border",
                    message.type === 'success'
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                        : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
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
            <Modal
                isOpen={showAddForm}
                onClose={() => setShowAddForm(false)}
                title="Nuevo Servicio"
                maxWidthClassName="max-w-md"
            >
                <div className="space-y-4">
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-muted-foreground">Título</label>
                        <input
                            type="text"
                            placeholder="Ej. Acupuntura terapéutica"
                            value={newService.title}
                            onChange={(e) => setNewService({ ...newService, title: e.target.value })}
                            className="w-full px-4 py-2.5 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-muted-foreground">Descripción</label>
                        <textarea
                            placeholder="Describe brevemente el servicio"
                            value={newService.description}
                            onChange={(e) => setNewService({ ...newService, description: e.target.value })}
                            className="w-full px-4 py-2.5 border border-border rounded-xl h-28 resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-muted-foreground">Imagen del servicio</label>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                await handleImageSelection(file, 'new');
                            }}
                            className="w-full px-3 py-2 border border-border rounded-xl text-sm file:mr-3 file:px-3 file:py-1.5 file:border-0 file:rounded-lg file:bg-primary/10 file:text-primary"
                        />
                        {isImageSource(newService.icon) && (
                            <div
                                className="h-24 rounded-xl border border-border bg-cover bg-center"
                                style={{ backgroundImage: `url(${newService.icon})` }}
                            />
                        )}
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-muted-foreground">Categoría</label>
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
                                            : "text-foreground hover:bg-muted"
                                    )}
                                >
                                    {category}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="flex gap-2 pt-4 border-t border-border mt-4">
                    <button
                        onClick={addService}
                        disabled={isLoading}
                        className="flex-1 px-4 py-2.5 bg-primary text-white rounded-full hover:bg-primary/90 disabled:opacity-50 font-medium transition"
                    >
                        Guardar
                    </button>
                    <button
                        onClick={() => setShowAddForm(false)}
                        className="flex-1 px-4 py-2.5 bg-secondary text-secondary-foreground font-medium rounded-full transition-all hover:bg-secondary/80 border border-secondary-foreground/10"
                    >
                        Cancelar
                    </button>
                </div>
            </Modal>

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
                                : "text-foreground hover:bg-muted"
                        )}
                    >
                        {category}
                    </button>
                ))}
            </div>

            {/* Contador */}
            {filteredServices.length > 0 && (
                <p className="text-xs md:text-sm lg:text-base text-muted-foreground text-center mb-4 md:mb-6">
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
                                "p-4 rounded-2xl border border-border/50 transition-all bg-gradient-to-br",
                                service.active
                                    ? 'from-secondary/5 to-secondary/10 hover:from-secondary/10 hover:to-secondary/20 hover:shadow-md'
                                    : 'from-gray-50 to-gray-100 opacity-70'
                            )}
                        >
                                    <div className="relative -m-4 mb-3 min-h-[190px] rounded-2xl overflow-hidden border border-border/70">
                                        {(() => {
                                            const visual = categoryVisuals[service.category] || categoryVisuals.Cuerpo;
                                            const ServiceIcon = visual.icon;
                                            return (
                                                <>
                                        <div
                                            className="absolute inset-0 bg-service-card"
                                        />

                                        {!isImageSource(service.icon) && (
                                            <div
                                                className="absolute inset-0 service-card-shapes"
                                                style={{
                                                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 600' preserveAspectRatio='xMidYMid slice'%3E%3Cpath fill='%2343C6B5' fill-opacity='0.15' d='M0 0 L0 250 Q 200 350 450 150 T 800 50 L 800 0 Z' /%3E%3Cpath fill='%238FD9D0' fill-opacity='0.25' d='M0 0 L0 100 Q 250 200 500 50 T 800 200 L 800 0 Z' /%3E%3Cpath fill='%231DB4A1' fill-opacity='0.1' d='M800 600 L800 350 Q 550 200 300 450 T 0 500 L 0 600 Z' /%3E%3C/svg%3E")`,
                                                    backgroundSize: 'cover',
                                                }}
                                            />
                                        )}

                                        {isImageSource(service.icon) && (
                                            <>
                                                <div
                                                    className="absolute inset-0 bg-cover bg-no-repeat bg-right-bottom scale-[1.04]"
                                                    style={{ backgroundImage: `url(${service.icon})` }}
                                                />
                                                <div className="absolute inset-0 bg-gradient-to-t from-card/95 via-card/80 to-transparent" />
                                            </>
                                        )}

                                        <div className="absolute inset-0 service-card-highlight" />

                                        <div className="relative z-10 h-full p-4 flex flex-col justify-between">
                                            <div
                                                className="h-9 w-9 text-primary rounded-full bg-card/70 shadow-sm backdrop-blur-md flex items-center justify-center border border-white"
                                            >
                                                <ServiceIcon className="w-4.5 h-4.5 text-primary" />
                                            </div>

                                            <div>
                                                <h3
                                                    className="font-bold text-foreground text-base mb-1 line-clamp-2"
                                                >
                                                    {service.title}
                                                </h3>
                                                <p
                                                    className="text-xs font-medium text-muted-foreground mb-2 line-clamp-2 max-w-[85%]"
                                                >
                                                    {service.description}
                                                </p>
                                                <div className="flex flex-wrap gap-1">
                                                    <span className="text-[11px] bg-card text-primary px-2 py-0.5 rounded-full border border-border shadow-sm font-medium">
                                                        {service.category}
                                                    </span>
                                                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium border shadow-sm ${service.active ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'}`}>
                                                        {service.active ? 'Visible' : 'Oculto'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                                </>
                                            );
                                        })()}
                                    </div>

                                    <div className="flex flex-wrap gap-2 mt-4">
                                        <button
                                            onClick={() => { setEditingId(service.id); setEditData({}); }}
                                            className="flex-1 min-w-[30%] flex items-center justify-center gap-1.5 px-2 py-2 bg-primary text-primary-foreground rounded-full text-xs font-medium hover:bg-primary/90 transition shadow-sm"
                                        >
                                            <Edit2 className="w-3.5 h-3.5" />
                                            Editar
                                        </button>
                                        <button
                                            onClick={() => toggleActive(service.id, service.active)}
                                            className="flex-1 min-w-[30%] flex items-center justify-center gap-1.5 px-2 py-2 bg-secondary text-secondary-foreground rounded-full text-xs font-medium hover:bg-secondary/80 transition shadow-sm border border-secondary-foreground/10"
                                        >
                                            {service.active ? (
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
                                            onClick={() => deleteService(service.id)}
                                            className="flex-1 min-w-[30%] flex items-center justify-center gap-1.5 px-2 py-2 bg-destructive text-destructive-foreground rounded-full text-xs font-medium hover:bg-destructive/90 transition shadow-sm"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                            Eliminar
                                        </button>
                                    </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-12">
                    <p className="text-muted-foreground text-sm">No hay servicios en la categoría {selectedCategory}</p>
                </div>
            )}

            <Modal
                isOpen={!!editingId}
                onClose={() => { setEditingId(null); setEditData({}); }}
                title="Editar servicio"
                description="Modifica los detalles del servicio seleccionado."
                maxWidthClassName="max-w-md"
            >
                {editingId && (() => {
                    const service = services.find(s => s.id === editingId);
                    if (!service) return null;
                    return (
                        <div className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-muted-foreground">Título</label>
                                <input
                                    type="text"
                                    placeholder="Título"
                                    value={editData.title !== undefined ? editData.title : service.title}
                                    onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                                    className="w-full px-4 py-2.5 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-muted-foreground">Descripción</label>
                                <textarea
                                    placeholder="Descripción"
                                    value={editData.description !== undefined ? editData.description : service.description}
                                    onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                                    className="w-full px-4 py-2.5 border border-border rounded-xl h-28 resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-muted-foreground">Imagen</label>
                                <input
                                    id={`edit-image-${service.id}`}
                                    type="file"
                                    accept="image/*"
                                    onChange={async (e) => {
                                        const file = e.target.files?.[0];
                                        if (!file) return;
                                        await handleImageSelection(file, 'edit');
                                    }}
                                    className="hidden"
                                />
                                <div className="flex gap-2 items-center">
                                    <div className="flex-1">
                                        {(() => {
                                            const hasEditedIcon = Object.prototype.hasOwnProperty.call(editData, 'icon');
                                            const currentImage = hasEditedIcon
                                                ? (editData.icon as string | null | undefined)
                                                : service.icon;
                                            return isImageSource(currentImage) ? (
                                            <div
                                                className="h-24 rounded-xl border border-border bg-cover bg-center"
                                                style={{ backgroundImage: `url(${currentImage})` }}
                                            />
                                            ) : (
                                            <div className="h-24 rounded-xl border border-dashed border-border bg-card flex items-center justify-center text-[11px] text-muted-foreground">
                                                Sin imagen
                                            </div>
                                            );
                                        })()}
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <label
                                            htmlFor={`edit-image-${service.id}`}
                                            className="h-10 w-10 rounded-full bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 flex items-center justify-center cursor-pointer transition"
                                            title="Cambiar imagen"
                                        >
                                            <Pencil className="w-4 h-4" />
                                        </label>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const shouldDelete = window.confirm('¿Seguro que deseas borrar la imagen de este servicio?');
                                                if (!shouldDelete) return;
                                                setEditData({ ...editData, icon: null });
                                            }}
                                            className="h-10 w-10 rounded-full bg-red-100 text-red-700 hover:bg-red-200 border border-red-200 flex items-center justify-center transition"
                                            title="Borrar imagen"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-muted-foreground">Categoría</label>
                                <div className="flex flex-wrap justify-center gap-2 pt-1">
                                    {categories.map((category) => {
                                        const selected = (editData.category !== undefined ? editData.category : service.category) === category;
                                        return (
                                            <button
                                                key={category}
                                                type="button"
                                                onClick={() => setEditData({ ...editData, category })}
                                                className={cn(
                                                    "px-4 py-2 text-sm font-medium rounded-full transition-colors whitespace-nowrap",
                                                    selected
                                                        ? "bg-primary text-white"
                                                        : "text-foreground hover:bg-muted"
                                                )}
                                            >
                                                {category}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                            <div className="flex gap-2 pt-4 border-t border-border mt-4">
                                <button
                                    onClick={() => saveEdit(service.id)}
                                    disabled={isLoading}
                                    className="flex-1 px-4 py-2.5 bg-primary text-white rounded-full font-medium hover:bg-primary/90 disabled:opacity-50 transition shadow-sm"
                                >
                                    Guardar Cambios
                                </button>
                                <button
                                    onClick={() => { setEditingId(null); setEditData({}); }}
                                    className="flex-1 px-4 py-2.5 bg-secondary text-secondary-foreground font-medium rounded-full transition-all hover:bg-secondary/80 border border-secondary-foreground/10"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    );
                })()}
            </Modal>
        </div>
    );
}

