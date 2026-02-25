'use client';

import React from 'react';
import { FileText, MessageSquare } from 'lucide-react';
import { ServicesManager } from './ServicesManager';
import { TestimonialsManager } from './TestimonialsManager';
import { ContactManager } from './ContactManager';

export function AdminTabs({ activeTab, surveys, services, testimonials, contactInfo }: any) {
    return (
        <div className="space-y-4 md:space-y-6">
            {/* Tab Content */}
            <div className="bg-white rounded-lg md:rounded-xl shadow-lg border border-slate-100 p-4 md:p-6 lg:p-8">
                {activeTab === 'encuestas' && (
                    <div className="space-y-4 md:space-y-6">
                        <h2 className="text-lg md:text-xl font-bold">Encuestas Activas</h2>
                        {surveys.length === 0 ? (
                            <div className="p-8 md:p-16 text-center">
                                <p className="text-slate-500 text-base md:text-lg lg:text-xl font-medium">No hay encuestas registradas.</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-100">
                                {surveys.map((survey: any) => (
                                    <div key={survey.id} className="py-4 md:py-6">
                                        <h4 className="text-base md:text-lg lg:text-xl font-semibold text-slate-900">{survey.title}</h4>
                                        <p className="text-xs md:text-sm lg:text-base text-slate-600 mt-1">{survey.description}</p>
                                        <div className="flex flex-wrap gap-2 md:gap-3 mt-3 md:mt-4">
                                            <span className="inline-flex items-center gap-1 md:gap-2 px-2 md:px-3 py-1 bg-primary/10 text-primary text-xs md:text-sm lg:text-base font-semibold rounded-full">
                                                <FileText className="w-3 h-3 md:w-4 md:h-4" />
                                                {survey._count?.questions || 0} preguntas
                                            </span>
                                            <span className="inline-flex items-center gap-1 md:gap-2 px-2 md:px-3 py-1 bg-green-100 text-green-700 text-xs md:text-sm lg:text-base font-semibold rounded-full">
                                                <MessageSquare className="w-3 h-3 md:w-4 md:h-4" />
                                                {survey._count?.responses || 0} respuestas
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
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
                        <h2 className="text-lg md:text-xl font-bold">Citas Agendadas</h2>
                        <p className="text-slate-600 text-sm md:text-base lg:text-lg">Función en desarrollo...</p>
                    </div>
                )}
            </div>
        </div>
    );
}

