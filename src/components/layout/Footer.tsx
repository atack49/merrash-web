"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Facebook, Instagram, MapPin, Mail, Phone } from "lucide-react";

interface FooterContactInfo {
    id: string;
    address: string;
    phones: string[];
    email: string;
    hours: {
        weekdays: string;
        saturday: string;
    };
}

const defaultContactInfo: FooterContactInfo = {
    id: "default",
    address: "Av. Estado de México 433, Santiaguito, 52140 Metepec, Méx.",
    phones: ["222 238 6181", "722 495 8550", "729 165 4769"],
    email: "dramalumolina@gmail.com",
    hours: { weekdays: "8:00 AM - 6:00 PM", saturday: "9:00 AM - 4:00 PM" },
};

export function Footer() {
    const [contact, setContact] = useState<FooterContactInfo>(defaultContactInfo);

    useEffect(() => {
        fetch('/api/contact')
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => {
                if (data) {
                    setContact(data);
                }
            })
            .catch(() => {
                setContact(defaultContactInfo);
            });
    }, []);

    return (
        <footer className="bg-secondary text-secondary-foreground pt-16 pb-8">
            <div className="container mx-auto px-4 md:px-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
                    {/* Brand Column */}
                    <div>
                        <h3 className="text-2xl font-bold text-primary mb-4">MERRASH</h3>
                        <p className="text-sm opacity-80 leading-relaxed max-w-xs">
                            Tu refugio de bienestar en Metepec. Combinamos medicina alternativa y tratamientos de spa para restaurar tu equilibrio natural.
                        </p>
                        <div className="flex gap-4 mt-6">
                            <a href="https://www.facebook.com/MerrashSpayMedicinaAlternativa" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">
                                <Facebook className="w-5 h-5" />
                            </a>
                            <a href="https://www.instagram.com/merrashyspaintegraldebelleza/" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">
                                <Instagram className="w-5 h-5" />
                            </a>
                        </div>
                    </div>

                    {/* Links Column */}
                    <div>
                        <h4 className="font-semibold text-lg mb-4">Enlaces Rápidos</h4>
                        <ul className="space-y-3">
                            <li><Link href="#inicio" className="text-sm hover:text-primary transition-colors">Inicio</Link></li>
                            <li><Link href="#servicios" className="text-sm hover:text-primary transition-colors">Nuestros Servicios</Link></li>
                            <li><Link href="#nosotros" className="text-sm hover:text-primary transition-colors">Sobre Nosotros</Link></li>
                            <li><Link href="#contacto" className="text-sm hover:text-primary transition-colors">Contacto</Link></li>
                        </ul>
                    </div>

                    {/* Contact Column */}
                    <div>
                        <h4 className="font-semibold text-lg mb-4">Contacto</h4>
                        <ul className="space-y-4">
                            <li className="flex items-start gap-3">
                                <MapPin className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                                <span className="text-sm opacity-90">{contact.address}</span>
                            </li>
                            <li className="flex items-center gap-3">
                                <Phone className="w-5 h-5 text-primary shrink-0" />
                                <div className="flex flex-col text-sm opacity-90">
                                    {contact.phones.map((phone) => (
                                        <span key={phone}>{phone}</span>
                                    ))}
                                </div>
                            </li>
                            <li className="flex items-center gap-3">
                                <Mail className="w-5 h-5 text-primary shrink-0" />
                                <a href={`mailto:${contact.email}`} className="text-sm hover:text-primary transition-colors">{contact.email}</a>
                            </li>
                        </ul>
                    </div>
                </div>

                <div className="border-t border-border/20 pt-8 text-center">
                    <p className="text-xs opacity-60">
                        &copy; {new Date().getFullYear()} Merrash Medicina Alternativa y Spa. Todos los derechos reservados.
                    </p>
                </div>
            </div>
        </footer>
    );
}
