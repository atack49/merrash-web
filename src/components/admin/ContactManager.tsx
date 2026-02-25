'use client';

import { useState, useEffect } from 'react';
import { Edit2, Trash2, Plus, X, CheckCircle, AlertCircle, Save, Loader } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ContactInfo {
    id: string;
    address: string;
    phones: string[];
    email: string;
    hours: {
        weekdays: string;
        saturday: string;
    };
}

interface ContactManagerProps {
    initialContact: ContactInfo;
}

interface Message {
    type: 'success' | 'error';
    text: string;
}

export function ContactManager({ initialContact }: ContactManagerProps) {
    // Fallback default contact info
    const defaultContact: ContactInfo = {
        id: 'default',
        address: '',
        phones: [],
        email: '',
        hours: { weekdays: '', saturday: '' },
    };
    const [contact, setContact] = useState<ContactInfo>(initialContact || defaultContact);
    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState<ContactInfo>(initialContact || defaultContact);
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState<Message | null>(null);
    const [newPhone, setNewPhone] = useState('');

    // Update editData when initialContact changes
    useEffect(() => {
        setEditData(initialContact || defaultContact);
    }, [initialContact]);

    // Mostrar mensaje por 3 segundos
    const showMessage = (type: 'success' | 'error', text: string) => {
        setMessage({ type, text });
        setTimeout(() => setMessage(null), 3000);
    };

    const startEditing = () => {
        setEditData({ ...contact });
        setIsEditing(true);
    };

    const handleAddPhone = () => {
        if (newPhone.trim()) {
            const updatedPhones = [...editData.phones, newPhone.trim()];
            setEditData({
                ...editData,
                phones: updatedPhones,
            });
            setNewPhone('');
        }
    };

    const handleRemovePhone = (index: number) => {
        const updatedPhones = editData.phones.filter((_, i) => i !== index);
        setEditData({
            ...editData,
            phones: updatedPhones,
        });
    };

    const saveChanges = async () => {
        if (!editData.phones || editData.phones.length === 0) {
            showMessage('error', 'Debes tener al menos un teléfono');
            return;
        }

        setIsLoading(true);
        try {
            const res = await fetch('/api/admin/contact', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    address: editData.address,
                    phones: editData.phones,
                    email: editData.email,
                    hours: editData.hours,
                }),
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || 'Error al guardar');
            }

            const updated = await res.json();
            setContact(updated);
            setIsEditing(false);
            setEditData(updated);
            setNewPhone('');
            showMessage('success', '✅ Cambios guardados exitosamente');
        } catch (error) {
            console.error('Error saving contact:', error);
            showMessage('error', '❌ ' + (error instanceof Error ? error.message : 'Error al guardar'));
        } finally {
            setIsLoading(false);
        }
    };

    const cancelEditing = () => {
        setIsEditing(false);
        setEditData({ ...contact });
        setNewPhone('');
    };

    return (
        <div className="space-y-6">
            {/* Alert Message */}
            {message && (
                <div
                    className={cn(
                        'flex items-center gap-3 p-4 rounded-xl backdrop-blur-sm border',
                        message.type === 'success'
                            ? 'bg-green-50/80 text-green-700 border-green-200'
                            : 'bg-red-50/80 text-red-700 border-red-200'
                    )}
                >
                    {message.type === 'success' ? (
                        <CheckCircle className="w-5 h-5 flex-shrink-0" />
                    ) : (
                        <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    )}
                    <span className="text-sm md:text-base lg:text-lg font-medium">{message.text}</span>
                </div>
            )}

            {!isEditing ? (
                // VIEW MODE - Professional Card Design
                <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="space-y-6 p-8">
                        {/* Address Card */}
                        <div className="bg-white rounded-xl p-6 border border-slate-100 hover:border-slate-200 transition-colors">
                            <div className="flex items-start gap-4">
                                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                                    <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Ubicación</p>
                                    <p className="text-slate-900 text-sm leading-relaxed">{contact.address}</p>
                                </div>
                            </div>
                        </div>

                        {/* Email Card */}
                        <div className="bg-white rounded-xl p-6 border border-slate-100 hover:border-slate-200 transition-colors">
                            <div className="flex items-start gap-4">
                                <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                    </svg>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Email</p>
                                    <a href={`mailto:${contact.email}`} className="text-primary hover:text-primary/80 font-medium transition-colors">
                                        {contact.email}
                                    </a>
                                </div>
                            </div>
                        </div>

                        {/* Phones Card */}
                        <div className="bg-white rounded-xl p-6 border border-slate-100 hover:border-slate-200 transition-colors">
                            <div className="flex items-start gap-4">
                                <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                    </svg>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Teléfonos</p>
                                    <div className="space-y-2">
                                        {contact.phones.map((phone, index) => (
                                            <a
                                                key={index}
                                                href={`tel:${phone}`}
                                                className="block text-slate-900 hover:text-primary font-medium text-sm transition-colors py-1"
                                            >
                                                {phone}
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Hours Card */}
                        <div className="bg-white rounded-xl p-6 border border-slate-100 hover:border-slate-200 transition-colors">
                            <div className="flex items-start gap-4">
                                <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                                    <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Horarios</p>
                                    <div className="space-y-2">
                                        <div>
                                            <p className="text-xs font-semibold text-slate-600 mb-1">Lunes a Viernes</p>
                                            <p className="text-slate-900 font-medium text-sm">{contact.hours.weekdays}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs font-semibold text-slate-600 mb-1">Sábado</p>
                                            <p className="text-slate-900 font-medium text-sm">{contact.hours.saturday}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Edit Button */}
                        <button
                            onClick={startEditing}
                            className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-primary to-primary/80 text-white font-semibold rounded-lg transition-all hover:shadow-lg hover:from-primary/90 hover:to-primary/70 disabled:opacity-50 mt-2"
                            disabled={isLoading}
                        >
                            <Edit2 className="w-5 h-5" />
                            Editar Información
                        </button>
                    </div>
                </div>
            ) : (
                // EDIT MODE - Professional Form Design
                <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-8 space-y-6">
                        {/* Form Header */}
                        <div className="mb-6">
                            <h3 className="text-lg font-bold text-slate-900">Editar Información de Contacto</h3>
                            <p className="text-sm text-slate-600 mt-1">Actualiza los datos para que aparezcan en tu sitio web</p>
                        </div>

                        {/* Address Field */}
                        <div className="bg-white rounded-xl p-6 border border-slate-100">
                            <label className="block text-sm md:text-base lg:text-lg font-semibold text-slate-900 mb-3 flex items-center gap-2">
                                <span className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                                    <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    </svg>
                                </span>
                                Ubicación
                            </label>
                            <textarea
                                value={editData.address || ''}
                                onChange={(e) => setEditData({ ...editData, address: e.target.value })}
                                rows={2}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none transition-all"
                            />
                        </div>

                        {/* Email Field */}
                        <div className="bg-white rounded-xl p-6 border border-slate-100">
                            <label className="block text-sm md:text-base lg:text-lg font-semibold text-slate-900 mb-3 flex items-center gap-2">
                                <span className="w-6 h-6 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8" />
                                    </svg>
                                </span>
                                Email de Contacto
                            </label>
                            <input
                                type="email"
                                value={editData.email || ''}
                                onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                            />
                        </div>

                        {/* Phones Field */}
                        <div className="bg-white rounded-xl p-6 border border-slate-100">
                            <label className="block text-sm md:text-base lg:text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                                <span className="w-6 h-6 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493" />
                                    </svg>
                                </span>
                                Teléfonos
                            </label>
                            <div className="space-y-3">
                                {(editData.phones || []).map((phone, index) => (
                                    <div key={index} className="flex items-center gap-3 bg-slate-50 p-3 rounded-lg">
                                        <input
                                            type="tel"
                                            value={phone}
                                            onChange={(e) => {
                                                const newPhones = [...(editData.phones || [])];
                                                newPhones[index] = e.target.value;
                                                setEditData({ ...editData, phones: newPhones });
                                            }}
                                            className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                                        />
                                        <button
                                            onClick={() => handleRemovePhone(index)}
                                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                            title="Eliminar teléfono"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </div>
                                ))}

                                {/* Add Phone Input */}
                                <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-lg">
                                    <input
                                        type="tel"
                                        value={newPhone}
                                        onChange={(e) => setNewPhone(e.target.value)}
                                        placeholder="Agregar nuevo teléfono"
                                        onKeyPress={(e) => e.key === 'Enter' && handleAddPhone()}
                                        className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-slate-400 transition-all"
                                    />
                                    <button
                                        onClick={handleAddPhone}
                                        className="p-2 bg-primary text-white hover:bg-primary/90 rounded-lg transition-colors"
                                        title="Agregar teléfono"
                                    >
                                        <Plus className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Hours Fields */}
                        <div className="bg-white rounded-xl p-6 border border-slate-100">
                            <label className="block text-sm md:text-base lg:text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                                <span className="w-6 h-6 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                                    <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3" />
                                    </svg>
                                </span>
                                Horarios
                            </label>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Lunes a Viernes</p>
                                    <input
                                        type="text"
                                        value={editData.hours?.weekdays || ''}
                                        onChange={(e) =>
                                            setEditData({
                                                ...editData,
                                                hours: {
                                                    ...(editData.hours || { weekdays: '', saturday: '' }),
                                                    weekdays: e.target.value,
                                                },
                                            })
                                        }
                                        placeholder="10:00 AM - 7:00 PM"
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                                    />
                                </div>
                                <div>
                                    <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Sábado</p>
                                    <input
                                        type="text"
                                        value={editData.hours?.saturday || ''}
                                        onChange={(e) =>
                                            setEditData({
                                                ...editData,
                                                hours: {
                                                    ...(editData.hours || { weekdays: '', saturday: '' }),
                                                    saturday: e.target.value,
                                                },
                                            })
                                        }
                                        placeholder="10:00 AM - 3:00 PM"
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-3 pt-6 border-t border-slate-200">
                            <button
                                onClick={saveChanges}
                                disabled={isLoading}
                                className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-primary to-primary/80 text-white font-semibold rounded-lg transition-all hover:shadow-lg hover:from-primary/90 hover:to-primary/70 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader className="w-5 h-5 animate-spin" />
                                        Guardando...
                                    </>
                                ) : (
                                    <>
                                        <Save className="w-5 h-5" />
                                        Guardar Cambios
                                    </>
                                )}
                            </button>
                            <button
                                onClick={cancelEditing}
                                disabled={isLoading}
                                className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 bg-slate-200 text-slate-900 font-semibold rounded-lg transition-all hover:bg-slate-300 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <X className="w-5 h-5" />
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Icon component for phones
function Phone({ className }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
        </svg>
    );
}
