import Link from "next/link";
import { Facebook, Instagram, MapPin, Mail, Phone } from "lucide-react";
import { CONTACT_INFO } from "@/lib/data";

export function Footer() {
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
                            <a href={CONTACT_INFO.socials.facebook} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">
                                <Facebook className="w-5 h-5" />
                            </a>
                            <a href={CONTACT_INFO.socials.instagram} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">
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
                                <span className="text-sm opacity-90">{CONTACT_INFO.address}</span>
                            </li>
                            <li className="flex items-center gap-3">
                                <Phone className="w-5 h-5 text-primary shrink-0" />
                                <div className="flex flex-col text-sm opacity-90">
                                    {CONTACT_INFO.phone.map(p => <span key={p}>{p}</span>)}
                                </div>
                            </li>
                            <li className="flex items-center gap-3">
                                <Mail className="w-5 h-5 text-primary shrink-0" />
                                <a href={`mailto:${CONTACT_INFO.email}`} className="text-sm hover:text-primary transition-colors">{CONTACT_INFO.email}</a>
                            </li>
                        </ul>
                    </div>
                </div>

                <div className="border-t border-border/20 pt-8 text-center bg-green-900 border-none">
                    <p className="text-xs opacity-60">
                        &copy; {new Date().getFullYear()} Merrash Medicina Alternativa y Spa. Todos los derechos reservados.
                    </p>
                </div>
            </div>
        </footer>
    );
}
