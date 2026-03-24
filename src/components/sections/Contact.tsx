'use client';
import { MapPin, Phone, Mail, Clock } from "lucide-react";
import { useEffect, useState } from "react";

type ContactInfo = {
    address: string;
    phones: string[];
    email: string;
    hours: {
        weekdays: string;
        saturday: string;
    };
};

const fallbackContact: ContactInfo = {
    address: "",
    phones: [],
    email: "",
    hours: {
        weekdays: "",
        saturday: "",
    },
};

const normalizeContact = (payload: unknown): ContactInfo => {
    if (!payload || typeof payload !== 'object') {
        return fallbackContact;
    }

    const row = payload as Record<string, unknown>;
    const phones = Array.isArray(row.phones)
        ? row.phones.map((phone) => String(phone)).filter((phone) => phone.trim().length > 0)
        : [];
    const hours = row.hours && typeof row.hours === 'object' ? (row.hours as Record<string, unknown>) : {};

    return {
        address: String(row.address || ''),
        phones,
        email: String(row.email || ''),
        hours: {
            weekdays: String(hours.weekdays || ''),
            saturday: String(hours.saturday || ''),
        },
    };
};

export function Contact() {
    const [contact, setContact] = useState<ContactInfo>(fallbackContact);
    useEffect(() => {
        fetch("/api/contact")
            .then(res => res.ok ? res.json() : null)
            .then(data => setContact(normalizeContact(data)))
            .catch(() => setContact(fallbackContact));
    }, []);
    return (
        <section id="contacto" className="py-24 bg-background">
            <div className="container mx-auto px-4 md:px-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24">
                    {/* Info Side */}
                    <div className="space-y-10">
                        <div>
                            <h2 className="text-3xl md:text-5xl font-bold text-primary tracking-tight mb-4">Contáctanos</h2>
                            <p className="text-lg text-muted-foreground font-light">Estamos aquí para responder tus dudas y agendar tu próxima sesión de bienestar.</p>
                        </div>
                        <div className="space-y-8">
                            <div className="flex items-start gap-4">
                                <div className="w-12 h-12 bg-secondary/30 rounded-full flex items-center justify-center text-primary shrink-0">
                                    <MapPin className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-semibold mb-1">Ubicación</h3>
                                    <p className="text-muted-foreground">{contact.address || "Cargando..."}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-4">
                                <div className="w-12 h-12 bg-secondary/30 rounded-full flex items-center justify-center text-primary shrink-0">
                                    <Phone className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-semibold mb-1">Teléfonos</h3>
                                    <div className="flex flex-col text-muted-foreground">
                                        {contact.phones.length > 0 ? contact.phones.map((p) => <span key={p}>{p}</span>) : "Cargando..."}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-start gap-4">
                                <div className="w-12 h-12 bg-secondary/30 rounded-full flex items-center justify-center text-primary shrink-0">
                                    <Mail className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-semibold mb-1">Correo</h3>
                                    <a href={`mailto:${contact.email || ""}`} className="text-muted-foreground hover:text-primary transition-colors">
                                        {contact.email || "Cargando..."}
                                    </a>
                                </div>
                            </div>
                            <div className="flex items-start gap-4">
                                <div className="w-12 h-12 bg-secondary/30 rounded-full flex items-center justify-center text-primary shrink-0">
                                    <Clock className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-semibold mb-1">Horarios</h3>
                                    <p className="text-muted-foreground">Lunes a Viernes: {contact.hours.weekdays || "Cargando..."}</p>
                                    <p className="text-muted-foreground">Sábado: {contact.hours.saturday || "Cargando..."}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    {/* Map Side */}
                    <div className="h-[400px] md:h-full min-h-[400px] w-full bg-secondary/10 rounded-3xl overflow-hidden shadow-lg border border-border/50">
                        <iframe
                            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3766.155829671569!2d-99.60156968509375!3d19.25557798698579!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x85cd8a38b5555555%3A0x5555555555555555!2sAv.%20Estado%20de%20M%C3%A9xico%20433%2C%20Santiaguito%2C%2052140%20Metepec%2C%20M%C3%A9x.!5e0!3m2!1ses-419!2smx!4v1600000000000!5m2!1ses-419!2smx"
                            width="100%"
                            height="100%"
                            style={{ border: 0 }}
                            allowFullScreen
                            loading="lazy"
                            referrerPolicy="no-referrer-when-downgrade"
                            title="Ubicación Merrash"
                        ></iframe>
                    </div>
                </div>
            </div>
        </section>
    );
}
