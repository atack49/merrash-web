'use client';

import { useState } from 'react';
import { FileText, MessageSquare, BarChart3, ChevronLeft, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

export function SurveysManager({ initialSurveys }: { initialSurveys: any[] }) {
    const [selectedSurvey, setSelectedSurvey] = useState<string | null>(null);
    const [results, setResults] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);

    const loadResults = async (surveyId: string) => {
        setIsLoading(true);
        try {
            const res = await fetch(`/api/admin/surveys/${surveyId}/results`);
            if (res.ok) {
                const data = await res.json();
                setResults(data);
                setSelectedSurvey(surveyId);
            } else {
                alert('Error al cargar resultados');
            }
        } catch (error) {
            console.error('Error fetching results:', error);
            alert('Error de red al cargar resultados');
        } finally {
            setIsLoading(false);
        }
    };

    if (selectedSurvey && results) {
        return (
            <div className="space-y-6">
                <button
                    onClick={() => { setSelectedSurvey(null); setResults(null); }}
                    className="inline-flex items-center gap-2 text-primary hover:text-primary/80 font-medium transition-colors bg-primary/5 px-4 py-2 rounded-full"
                >
                    <ChevronLeft className="w-5 h-5" />
                    Volver a Encuestas
                </button>

                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 md:p-8">
                    <h2 className="text-2xl font-bold text-slate-900">{results.survey.title}</h2>
                    <p className="text-slate-600 mt-2">{results.survey.description}</p>
                    <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-full font-semibold border border-green-200">
                        <MessageSquare className="w-4 h-4" />
                        {results.survey.totalResponses} Respuestas Totales
                    </div>
                </div>

                <div className="space-y-6">
                    {results.results.map((q: any) => (
                        <div key={q.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 md:p-8">
                            <h3 className="text-lg font-semibold text-slate-800 mb-6 flex items-start gap-3">
                                <span className="bg-primary/10 text-primary w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                    ?
                                </span>
                                {q.text}
                            </h3>

                            {q.responsesCount === 0 ? (
                                <p className="text-slate-500 italic text-center py-4 bg-slate-50 rounded-xl">Sin respuestas aún</p>
                            ) : (
                                <div className="space-y-4">
                                    {q.type === 'rating' && q.stats && (
                                        <div className="space-y-4">
                                            <div className="flex items-end gap-3 mb-6">
                                                <span className="text-4xl font-bold tracking-tighter text-slate-900">{q.stats.average}</span>
                                                <div className="flex pb-1">
                                                    {[1, 2, 3, 4, 5].map((star) => (
                                                        <Star
                                                            key={star}
                                                            className={cn(
                                                                'w-5 h-5',
                                                                star <= Math.round(Number(q.stats.average))
                                                                    ? 'fill-amber-400 text-amber-400'
                                                                    : 'text-slate-200'
                                                            )}
                                                        />
                                                    ))}
                                                </div>
                                                <span className="text-sm text-slate-500 pb-1 ml-2">promedio</span>
                                            </div>

                                            <div className="space-y-3">
                                                {[5, 4, 3, 2, 1].map((stars) => {
                                                    const count = q.stats.distribution[stars] || 0;
                                                    const percentage = q.responsesCount > 0 ? Math.round((count / q.responsesCount) * 100) : 0;
                                                    
                                                    return (
                                                        <div key={stars} className="flex items-center gap-4">
                                                            <div className="flex items-center gap-1 w-12 text-sm font-medium text-slate-600">
                                                                {stars} <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                                                            </div>
                                                            <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                                                                <div 
                                                                    className="h-full bg-primary rounded-full transition-all duration-1000 ease-out"
                                                                    style={{ width: `${percentage}%` }}
                                                                />
                                                            </div>
                                                            <div className="w-12 text-sm text-slate-500 text-right">
                                                                {percentage}%
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {q.type === 'select' && q.stats && (
                                        <div className="space-y-4">
                                            {(q.options || []).map((opt: string) => {
                                                const count = q.stats.counts[opt] || 0;
                                                const percentage = q.responsesCount > 0 ? Math.round((count / q.responsesCount) * 100) : 0;
                                                
                                                return (
                                                    <div key={opt} className="space-y-2">
                                                        <div className="flex justify-between text-sm font-medium">
                                                            <span className="text-slate-700">{opt}</span>
                                                            <span className="text-slate-500">{count} votos ({percentage}%)</span>
                                                        </div>
                                                        <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                                                            <div 
                                                                className="h-full bg-primary rounded-full transition-all duration-1000 ease-out"
                                                                style={{ width: `${percentage}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {q.type === 'text' && (
                                        <div className="space-y-3 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                                            {(q.answers || []).map((ans: string, i: number) => (
                                                <div key={i} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-slate-700 text-sm">
                                                    "{ans}"
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    const totalResponsesOverall = initialSurveys.reduce((acc, s) => acc + (s._count?.responses || 0), 0);
    
    // Custom colors matching the app theme (Primary Teal, Emerald, Amber, etc)
    const chartColors = ['#0d9488', '#34d399', '#fbbf24', '#60a5fa', '#a78bfa']; 
    let currentPercentage = 0;
    const gradientStops = initialSurveys.map((survey: any, index: number) => {
        const count = survey._count?.responses || 0;
        const percentage = totalResponsesOverall > 0 ? (count / totalResponsesOverall) * 100 : 0;
        const start = currentPercentage;
        currentPercentage += percentage;
        return `${chartColors[index % chartColors.length]} ${start}% ${currentPercentage}%`;
    }).join(', ');

    const chartStyle = totalResponsesOverall > 0 
        ? { background: `conic-gradient(${gradientStops})` }
        : { background: '#f8fafc' }; // slate-50

    return (
        <div className="space-y-6 md:space-y-8">
            <h2 className="text-lg md:text-xl font-bold text-slate-900">Encuestas Activas</h2>

            {/* Overview Donut Chart */}
            <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100 flex flex-col md:flex-row items-center gap-8 md:gap-12 hover:shadow-md transition-shadow">
                <div className="relative w-40 h-40 md:w-48 md:h-48 rounded-full shadow-inner flex-shrink-0" style={chartStyle}>
                    <div className="absolute inset-4 md:inset-5 bg-white rounded-full flex flex-col items-center justify-center shadow-sm">
                        <span className="text-3xl md:text-4xl font-bold text-slate-800 tracking-tight">{totalResponsesOverall}</span>
                        <span className="text-xs md:text-sm text-slate-500 font-medium">Respuestas</span>
                    </div>
                </div>
                <div className="flex-1 space-y-4 w-full">
                    <h3 className="text-lg font-semibold text-slate-800">Distribución Global</h3>
                    <div className="space-y-3">
                        {initialSurveys.map((survey: any, index: number) => {
                            const count = survey._count?.responses || 0;
                            const percentage = totalResponsesOverall > 0 ? Math.round((count / totalResponsesOverall) * 100) : 0;
                            return (
                                <div key={survey.id} className="flex items-center gap-4">
                                    <div className="w-4 h-4 rounded-full flex-shrink-0 shadow-sm" style={{ backgroundColor: chartColors[index % chartColors.length] }} />
                                    <div className="flex-1 text-sm font-medium text-slate-700 truncate">{survey.title}</div>
                                    <div className="text-sm font-semibold text-slate-500 bg-slate-50 px-3 py-1 rounded-full border border-slate-100">
                                        {count} <span className="text-slate-400 font-normal ml-1">({percentage}%)</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
            {initialSurveys.length === 0 ? (
                <div className="p-8 md:p-16 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    <p className="text-slate-500 text-base md:text-lg font-medium">No hay encuestas registradas.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                    {initialSurveys.map((survey: any) => (
                        <div key={survey.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md hover:border-primary/20 transition-all group flex flex-col h-full">
                            <h4 className="text-lg font-bold text-slate-900 group-hover:text-primary transition-colors">{survey.title}</h4>
                            <p className="text-sm text-slate-600 mt-2 mb-6 flex-grow">{survey.description}</p>
                            
                            <div className="flex flex-wrap items-center gap-2 mt-auto mb-6">
                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary text-xs font-bold rounded-full">
                                    <FileText className="w-3.5 h-3.5" />
                                    {survey._count?.questions || 0} Preguntas
                                </span>
                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 border border-green-200 text-green-700 text-xs font-bold rounded-full">
                                    <MessageSquare className="w-3.5 h-3.5" />
                                    {survey._count?.responses || 0} Respuestas
                                </span>
                            </div>

                            <button
                                onClick={() => loadResults(survey.id)}
                                disabled={isLoading}
                                className="w-full py-2.5 bg-slate-50 hover:bg-primary hover:text-white text-primary border border-primary/20 font-semibold rounded-full transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                <BarChart3 className="w-4 h-4" />
                                {isLoading ? 'Cargando...' : 'Ver Resultados'}
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
