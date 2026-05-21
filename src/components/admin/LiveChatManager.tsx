'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Send, User, Bot, UserCog, ArrowLeft } from 'lucide-react';
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

    const getSenderIcon = (sender: string) => {
        switch (sender) {
            case 'bot': return <Bot className="w-4 h-4" />;
            case 'admin': return <UserCog className="w-4 h-4" />;
            default: return <User className="w-4 h-4" />;
        }
    };

    return (
        <div className="flex flex-col md:flex-row h-[500px] md:h-[600px] border border-border rounded-xl overflow-hidden bg-card">
            {/* Left Column: Contacts */}
            <div className={`w-full md:w-1/3 border-r border-border bg-muted/20 flex flex-col ${activeContact ? 'hidden md:flex' : 'flex'}`}>
                <div className="p-4 border-b border-border bg-card">
                    <h3 className="font-semibold text-lg">Conversaciones</h3>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {contacts.length === 0 ? (
                        <div className="p-4 text-center text-muted-foreground text-sm">
                            No hay conversaciones activas
                        </div>
                    ) : (
                        contacts.map((contact) => (
                            <div
                                key={contact.phone}
                                onClick={() => setActiveContact(contact)}
                                className={`p-4 border-b border-border cursor-pointer hover:bg-muted/50 transition-colors ${
                                    activeContact?.phone === contact.phone ? 'bg-muted' : ''
                                }`}
                            >
                                <div className="font-medium">{contact.contactName || contact.phone}</div>
                                <div className="text-sm text-muted-foreground truncate">{contact.lastMessage}</div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Right Column: Chat Window */}
            <div className={`w-full md:w-2/3 flex flex-col bg-card ${!activeContact ? 'hidden md:flex' : 'flex'}`}>
                {activeContact ? (
                    <>
                        <div className="p-4 border-b border-border bg-card flex justify-between items-center shadow-sm z-10">
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setActiveContact(null)}
                                    className="md:hidden p-1 -ml-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                                    aria-label="Volver a conversaciones"
                                >
                                    <ArrowLeft className="w-5 h-5" />
                                </button>
                                <div>
                                    <h3 className="font-semibold leading-none">{activeContact.contactName || activeContact.phone}</h3>
                                    {activeContact.contactName && (
                                        <span className="text-[10px] text-muted-foreground md:hidden mt-0.5 block">{activeContact.phone}</span>
                                    )}
                                </div>
                            </div>
                            <span className="hidden md:inline text-sm text-muted-foreground">{activeContact.phone}</span>
                        </div>
                        
                        <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/10">
                            {messages.map((msg) => {
                                const isPatient = msg.sender === 'paciente';
                                return (
                                    <div key={msg.id} className={`flex flex-col ${isPatient ? 'items-start' : 'items-end'}`}>
                                        <div className="flex items-center gap-1 mb-1 text-xs text-muted-foreground">
                                            {getSenderIcon(msg.sender)}
                                            <span className="capitalize">{msg.sender}</span>
                                        </div>
                                        <div className={`px-4 py-2 rounded-2xl max-w-[80%] ${
                                            isPatient 
                                            ? 'bg-secondary text-secondary-foreground rounded-tl-none' 
                                            : 'bg-primary text-primary-foreground rounded-tr-none'
                                        }`}>
                                            {msg.body}
                                        </div>
                                        <span className="text-[10px] text-muted-foreground mt-1">
                                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                );
                            })}
                            <div ref={messagesEndRef} />
                        </div>

                        <div className="p-4 border-t border-border bg-card">
                            <form onSubmit={handleSendMessage} className="flex gap-2">
                                <input
                                    type="text"
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    placeholder="Escribe un mensaje..."
                                    className="flex-1 rounded-full border border-input bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                                    disabled={isLoading}
                                />
                                <button
                                    type="submit"
                                    disabled={!newMessage.trim() || isLoading}
                                    className="p-2 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                                >
                                    <Send className="w-5 h-5" />
                                </button>
                            </form>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-muted-foreground">
                        Selecciona una conversación para comenzar
                    </div>
                )}
            </div>
        </div>
    );
}
