'use client';

import { useActionState } from 'react';
import { authenticate } from '@/app/lib/actions';
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Lock } from 'lucide-react';

export default function LoginPage() {
    const [errorMessage, formAction, isPending] = useActionState(
        authenticate,
        undefined
    );

    return (
        <div className="flex flex-col min-h-screen">
            <Header />
            <main className="mt-20 flex-grow flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-100 py-12 sm:px-6 lg:px-8">
                <div className="w-full max-w-md">
                    {/* Card Container */}
                    <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-100">
                        {/* Header Section */}
                        <div className="bg-gradient-to-r from-primary to-primary/80 px-8 py-12 text-center">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/20 mb-4">
                                <Lock className="w-8 h-8 text-white" />
                            </div>
                            <h2 className="text-3xl font-bold text-white mb-2">Iniciar Sesión</h2>
                            <p className="text-primary-foreground/80 text-sm">Acceso exclusivo para administradores</p>
                        </div>

                        {/* Form Section */}
                        <form className="px-8 py-10 space-y-6" action={formAction}>
                            {/* Email Field */}
                            <div className="space-y-2">
                                <label htmlFor="email" className="block text-sm font-semibold text-slate-700">
                                    Email
                                </label>
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    required
                                    className="w-full px-4 py-3 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-500 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent focus:shadow-md"
                                    placeholder="Ingresa tu correo"
                                />
                            </div>

                            {/* Password Field */}
                            <div className="space-y-2">
                                <label htmlFor="password" className="block text-sm font-semibold text-slate-700">
                                    Contraseña
                                </label>
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    required
                                    className="w-full px-4 py-3 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-500 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent focus:shadow-md"
                                    placeholder="Ingresa tu contraseña"
                                />
                            </div>

                            {errorMessage && (
                                <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                                    <div className="flex-shrink-0 text-red-600 mt-0.5">
                                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                    <p className="text-sm font-medium text-red-800">{errorMessage}</p>
                                </div>
                            )}

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={isPending}
                                className="w-full py-3 px-4 bg-gradient-to-r from-primary to-primary/80 text-white font-semibold rounded-lg hover:shadow-lg hover:from-primary/90 hover:to-primary/70 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                            >
                                {isPending ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                        Cargando...
                                    </span>
                                ) : (
                                    'Entrar'
                                )}
                            </button>
                        </form>
                    </div>

                    {/* Footer Info */}
                    <p className="text-center text-sm text-slate-600 mt-8">
                        ¿Problemas al iniciar sesión? <br/>
                        <span className="text-slate-500">Contacta al administrador</span>
                    </p>
                </div>
            </main>
            <Footer />
        </div>
    );
}
