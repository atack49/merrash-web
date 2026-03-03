'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { CHATBOT_OPEN_EVENT } from '@/lib/chatbot/widgetEvents';

type ChatAction = {
    id: string;
    label: string;
    value: string;
    userText?: string;
};

type Message = {
    id: string;
    role: 'user' | 'bot';
    text: string;
    actions?: ChatAction[];
};

const renderFormattedMessageText = (text: string) => {
    const lines = text.split('\n');

    const renderInline = (line: string, lineKey: string) => {
        const segments = line.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
        return segments.map((segment, segmentIndex) => {
            const isBold = /^\*\*[^*]+\*\*$/.test(segment);
            if (isBold) {
                return (
                    <strong key={`${lineKey}-s-${segmentIndex}`} className="font-semibold text-slate-900">
                        {segment.slice(2, -2)}
                    </strong>
                );
            }
            return <span key={`${lineKey}-s-${segmentIndex}`}>{segment}</span>;
        });
    };

    return (
        <div className="space-y-1.5 text-[14px] leading-7 text-slate-800">
            {lines.map((rawLine, index) => {
                const line = rawLine.trimEnd();
                const lineKey = `l-${index}`;

                if (!line.trim()) {
                    return <div key={lineKey} className="h-1" />;
                }

                const bulletMatch = line.match(/^[-*]\s+(.+)/);
                if (bulletMatch) {
                    return (
                        <div key={lineKey} className="flex items-start gap-2.5">
                            <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 rounded-full bg-primary/70" />
                            <span className="flex-1">{renderInline(bulletMatch[1], lineKey)}</span>
                        </div>
                    );
                }

                return <div key={lineKey}>{renderInline(line, lineKey)}</div>;
            })}
        </div>
    );
};

export function ChatbotWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [input, setInput] = useState('');
    const [whatsappUrl, setWhatsappUrl] = useState<string>('');
    const [calendarMonth, setCalendarMonth] = useState(() => new Date().getMonth());
    const [calendarYear, setCalendarYear] = useState(() => new Date().getFullYear());
    const [conversationId] = useState(() => `chat-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`);
    const messagesViewportRef = useRef<HTMLDivElement | null>(null);
    const inputRef = useRef<HTMLTextAreaElement | null>(null);
    const [messages, setMessages] = useState<Message[]>([
        {
            id: 'welcome',
            role: 'bot',
            text: 'Hola 👋 Soy el asistente de Merrash. Si quieres, te ayudo a reservar en menos de un minuto.',
        },
    ]);

    const latestBotMessage = useMemo(() => {
        for (let i = messages.length - 1; i >= 0; i -= 1) {
            if (messages[i].role === 'bot') {
                return messages[i];
            }
        }
        return null;
    }, [messages]);

    const dateActions = useMemo(
        () => (latestBotMessage?.actions || []).filter((action) => action.id.startsWith('date-')),
        [latestBotMessage]
    );

    const timeActions = useMemo(
        () => (latestBotMessage?.actions || []).filter((action) => action.id.startsWith('time-')),
        [latestBotMessage]
    );

    const showCalendar = useMemo(() => {
        if (!latestBotMessage) return false;
        if (dateActions.length > 0) return true;
        const normalized = latestBotMessage.text.toLowerCase();
        const asksForDate =
            normalized.includes('que fecha') ||
            normalized.includes('qué fecha') ||
            normalized.includes('selecciona una fecha') ||
            normalized.includes('elige otra fecha') ||
            normalized.includes('dame otra fecha') ||
            normalized.includes('puedes elegirla en el calendario') ||
            normalized.includes('calendario');

        const isConfirmationSummary =
            normalized.includes('te resumo tu cita') ||
            normalized.includes('si todo está bien') ||
            normalized.includes('si todo esta bien') ||
            normalized.includes('confirmar cita') ||
            normalized.includes('\nfecha:');

        return asksForDate && !isConfirmationSummary;
    }, [latestBotMessage, dateActions]);

    const showTimePicker = timeActions.length > 0;

    const yearOptions = useMemo(() => {
        const start = new Date().getFullYear();
        return Array.from({ length: 4 }, (_, i) => start + i);
    }, []);

    const calendarDays = useMemo(() => {
        const firstDay = new Date(calendarYear, calendarMonth, 1);
        const lastDay = new Date(calendarYear, calendarMonth + 1, 0);
        const leadingEmpty = firstDay.getDay();
        const days: Array<{ type: 'empty' } | { type: 'day'; date: Date; iso: string; isPast: boolean }> = [];

        for (let i = 0; i < leadingEmpty; i += 1) {
            days.push({ type: 'empty' });
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        for (let day = 1; day <= lastDay.getDate(); day += 1) {
            const date = new Date(calendarYear, calendarMonth, day);
            const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
            const compare = new Date(date);
            compare.setHours(0, 0, 0, 0);
            days.push({ type: 'day', date, iso, isPast: compare < today });
        }

        return days;
    }, [calendarMonth, calendarYear]);

    useEffect(() => {
        const viewport = messagesViewportRef.current;
        if (!viewport) return;

        viewport.scrollTo({
            top: viewport.scrollHeight,
            behavior: 'smooth',
        });
    }, [messages, isLoading, showCalendar]);

    useEffect(() => {
        const handleOpenChatbot = () => {
            setIsOpen(true);
        };

        window.addEventListener(CHATBOT_OPEN_EVENT, handleOpenChatbot);
        return () => window.removeEventListener(CHATBOT_OPEN_EVENT, handleOpenChatbot);
    }, []);

    const handleInputChange = (value: string) => {
        setInput(value);

        const element = inputRef.current;
        if (!element) return;

        element.style.height = 'auto';
        const lineHeight = 22;
        const maxHeight = lineHeight * 3;
        element.style.height = `${Math.min(element.scrollHeight, maxHeight)}px`;
    };

    const sendMessage = async (rawText: string, displayText?: string) => {
        const text = rawText.trim();
        if (!text || isLoading) {
            return;
        }

        const userMessage: Message = {
            id: `${Date.now()}-user`,
            role: 'user',
            text: displayText || text,
        };

        const historyPayload = [...messages, userMessage].slice(-400).map((item) => ({
            role: item.role,
            text: item.text,
        }));

        setMessages((prev) => [...prev, userMessage]);
        setInput('');
        if (inputRef.current) {
            inputRef.current.style.height = 'auto';
        }
        setIsLoading(true);

        try {
            const response = await fetch('/api/chatbot', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ message: text, history: historyPayload, conversationId }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data?.error || 'No se pudo obtener respuesta');
            }

            const botMessage: Message = {
                id: `${Date.now()}-bot`,
                role: 'bot',
                text: data.reply || 'Por ahora no tengo respuesta, intenta nuevamente.',
                actions: Array.isArray(data.actions) ? data.actions : undefined,
            };

            setMessages((prev) => [...prev, botMessage]);
            setWhatsappUrl(data.whatsappUrl || '');
        } catch (error) {
            const errorMessage: Message = {
                id: `${Date.now()}-error`,
                role: 'bot',
                text:
                    error instanceof Error
                        ? error.message
                        : 'Hubo un problema al responder. Intenta de nuevo en unos segundos.',
            };

            setMessages((prev) => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSend = async () => {
        await sendMessage(input);
    };

    const sendCalendarDate = async (isoDate: string) => {
        const parsed = new Date(`${isoDate}T00:00:00`);
        const label = parsed.toLocaleDateString('es-MX', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
        });
        await sendMessage(isoDate, `📅 ${label}`);
    };

    const formatTimeLabel = (value: string) => {
        const match = value.match(/^(\d{1,2}):(\d{2})$/);
        if (!match) return value;

        const h24 = Number(match[1]);
        const minutes = match[2];
        const suffix = h24 >= 12 ? 'PM' : 'AM';
        const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
        return `${h12}:${minutes} ${suffix}`;
    };

    return (
        <>
            <button
                type="button"
                onClick={() => setIsOpen((prev) => !prev)}
                className="fixed bottom-5 right-5 z-50 rounded-full bg-primary text-white px-5 py-3 shadow-lg hover:bg-primary/90 transition-colors font-medium"
            >
                {isOpen ? 'Cerrar chat' : 'Chat'}
            </button>

            {isOpen && (
                <div className="fixed bottom-20 right-5 z-50 w-[92vw] max-w-sm bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
                        <p className="font-semibold text-slate-900">Asistente Merrash</p>
                        <p className="text-xs text-slate-500">Conexión rápida a WhatsApp</p>
                    </div>

                    <div ref={messagesViewportRef} className="h-80 overflow-y-auto p-3 space-y-2 bg-white">
                        {messages.map((message) => (
                            <div
                                key={message.id}
                                className={message.role === 'user' ? 'flex justify-end' : 'flex justify-start'}
                            >
                                <div
                                    className={
                                        message.role === 'user'
                                            ? 'max-w-[85%] px-3 py-2 rounded-2xl bg-primary/10 text-slate-900 text-sm'
                                            : 'max-w-[85%] px-3 py-2 rounded-2xl bg-slate-100 text-slate-800 text-sm'
                                    }
                                >
                                    {message.role === 'bot' ? (
                                        renderFormattedMessageText(message.text)
                                    ) : (
                                        <p className="whitespace-pre-wrap leading-relaxed text-[14px]">{message.text}</p>
                                    )}

                                    {message.role === 'bot' && message.actions && message.actions.length > 0 && (
                                        <div className="mt-2 flex flex-wrap gap-2">
                                            {message.actions
                                                .filter((action) => !action.id.startsWith('date-') && !action.id.startsWith('time-'))
                                                .map((action) => (
                                                <button
                                                    key={action.id}
                                                    type="button"
                                                    onClick={() => sendMessage(action.value, action.userText || action.value)}
                                                    disabled={isLoading}
                                                    className="px-3 py-1.5 rounded-full bg-primary text-white text-xs font-semibold hover:bg-primary/90 disabled:opacity-60"
                                                >
                                                    {action.label}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}

                        {showCalendar && (
                            <div className="flex justify-start">
                                <div className="max-w-[90%] w-full p-3 rounded-2xl bg-slate-50 border border-slate-200">
                                    <p className="text-xs text-slate-600 mb-2">Selecciona una fecha</p>

                                    {dateActions.length > 0 && (
                                        <div className="mb-3">
                                            <p className="text-[11px] text-slate-500 mb-1">Fechas sugeridas</p>
                                            <div className="flex flex-wrap gap-1.5">
                                                {dateActions.map((action) => (
                                                    <button
                                                        key={`s-${action.id}`}
                                                        type="button"
                                                        onClick={() => sendMessage(action.value, action.userText || action.label)}
                                                        disabled={isLoading}
                                                        className="px-2 py-1 rounded-full bg-primary text-white text-[11px] font-semibold disabled:opacity-60"
                                                    >
                                                        {action.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex gap-2 mb-2">
                                        <select
                                            value={calendarMonth}
                                            onChange={(e) => setCalendarMonth(Number(e.target.value))}
                                            disabled={isLoading}
                                            className="flex-1 px-2 py-1.5 rounded-lg border border-slate-300 text-xs"
                                        >
                                            {Array.from({ length: 12 }, (_, month) => (
                                                <option key={month} value={month}>
                                                    {new Date(2000, month, 1).toLocaleDateString('es-MX', { month: 'long' })}
                                                </option>
                                            ))}
                                        </select>
                                        <select
                                            value={calendarYear}
                                            onChange={(e) => setCalendarYear(Number(e.target.value))}
                                            disabled={isLoading}
                                            className="w-24 px-2 py-1.5 rounded-lg border border-slate-300 text-xs"
                                        >
                                            {yearOptions.map((year) => (
                                                <option key={year} value={year}>
                                                    {year}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="grid grid-cols-7 gap-1 text-[10px] text-slate-500 mb-1">
                                        {['D', 'L', 'M', 'M', 'J', 'V', 'S'].map((day, dayIndex) => (
                                            <div key={`${day}-${dayIndex}`} className="text-center py-1">
                                                {day}
                                            </div>
                                        ))}
                                    </div>

                                    <div className="grid grid-cols-7 gap-1">
                                        {calendarDays.map((entry, index) => {
                                            if (entry.type === 'empty') {
                                                return <div key={`empty-${index}`} className="h-8" />;
                                            }

                                            const isSunday = entry.date.getDay() === 0;
                                            const disabled = isLoading || entry.isPast || isSunday;

                                            return (
                                                <button
                                                    key={entry.iso}
                                                    type="button"
                                                    disabled={disabled}
                                                    onClick={() => sendCalendarDate(entry.iso)}
                                                    className={`h-8 rounded-md text-xs font-medium transition-colors ${
                                                        disabled
                                                            ? 'bg-slate-100 text-slate-400'
                                                            : 'bg-white border border-slate-300 text-slate-700 hover:bg-primary/10'
                                                    }`}
                                                    title={isSunday ? 'Domingo cerrado' : entry.iso}
                                                >
                                                    {entry.date.getDate()}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        )}

                        {showTimePicker && (
                            <div className="flex justify-start">
                                <div className="max-w-[90%] w-full p-3 rounded-2xl bg-slate-50 border border-slate-200">
                                    <p className="text-xs text-slate-600 mb-2">Selecciona una hora</p>
                                    <p className="text-[11px] text-slate-500 mb-2">Horario disponible de 10:00 AM a 4:00 PM</p>
                                    <div className="grid grid-cols-3 gap-2">
                                        {timeActions
                                            .filter((action) => {
                                                const hh = Number(action.value.split(':')[0]);
                                                return Number.isFinite(hh) && hh >= 10 && hh <= 16;
                                            })
                                            .map((action) => (
                                                <button
                                                    key={`t-${action.id}`}
                                                    type="button"
                                                    onClick={() => sendMessage(action.value, action.userText || `🕒 ${formatTimeLabel(action.value)}`)}
                                                    disabled={isLoading}
                                                    className="h-9 rounded-md text-xs font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-primary/10 disabled:opacity-60"
                                                >
                                                    {formatTimeLabel(action.label)}
                                                </button>
                                            ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {isLoading && (
                            <div className="flex justify-start">
                                <div className="max-w-[85%] px-3 py-2 rounded-2xl bg-slate-100 text-slate-500 text-sm">
                                    Estoy revisando tu solicitud...
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="p-3 border-t border-slate-200 space-y-2">
                        <div className="flex items-center gap-2">
                            <textarea
                                ref={inputRef}
                                value={input}
                                rows={1}
                                onChange={(e) => handleInputChange(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSend();
                                    }
                                }}
                                placeholder="Escribe tu mensaje..."
                                className="flex-1 min-h-[42px] max-h-[66px] resize-none overflow-y-auto px-3 py-2 border border-slate-300 rounded-lg text-sm leading-[22px] focus:outline-none focus:ring-2 focus:ring-primary/40"
                            />
                            <button
                                type="button"
                                onClick={handleSend}
                                disabled={isLoading}
                                className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 disabled:opacity-60 transition-colors"
                            >
                                Enviar
                            </button>
                        </div>

                        {whatsappUrl && (
                            <a
                                href={whatsappUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block w-full text-center px-4 py-2 rounded-full bg-green-500 text-white text-sm font-semibold hover:bg-green-600 transition-colors"
                            >
                                Continuar por WhatsApp
                            </a>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}
