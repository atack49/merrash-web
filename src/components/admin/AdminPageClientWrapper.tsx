'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { LogOut } from 'lucide-react';
import { AdminTabs } from '@/components/admin/AdminTabs';

const VALID_ADMIN_TABS = ['citas', 'servicios', 'contacto', 'testimonios', 'encuestas', 'cursos'] as const;
type AdminTab = (typeof VALID_ADMIN_TABS)[number];

const normalizeAdminTab = (value: string | null): AdminTab => {
    if (value && VALID_ADMIN_TABS.includes(value as AdminTab)) {
        return value as AdminTab;
    }
    return 'citas';
};

interface AdminPageClientWrapperProps {
    surveys: any[];
    services: any[];
    testimonials: any[];
    contactInfo: any;
    signOutAction: (formData?: FormData) => Promise<void>;
}

export function AdminPageClientWrapper({
    surveys,
    services,
    testimonials,
    contactInfo,
    signOutAction,
}: AdminPageClientWrapperProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const urlTab = useMemo(() => normalizeAdminTab(searchParams.get('tab')), [searchParams]);
    const [activeTab, setActiveTab] = useState<AdminTab>('citas');
    const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

    useEffect(() => {
        setActiveTab(urlTab);
    }, [urlTab]);

    const handleAdminTabChange = (tab: string) => {
        const normalizedTab = normalizeAdminTab(tab);
        setActiveTab(normalizedTab);

        const params = new URLSearchParams(searchParams.toString());
        params.set('tab', normalizedTab);
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    };

    return (
        <div className="flex flex-col min-h-screen bg-background">
            <Header activeAdminTab={activeTab} onAdminTabChange={handleAdminTabChange} />
            <main className="flex-grow mt-16 md:mt-20 container mx-auto px-3 md:px-6 py-6 md:py-8 lg:py-12">
                {/* Tabs Section */}
                <AdminTabs 
                    activeTab={activeTab}
                    surveys={surveys}
                    services={services}
                    testimonials={testimonials}
                    contactInfo={contactInfo}
                />
            </main>
            <Footer />

            <div className="fixed bottom-5 right-5 z-[60]">
                <button
                    type="button"
                    onClick={() => setIsLogoutModalOpen(true)}
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90 text-sm font-semibold shadow-lg transition-colors"
                    aria-label="Cerrar sesion"
                >
                    <LogOut className="w-4 h-4" />
                    Cerrar sesion
                </button>
            </div>

            {isLogoutModalOpen && (
                <div
                    className="fixed inset-0 z-[80] bg-slate-900/45 backdrop-blur-[1px] flex items-center justify-center p-4"
                    onClick={() => setIsLogoutModalOpen(false)}
                >
                    <div
                        className="w-full max-w-sm rounded-2xl border border-border bg-card p-5 shadow-2xl"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <h3 className="text-lg font-semibold text-foreground">Confirmar cierre de sesion</h3>
                        <p className="mt-2 text-sm text-muted-foreground">
                            Estas a punto de cerrar tu sesion del panel de administracion.
                        </p>

                        <div className="mt-5 flex flex-col sm:flex-row gap-2">
                            <button
                                type="button"
                                onClick={() => setIsLogoutModalOpen(false)}
                                className="flex-1 px-4 py-2.5 rounded-full bg-muted text-muted-foreground font-medium hover:bg-slate-200 transition-colors"
                            >
                                Cancelar
                            </button>

                            <form action={signOutAction} className="flex-1">
                                <button
                                    type="submit"
                                    className="w-full px-4 py-2.5 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90 font-semibold transition-colors"
                                >
                                    Si, cerrar sesion
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
