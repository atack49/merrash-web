'use client';

import { useActionState } from 'react';
import { authenticate } from '@/app/lib/actions';
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

export default function LoginPage() {
    const [errorMessage, formAction, isPending] = useActionState(
        authenticate,
        undefined
    );

    return (
        <div className="flex flex-col min-h-screen">
            <Header />
            <main className="flex-grow flex items-center justify-center bg-gray-50 py-12 sm:px-6 lg:px-8">
                <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-lg">
                    <div>
                        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                            Iniciar Sesión
                        </h2>
                        <p className="mt-2 text-center text-sm text-gray-600">
                            Acceso exclusivo para administradores
                        </p>
                    </div>
                    <form className="mt-8 space-y-6" action={formAction}>
                        <div className="rounded-md shadow-sm -space-y-px">
                            <div>
                                <label htmlFor="username" className="sr-only">Usuario</label>
                                <input
                                    id="username"
                                    name="username"
                                    type="text"
                                    required
                                    className="appearance-none rounded-none w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm"
                                    placeholder="Usuario"
                                />
                            </div>
                            <div>
                                <label htmlFor="password" className="sr-only">Contraseña</label>
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    required
                                    className="appearance-none rounded-none w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm"
                                    placeholder="Contraseña"
                                />
                            </div>
                        </div>

                        {errorMessage && (
                            <div className="flex items-center text-red-500 text-sm">
                                <p>{errorMessage}</p>
                            </div>
                        )}

                        <div>
                            <button
                                type="submit"
                                disabled={isPending}
                                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50"
                            >
                                {isPending ? 'Cargando...' : 'Entrar'}
                            </button>
                        </div>
                    </form>
                </div>
            </main>
            <Footer />
        </div>
    );
}
