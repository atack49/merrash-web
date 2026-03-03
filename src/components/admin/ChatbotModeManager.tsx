'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Loader2, Sparkles } from 'lucide-react';

type ChatbotMode = 'auto' | 'local' | 'public' | 'team';

type MessageState = {
    type: 'success' | 'error';
    text: string;
} | null;

export function ChatbotModeManager() {
    const [mode, setMode] = useState<ChatbotMode>('auto');
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState<MessageState>(null);

    useEffect(() => {
        const loadSettings = async () => {
            setIsLoading(true);
            try {
                const response = await fetch('/api/admin/chatbot-settings', { cache: 'no-store' });
                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data?.error || 'No se pudo cargar la configuración');
                }

                setMode((data.mode || 'auto') as ChatbotMode);
            } catch (error) {
                setMessage({
                    type: 'error',
                    text: error instanceof Error ? error.message : 'Error cargando configuración',
                });
            } finally {
                setIsLoading(false);
            }
        };

        loadSettings();
    }, []);

    const handleSave = async () => {
        setIsSaving(true);
        setMessage(null);

        try {
            const response = await fetch('/api/admin/chatbot-settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mode }),
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data?.error || 'No se pudo guardar la configuración');
            }

            setMode((data.mode || 'auto') as ChatbotMode);
            setMessage({ type: 'success', text: 'Modo de IA guardado correctamente.' });
        } catch (error) {
            setMessage({
                type: 'error',
                text: error instanceof Error ? error.message : 'Error guardando configuración',
            });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 md:p-8">
                <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                        <Sparkles className="w-5 h-5" />
                    </div>
                    <div className="space-y-2">
                        <h3 className="text-lg font-bold text-slate-900">Modelo de IA para el Chat Bot</h3>
                        <p className="text-sm text-slate-600">
                            Elige cómo responderá el chatbot. Esta configuración no usa base de datos; se guarda en archivo local del proyecto.
                        </p>
                    </div>
                </div>
            </div>

            {message && (
                <div className={`rounded-xl border p-4 flex items-center gap-2 ${message.type === 'success' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                    {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                    <p className="text-sm font-medium">{message.text}</p>
                </div>
            )}

            <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                    <button
                        type="button"
                        onClick={() => setMode('auto')}
                        disabled={isLoading || isSaving}
                        className={`px-4 py-2.5 rounded-full text-sm font-medium transition-colors ${mode === 'auto' ? 'bg-primary text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                    >
                        Auto (recomendado)
                    </button>
                    <button
                        type="button"
                        onClick={() => setMode('local')}
                        disabled={isLoading || isSaving}
                        className={`px-4 py-2.5 rounded-full text-sm font-medium transition-colors ${mode === 'local' ? 'bg-primary text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                    >
                        IA local
                    </button>
                    <button
                        type="button"
                        onClick={() => setMode('team')}
                        disabled={isLoading || isSaving}
                        className={`px-4 py-2.5 rounded-full text-sm font-medium transition-colors ${mode === 'team' ? 'bg-primary text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                    >
                        Team IA (3 pasos)
                    </button>
                    <button
                        type="button"
                        onClick={() => setMode('public')}
                        disabled={isLoading || isSaving}
                        className={`px-4 py-2.5 rounded-full text-sm font-medium transition-colors ${mode === 'public' ? 'bg-primary text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                    >
                        IA pública gratis
                    </button>
                </div>

                <p className="text-xs text-slate-500">
                    Auto: intenta Team IA y si falla usa IA pública y luego local. Team IA: borrador → auditoría → respuesta final. IA pública gratis: una sola pasada. IA local: motor interno del proyecto.
                </p>

                <div className="pt-2">
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={isLoading || isSaving}
                        className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-primary text-white font-semibold hover:bg-primary/90 disabled:opacity-60 transition-colors"
                    >
                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                        Guardar modo de IA
                    </button>
                </div>
            </div>
        </div>
    );
}
