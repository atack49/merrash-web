import { auth, signOut } from '@/auth';
import { getSurveys } from '@/lib/persistence';
import { redirect } from 'next/navigation';
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

export default async function AdminPage() {
    const session = await auth();

    if (!session) {
        redirect('/login');
    }

    const surveys = await getSurveys();
    const sortedSurveys = [...surveys].reverse(); // Newest first

    return (
        <div className="flex flex-col min-h-screen bg-gray-50">
            <Header />
            <main className="flex-grow container mx-auto px-4 py-8">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Panel de Administración</h1>
                        <p className="text-gray-500">Bienvenido, {session?.user?.name}</p>
                    </div>
                    <form
                        action={async () => {
                            'use server';
                            await signOut();
                        }}
                    >
                        <button
                            type="submit"
                            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                        >
                            Cerrar Sesión
                        </button>
                    </form>
                </div>

                <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                    <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
                        <h3 className="text-lg leading-6 font-medium text-gray-900">
                            Resultados de Encuestas ({surveys.length})
                        </h3>
                    </div>

                    {sortedSurveys.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                            No hay encuestas registradas aún.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Respuestas</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {sortedSurveys.map((survey) => (
                                        <tr key={survey.id}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {new Date(survey.createdAt).toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 capitalize">
                                                {survey.type}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-500">
                                                <div className="max-w-xl overflow-hidden text-ellipsis">
                                                    {/* Simple JSON dump for now, or cleaner formatting */}
                                                    <pre className="whitespace-pre-wrap font-sans text-xs">
                                                        {JSON.stringify(survey.data, null, 2)}
                                                    </pre>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </main>
            <Footer />
        </div>
    );
}
