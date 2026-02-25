'use client';

import { useState } from 'react';
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { LogOut } from 'lucide-react';
import { AdminTabs } from '@/components/admin/AdminTabs';

interface AdminPageClientWrapperProps {
    session: any;
    surveys: any[];
    services: any[];
    testimonials: any[];
    contactInfo: any;
    signOutAction: (formData?: FormData) => Promise<void>;
}

export function AdminPageClientWrapper({
    session,
    surveys,
    services,
    testimonials,
    contactInfo,
    signOutAction,
}: AdminPageClientWrapperProps) {
    const [activeTab, setActiveTab] = useState<string>('encuestas');

    return (
        <div className="flex flex-col min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
            <Header activeAdminTab={activeTab} onAdminTabChange={setActiveTab} />
            <main className="flex-grow mt-16 md:mt-20 container mx-auto px-3 md:px-6 py-6 md:py-8 lg:py-12">
                {/* Header Section */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 md:gap-6 mb-8 md:mb-12">
                    <div className="space-y-1 md:space-y-2">
                        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">Panel de Administración</h1>
                        <p className="text-xs md:text-sm text-slate-600">
                            Bienvenido, <span className="font-semibold text-primary">{session?.user?.name}</span>
                        </p>
                    </div>
                    <form action={signOutAction}>
                        <button
                            type="submit"
                            className="inline-flex items-center gap-2 px-4 md:px-6 py-2 md:py-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold text-sm md:text-base lg:text-lg rounded-full transition-all duration-300 shadow-md hover:shadow-lg whitespace-nowrap"
                        >
                            <LogOut className="w-4 h-4 md:w-5 md:h-5" />
                            Cerrar Sesión
                        </button>
                    </form>
                </div>

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
        </div>
    );
}
