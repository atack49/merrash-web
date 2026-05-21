'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Send, User, Bot, UserCog, ArrowLeft, MessageCircle } from 'lucide-react';
import useSWR from 'swr';

interface ChatMessage {
    id: string;
    phone: string;
    contactName: string | null;
    body: string;
    sender: 'bot' | 'admin' | 'paciente';
    createdAt: string;
}

interface Contact {
    phone: string;
    contactName: string;
    lastMessage: string;
    updatedAt: string;
}

// Helpers Auxiliares
const getInitials = (name: string) => {
    if (!name) return '?';
    return name
        .split(' ')
        .filter(Boolean)
        .map(n => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();
};

const formatPhoneNumber = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('52') && cleaned.length === 12) {
        return `+52 ${cleaned.slice(2, 5)} ${cleaned.slice(5, 8)} ${cleaned.slice(8)}`;
    }
    if (cleaned.length === 10) {
        return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return phone;
};

// Componente de Avatar Premium
const ContactAvatar = ({ name, phone }: { name: string | null; phone: string }) => {
    const initials = name ? getInitials(name) : '';
    const colors = [
        'from-teal-500 to-[#068E89]',
        'from-emerald-500 to-teal-600',
        'from-[#068E89] to-cyan-600',
        'from-indigo-500 to-purple-600',
    ];
    
    // Generar un hash determinista a partir del número de teléfono para un degradado consistente
    const hash = phone.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const gradient = colors[hash % colors.length];

    return (
        <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-semibold text-sm shadow-sm relative shrink-0`}>
            {name ? initials : <User className="w-5 h-5" />}
            {/* Indicador sutil de canal activo (WhatsApp) en la esquina */}
            <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-card" />
        </div>
    );
};

export function LiveChatManager() {
    const [activeContact, setActiveContact] = useState<Contact | null>(null);
    const [newMessage, setNewMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const chatContainerRef = useRef<HTMLDivElement>(null);

    const fetcher = (url: string) => fetch(url).then(r => r.json());

    // Polling de lista de contactos cada 5 segundos
    const { data: contactsData } = useSWR('/api/admin/chat/messages', fetcher, { refreshInterval: 5000 });
    const contacts: Contact[] = contactsData?.data || [];

    // Polling de mensajes del contacto activo cada 3 segundos
    const { data: messagesData, mutate: mutateMessages } = useSWR(
        activeContact ? `/api/admin/chat/messages?phone=${activeContact.phone}` : null,
        fetcher,
        { refreshInterval: 3000 }
    );
    const messages: ChatMessage[] = messagesData?.data || [];

    // Auto-scroll al final
    const scrollToBottom = () => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !activeContact) return;

        setIsLoading(true);
        try {
            const res = await fetch('/api/admin/chat/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    phone: activeContact.phone,
                    message: newMessage,
                    contactName: activeContact.contactName
                }),
            });

            if (res.ok) {
                setNewMessage('');
                mutateMessages(); // Refrescar los mensajes localmente al instante
            } else {
                console.error("Error enviando mensaje");
            }
        } catch (error) {
            console.error("Excepción:", error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col md:flex-row h-[70vh] md:h-[600px] border border-border/80 rounded-2xl overflow-hidden bg-card shadow-lg">
            {/* Left Column: Contacts */}
            <div className={`w-full md:w-1/3 border-r border-border/60 bg-muted/10 flex flex-col ${activeContact ? 'hidden md:flex' : 'flex'}`}>
                <div className="p-4 border-b border-border/50 bg-card">
                    <h3 className="font-bold text-base text-foreground tracking-tight flex items-center gap-2">
                        <MessageCircle className="w-5 h-5 text-primary" />
                        Conversaciones
                    </h3>
                </div>
                <div className="flex-1 overflow-y-auto space-y-1 p-2">
                    {contacts.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground text-sm flex flex-col items-center justify-center gap-2 h-full">
                            <MessageCircle className="w-8 h-8 opacity-30 text-primary" />
                            <span>No hay conversaciones activas</span>
                        </div>
                    ) : (
                        contacts.map((contact) => (
                            <div
                                key={contact.phone}
                                onClick={() => setActiveContact(contact)}
                                className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-200 ${
                                    activeContact?.phone === contact.phone 
                                        ? 'bg-primary/10 border-l-4 border-primary shadow-sm' 
                                        : 'hover:bg-muted/40 border-l-4 border-transparent'
                                }`}
                            >
                                <ContactAvatar name={contact.contactName} phone={contact.phone} />
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-baseline mb-0.5">
                                        <div className="font-semibold text-sm text-foreground truncate">
                                            {contact.contactName || formatPhoneNumber(contact.phone)}
                                        </div>
                                        <span className="text-[10px] text-muted-foreground shrink-0 ml-2">
                                            {contact.updatedAt ? new Date(contact.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                        </span>
                                    </div>
                                    <div className="text-xs text-muted-foreground truncate max-w-[95%]">
                                        {contact.lastMessage}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Right Column: Chat Window */}
            <div className={`w-full md:w-2/3 flex flex-col bg-card ${
                !activeContact 
                    ? 'hidden md:flex' 
                    : 'fixed md:relative top-[64px] md:top-0 inset-x-0 bottom-0 md:bottom-auto z-[45] md:z-auto h-[calc(100dvh-64px)] md:h-full flex'
            }`}>
                {activeContact ? (
                    <>
                        {/* Cabecera del Chat Activo */}
                        <div className="p-4 border-b border-border/40 bg-card/85 backdrop-blur-md flex justify-between items-center shadow-sm z-10 shrink-0">
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setActiveContact(null)}
                                    className="md:hidden w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all duration-200"
                                    aria-label="Volver a conversaciones"
                                >
                                    <ArrowLeft className="w-5 h-5" />
                                </button>
                                <ContactAvatar name={activeContact.contactName} phone={activeContact.phone} />
                                <div>
                                    <h3 className="font-bold text-sm md:text-base leading-tight text-foreground">
                                        {activeContact.contactName || formatPhoneNumber(activeContact.phone)}
                                    </h3>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                        <span className="text-[10px] md:text-xs text-muted-foreground font-medium">WhatsApp Directo</span>
                                    </div>
                                </div>
                            </div>
                            <span className="hidden md:inline-flex items-center gap-1 px-3 py-1 rounded-full bg-muted/60 text-xs text-muted-foreground font-medium border border-border/30">
                                {formatPhoneNumber(activeContact.phone)}
                            </span>
                        </div>
                        
                        {/* Contenedor de Mensajes con textura premium */}
                        <div 
                            ref={chatContainerRef} 
                            className="flex-1 overflow-y-auto overscroll-contain p-4 md:p-6 space-y-4 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#068E89]/5 via-background/40 to-background"
                        >
                            {messages.map((msg) => {
                                const isPatient = msg.sender === 'paciente';
                                return (
                                    <div key={msg.id} className={`flex flex-col ${isPatient ? 'items-start' : 'items-end'}`}>
                                        <div className={`px-4 py-2.5 max-w-[80%] md:max-w-[70%] shadow-sm ${
                                            isPatient 
                                                ? 'bg-muted/50 border border-border/30 text-foreground rounded-2xl rounded-tl-sm' 
                                                : msg.sender === 'bot'
                                                    ? 'bg-gradient-to-br from-indigo-600 to-indigo-800 text-white rounded-2xl rounded-tr-sm shadow-indigo-600/10'
                                                    : 'bg-gradient-to-br from-[#068E89] to-[#046a67] text-white rounded-2xl rounded-tr-sm shadow-[#068E89]/10'
                                        }`}>
                                            <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{msg.body}</p>
                                        </div>
                                        
                                        <div className="flex items-center gap-1.5 mt-1 px-1 text-[10px] text-muted-foreground/60">
                                            <span>
                                                {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                            {!isPatient && (
                                                <>
                                                    <span>•</span>
                                                    <span className="capitalize flex items-center gap-1">
                                                        {msg.sender === 'bot' ? <Bot className="w-3 h-3 text-indigo-400" /> : <UserCog className="w-3 h-3 text-emerald-400" />}
                                                        {msg.sender}
                                                    </span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Barra de Responder Flotante Premium */}
                        <div className="p-4 border-t border-border/40 bg-card/85 backdrop-blur-md shrink-0">
                            <form onSubmit={handleSendMessage} className="flex items-center gap-2 max-w-4xl mx-auto">
                                <div className="relative flex-grow">
                                    <input
                                        type="text"
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        placeholder="Escribe un mensaje..."
                                        className="w-full rounded-full border border-border bg-background/60 backdrop-blur-sm pl-5 pr-12 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all duration-200"
                                        disabled={isLoading}
                                    />
                                    {isLoading && (
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                        </div>
                                    )}
                                </div>
                                <button
                                    type="submit"
                                    disabled={!newMessage.trim() || isLoading}
                                    className="p-3 rounded-full bg-gradient-to-r from-[#068E89] to-[#08a6a0] text-white hover:opacity-95 shadow-md shadow-[#068E89]/10 transition-all active:scale-95 disabled:opacity-40 disabled:pointer-events-none hover:scale-105 duration-200 shrink-0"
                                    aria-label="Enviar mensaje"
                                >
                                    <Send className="w-5 h-5" />
                                </button>
                            </form>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground p-6">
                        <div className="w-16 h-16 rounded-full bg-muted/40 flex items-center justify-center shadow-inner">
                            <MessageCircle className="w-8 h-8 opacity-45 text-primary" />
                        </div>
                        <span className="font-medium text-sm">Selecciona una conversación para comenzar</span>
                    </div>
                )}
            </div>
        </div>
    );
}
