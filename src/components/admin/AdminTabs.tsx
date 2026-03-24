'use client';

import React from 'react';
import { FileText, MessageSquare } from 'lucide-react';
import { ServicesManager } from './ServicesManager';
import { TestimonialsManager } from './TestimonialsManager';
import { ContactManager } from './ContactManager';
import { AppointmentsCalendar } from './AppointmentsCalendar';
import { SurveysManager } from './SurveysManager';

export function AdminTabs({ activeTab, surveys, services, testimonials, contactInfo }: any) {
    return (
        <div className="space-y-4 md:space-y-6">
            {/* Tab Content */}
            <div className="bg-card rounded-lg md:rounded-xl shadow-lg border border-border p-4 md:p-6 lg:p-8">
                {activeTab === 'encuestas' && (
                    <SurveysManager initialSurveys={surveys} />
                )}

                {activeTab === 'servicios' && (
                    <div className="space-y-4 md:space-y-6">
                        <h2 className="text-lg md:text-xl font-bold">Gestionar Servicios</h2>
                        <ServicesManager initialServices={services} />
                    </div>
                )}

                {activeTab === 'testimonios' && (
                    <div className="space-y-4 md:space-y-6">
                        <h2 className="text-lg md:text-xl font-bold">Gestionar Testimonios</h2>
                        <TestimonialsManager initialTestimonials={testimonials} />
                    </div>
                )}

                {activeTab === 'contacto' && (
                    <div className="space-y-4 md:space-y-6">
                        <h2 className="text-lg md:text-xl font-bold">Gestionar Contacto</h2>
                        <ContactManager initialContact={contactInfo} />
                    </div>
                )}

                {activeTab === 'citas' && (
                    <div className="space-y-4 md:space-y-6">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <h2 className="text-lg md:text-xl font-bold">Citas Agendadas</h2>
                            <button
                                type="button"
                                onClick={() => window.dispatchEvent(new Event('merrash:open-gestion-citas'))}
                                className="px-4 py-2 rounded-full bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors"
                            >
                                Gestionar citas
                            </button>
                        </div>
                        <AppointmentsCalendar />
                    </div>
                )}
            </div>
        </div>
    );
}

