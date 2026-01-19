import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

const outfit = Outfit({ subsets: ["latin"] });

export const metadata: Metadata = {
    title: "Merrash - Medicina Alternativa y Spa Integral",
    description: "Equilibrio y bienestar integral. Acupuntura, Spa, Homeopatía y más en Metepec.",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="es">
            <body className={cn(outfit.className, "antialiased min-h-screen bg-background")}>
                {children}
            </body>
        </html>
    );
}
