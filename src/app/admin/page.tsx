import { auth } from '@/auth';
import { getSurveys } from '@/lib/persistence';
import { redirect } from 'next/navigation';
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { LogOut, FileText, Clock, Star, MessageSquare } from 'lucide-react';

async function signOutAction() {
    'use server';
    const { signOut } = await import('@/auth');
    await signOut();
}

export default async function AdminPage() {
    const session = await auth();

    if (!session) {
        redirect('/login');
    }

    const surveys = await getSurveys();
    const sortedSurveys = [...surveys].reverse(); // Newest first

    return (
        <div className="flex flex-col min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
            <Header />
            <main className="flex-grow mt-20 container mx-auto px-4 md:px-6 py-12">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
                    <div className="space-y-2">
                        <h1 className="text-4xl md:text-5xl font-bold text-slate-900 tracking-tight">Panel de Administración</h1>
                        <p className="text-lg text-slate-600">
                            Bienvenido, <span className="font-semibold text-primary">{session?.user?.name}</span>
                        </p>
                    </div>
                    <form action={signOutAction}>
                        <button
                            type="submit"
                            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold rounded-lg transition-all duration-300 shadow-md hover:shadow-lg"
                        >
                            <LogOut className="w-5 h-5" />
                            Cerrar Sesión
                        </button>
                    </form>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                    {/* Total Encuestas */}
                    <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-8">
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                                <FileText className="w-6 h-6 text-primary" />
                            </div>
                            <span className="text-sm font-semibold text-slate-500">Total</span>
                        </div>
                        <p className="text-4xl font-bold text-slate-900">{surveys.length}</p>
                        <p className="text-sm text-slate-600 mt-2">Encuestas completadas</p>
                    </div>

                    {/* Satisfacción */}
                    <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-8">
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                                <Star className="w-6 h-6 text-blue-600" />
                            </div>
                            <span className="text-sm font-semibold text-slate-500">Satisfacción</span>
                        </div>
                        <p className="text-4xl font-bold text-slate-900">{surveys.filter(s => s.type === 'satisfaccion').length}</p>
                        <p className="text-sm text-slate-600 mt-2">Encuestas de satisfacción</p>
                    </div>

                    {/* Cómo nos encontraste */}
                    <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-8">
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                                <MessageSquare className="w-6 h-6 text-green-600" />
                            </div>
                            <span className="text-sm font-semibold text-slate-500">Referencia</span>
                        </div>
                        <p className="text-4xl font-bold text-slate-900">{surveys.filter(s => s.type === 'enterado').length}</p>
                        <p className="text-sm text-slate-600 mt-2">Cómo nos encontraste</p>
                    </div>
                </div>

                {/* Recent Surveys */}
                <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden">
                    <div className="px-8 py-6 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
                        <h3 className="text-xl font-bold text-slate-900">
                            Resultados de Encuestas
                        </h3>
                    </div>

                    {sortedSurveys.length === 0 ? (
                        <div className="p-16 text-center">
                            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                                <FileText className="w-8 h-8 text-slate-400" />
                            </div>
                            <p className="text-slate-500 text-lg font-medium">No hay encuestas registradas aún.</p>
                            <p className="text-slate-400 text-sm mt-2">Las respuestas de encuestas aparecerán aquí</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {sortedSurveys.map((survey) => (
                                <div key={survey.id} className="p-8 hover:bg-slate-50 transition-colors">
                                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-4">
                                        <div className="flex items-start gap-4">
                                            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                                <Clock className="w-6 h-6 text-primary" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold text-slate-700">
                                                    {new Date(survey.createdAt).toLocaleString('es-ES')}
                                                </p>
                                                <span className="inline-block mt-2 px-3 py-1 bg-primary/10 text-primary text-sm font-semibold rounded-full">
                                                    {survey.type === 'satisfaccion' ? 'Satisfacción' : 'Cómo nos encontraste'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Show Survey Responses */}
                                    <details className="mt-4">
                                        <summary className="cursor-pointer text-primary font-semibold hover:text-primary/80 transition-colors flex items-center gap-2">
                                            <span>Ver detalles</span>
                                        </summary>
                                        <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                                            <div className="space-y-4">
                                                {Object.entries(survey.data as any).map(([key, value]) => (
                                                    <div key={key} className="flex flex-col gap-2">
                                                        <p className="text-sm font-semibold text-slate-700">
                                                            {key.replace(/_/g, ' ').charAt(0).toUpperCase() + key.replace(/_/g, ' ').slice(1)}
                                                        </p>
                                                        <p className="text-sm text-slate-600 bg-white p-3 rounded border border-slate-200">
                                                            {typeof value === 'number' ? (
                                                                <span className="flex items-center gap-2">
                                                                    {[...Array(5)].map((_, i) => (
                                                                        <Star
                                                                            key={i}
                                                                            className={`w-4 h-4 ${i < value ? 'fill-yellow-400 text-yellow-400' : 'text-slate-300'}`}
                                                                        />
                                                                    ))}
                                                                    <span className="ml-2 font-semibold">{value}/5</span>
                                                                </span>
                                                            ) : (
                                                                value || 'Sin respuesta'
                                                            )}
                                                        </p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </details>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>
            <Footer />
        </div>
    );
}
