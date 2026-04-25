'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CHATBOT_OPEN_EVENT } from '@/lib/chatbot/widgetEvents';
import { RotateCcw, X, MessageCircle, ChevronDown, Phone } from 'lucide-react';

type ChatAction = {
    id: string;
    label: string;
    value: string;
    userText?: string;
};

export type Message = {
    id: string;
    role: 'user' | 'bot';
    text: string;
    actions?: ChatAction[];
    isTyping?: boolean;
};

type PersistedChatState = {
    conversationId: string;
    messages: Message[];
    whatsappUrl: string;
    isOpen: boolean;
    expiresAt: number;
};

const CHATBOT_STORAGE_KEY = 'merrash-chatbot-state-v1';
const CHATBOT_TTL_MS = 1000 * 60 * 45;
const CHATBOT_HISTORY_PAYLOAD_LIMIT = 120;

const INITIAL_BOT_MESSAGE: Message = {
    id: 'welcome',
    role: 'bot',
    text: 'Hola  Soy el asistente de Merrash. ¿En qué te puedo ayudar hoy?',
};

const createConversationId = () => `chat-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const renderFormattedMessageText = (text: string) => {
    const lines = text.split('\n');

    const renderInline = (line: string, lineKey: string) => {
        const segments = line.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
        return segments.map((segment, segmentIndex) => {
            const isBold = /^\*\*[^*]+\*\*$/.test(segment);
            if (isBold) {
                return (
                    <strong key={`${lineKey}-s-${segmentIndex}`} className="font-semibold text-foreground">
                        {segment.slice(2, -2)}
                    </strong>
                );
            }
            return <span key={`${lineKey}-s-${segmentIndex}`}>{segment}</span>;
        });
    };

    return (
        <div className="space-y-1.5 text-[14px] leading-7 text-foreground">
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

const TypingIndicator = () => (
    <div className="flex items-center gap-1">
        <div className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '0ms' }} />
        <div className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '150ms' }} />
        <div className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '300ms' }} />
    </div>
);

export function ChatbotWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [input, setInput] = useState('');
    const [whatsappUrl, setWhatsappUrl] = useState<string>('');
    const [conversationId, setConversationId] = useState(() => createConversationId());
    const [expiresAt, setExpiresAt] = useState(() => Date.now() + CHATBOT_TTL_MS);
    const messagesViewportRef = useRef<HTMLDivElement | null>(null);
    const inputRef = useRef<HTMLTextAreaElement | null>(null);
    const widgetRef = useRef<HTMLDivElement | null>(null);
    const toggleButtonRef = useRef<HTMLButtonElement | null>(null);
    const [messages, setMessages] = useState<Message[]>([INITIAL_BOT_MESSAGE]);

    const resetConversation = useCallback(() => {
        setMessages([INITIAL_BOT_MESSAGE]);
        setWhatsappUrl('');
        setInput('');
        setConversationId(createConversationId());
        setExpiresAt(Date.now() + CHATBOT_TTL_MS);
        if (inputRef.current) {
            inputRef.current.style.height = 'auto';
        }
        localStorage.removeItem(CHATBOT_STORAGE_KEY);
    }, []);

    useEffect(() => {
        const viewport = messagesViewportRef.current;
        if (!viewport || messages.length === 0) return;

        const latest = messages[messages.length - 1];
        const target = viewport.querySelector<HTMLElement>(`[data-message-id="${latest.id}"]`);
        if (!target) return;

        if (latest.role === 'bot') {
            const messageHeight = target.offsetHeight;
            const viewportHeight = viewport.clientHeight;
            let scrollTop = target.offsetTop - 10;

            if (messageHeight > viewportHeight * 0.6) {
                scrollTop = Math.max(0, target.offsetTop + messageHeight - viewportHeight + 20);
            }

            viewport.scrollTo({
                top: scrollTop,
                behavior: 'smooth',
            });
            return;
        }

        viewport.scrollTo({
            top: viewport.scrollHeight,
            behavior: 'smooth',
        });
    }, [messages, isLoading]);

    useEffect(() => {
        const handleOpenChatbot = () => {
            setIsOpen(true);
            setExpiresAt(Date.now() + CHATBOT_TTL_MS);
        };

        window.addEventListener(CHATBOT_OPEN_EVENT, handleOpenChatbot);
        return () => window.removeEventListener(CHATBOT_OPEN_EVENT, handleOpenChatbot);
    }, []);

    useEffect(() => {
        if (!isOpen) return;

        const handlePointerDownOutside = (event: MouseEvent | TouchEvent) => {
            const target = event.target as Node | null;
            if (!target) return;

            if (widgetRef.current?.contains(target)) return;
            if (toggleButtonRef.current?.contains(target)) return;

            setIsOpen(false);
        };

        document.addEventListener('mousedown', handlePointerDownOutside);
        document.addEventListener('touchstart', handlePointerDownOutside);

        return () => {
            document.removeEventListener('mousedown', handlePointerDownOutside);
            document.removeEventListener('touchstart', handlePointerDownOutside);
        };
    }, [isOpen]);

    useEffect(() => {
        const raw = localStorage.getItem(CHATBOT_STORAGE_KEY);
        if (!raw) return;

        try {
            const parsed = JSON.parse(raw) as PersistedChatState;
            const hasValidMessages = Array.isArray(parsed.messages) && parsed.messages.length > 0;
            const hasExpired = !parsed.expiresAt || parsed.expiresAt <= Date.now();

            if (hasExpired || !hasValidMessages) {
                localStorage.removeItem(CHATBOT_STORAGE_KEY);
                return;
            }

            setConversationId(parsed.conversationId || createConversationId());
            setMessages(parsed.messages);
            setWhatsappUrl(parsed.whatsappUrl || '');
            setIsOpen(Boolean(parsed.isOpen));
            setExpiresAt(parsed.expiresAt);
        } catch {
            localStorage.removeItem(CHATBOT_STORAGE_KEY);
        }
    }, []);

    useEffect(() => {
        const payload: PersistedChatState = {
            conversationId,
            messages,
            whatsappUrl,
            isOpen,
            expiresAt,
        };
        localStorage.setItem(CHATBOT_STORAGE_KEY, JSON.stringify(payload));
    }, [conversationId, messages, whatsappUrl, isOpen, expiresAt]);

    useEffect(() => {
        const remaining = expiresAt - Date.now();

        if (remaining <= 0) {
            resetConversation();
            return;
        }

        const timeoutId = window.setTimeout(() => {
            resetConversation();
        }, remaining);

        return () => window.clearTimeout(timeoutId);
    }, [expiresAt, resetConversation]);

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

        setExpiresAt(Date.now() + CHATBOT_TTL_MS);

        const userMessage: Message = {
            id: `${Date.now()}-user`,
            role: 'user',
            text: displayText || text,
        };

        const historyPayload = [...messages, userMessage].slice(-CHATBOT_HISTORY_PAYLOAD_LIMIT).map((item) => ({
            role: item.role,
            text: item.text,
        }));

        setMessages((prev) => [...prev, userMessage]);
        setInput('');
        if (inputRef.current) {
            inputRef.current.style.height = 'auto';
        }
        setIsLoading(true);

        // Add typing indicator
        const typingId = `${Date.now()}-typing`;
        setMessages((prev) => [
            ...prev,
            {
                id: typingId,
                role: 'bot',
                text: '',
                isTyping: true,
            },
        ]);

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

            // Remove typing indicator and add actual response
            setMessages((prev) => prev.filter((msg) => msg.id !== typingId));

            const botMessage: Message = {
                id: `${Date.now()}-bot`,
                role: 'bot',
                text: data.reply || 'Por ahora no tengo respuesta, intenta nuevamente.',
                actions: Array.isArray(data.actions) ? data.actions : undefined,
            };

            setMessages((prev) => [...prev, botMessage]);
            setWhatsappUrl(data.whatsappUrl || '');
        } catch (error) {
            // Remove typing indicator and add error
            setMessages((prev) => prev.filter((msg) => msg.id !== typingId));

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

    return (
        <>
            <button
                ref={toggleButtonRef}
                type="button"
                onClick={() => setIsOpen((prev) => !prev)}
                className="fixed bottom-5 right-5 z-50 rounded-full bg-primary text-white px-5 py-3 shadow-lg hover:bg-primary/90 transition-all active:scale-95 font-medium flex items-center gap-2 group"
            >
                {isOpen ? (
                    <>
                        <ChevronDown className="w-5 h-5 transition-transform group-hover:translate-y-0.5" />
                        Minimizar
                    </>
                ) : (
                    <>
                        <MessageCircle className="w-5 h-5" />
                        Chat
                    </>
                )}
            </button>

            {isOpen && (
                <div
                    ref={widgetRef}
                    className="fixed bottom-20 right-5 z-50 w-[95vw] max-w-[520px] bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[78vh] max-h-[760px]"
                >
                    <div className="px-4 py-3 border-b border-border bg-muted/50">
                        <div className="flex items-start justify-between gap-2">
                            <div>
                                <p className="font-semibold text-foreground">Asistente Merrash</p>
                                <p className="text-xs text-muted-foreground">Aquí puedo ayudarte </p>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <a
                                    href="https://wa.me/527224958550?text=Hola,%20vengo%20de%20la%20web%20de%20Merrash"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-[#25D366] text-white text-[11px] font-semibold hover:bg-[#20ba5a] transition-colors shadow-sm"
                                    aria-label="Contactar por WhatsApp"
                                >
                                    <Phone className="w-3.5 h-3.5 fill-current" />
                                    WhatsApp
                                </a>
                                <button
                                    type="button"
                                    onClick={resetConversation}
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border border-border bg-background text-foreground text-[11px] font-semibold hover:bg-muted transition-colors"
                                    aria-label="Reiniciar conversacion"
                                >
                                    <RotateCcw className="w-3.5 h-3.5" />
                                    Nuevo
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIsOpen(false)}
                                    className="p-1.5 rounded-full hover:bg-muted text-muted-foreground transition-colors"
                                    aria-label="Cerrar asistente"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    </div>

                    <div ref={messagesViewportRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-background min-h-0">
                        {messages.map((message) => (
                            <div
                                key={message.id}
                                data-message-id={message.id}
                                className={message.role === 'user' ? 'flex justify-end' : 'flex justify-start'}
                            >
                                <div
                                    className={
                                        message.role === 'user'
                                            ? 'max-w-[85%] px-3 py-2 rounded-2xl bg-primary/10 text-foreground text-sm'
                                            : 'max-w-[85%] px-3 py-2 rounded-2xl bg-muted text-foreground text-sm'
                                    }
                                >
                                    {message.isTyping ? (
                                        <TypingIndicator />
                                    ) : message.role === 'bot' ? (
                                        renderFormattedMessageText(message.text)
                                    ) : (
                                        <p className="whitespace-pre-wrap leading-relaxed text-[14px]">{message.text}</p>
                                    )}

                                    {!message.isTyping && message.role === 'bot' && message.actions && message.actions.length > 0 && (
                                        <div className="mt-3 grid grid-cols-2 gap-2">
                                            {message.actions
                                                .filter((action) => !action.id.startsWith('date-') && !action.id.startsWith('time-'))
                                                .map((action) => (
                                                <button
                                                    key={action.id}
                                                    type="button"
                                                    onClick={() => sendMessage(action.value, action.userText || action.value)}
                                                    disabled={isLoading}
                                                    className="px-3 py-2 rounded-xl border border-primary/25 bg-background text-primary text-xs font-semibold text-left hover:bg-primary/10 disabled:opacity-60 transition-colors"
                                                >
                                                    {action.label}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="p-3 border-t border-border space-y-2">
                        <div className="flex items-end gap-2">
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
                                placeholder="Escribe tu pregunta..."
                                className="flex-1 min-h-[42px] max-h-[66px] resize-none overflow-y-auto px-3 py-2 border border-border rounded-lg text-sm leading-[22px] focus:outline-none focus:ring-2 focus:ring-primary/40"
                            />
                            <button
                                type="button"
                                onClick={handleSend}
                                disabled={isLoading || !input.trim()}
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
