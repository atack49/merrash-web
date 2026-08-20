import type { Metadata, Viewport } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { ThemeProvider } from "@/components/theme-provider";
import { JsonLd } from "@/components/seo/JsonLd";

const outfit = Outfit({ subsets: ["latin"] });

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://merrash-web.vercel.app";

export const metadata: Metadata = {
    metadataBase: new URL(baseUrl),
    title: {
        default: "Merrash - Medicina Alternativa y Spa Integral",
        template: "%s | Merrash"
    },
    description: "Equilibrio y bienestar integral. Acupuntura, Spa Integral, Homeopatía, Sueroterapia y Masajes Terapéuticos en Metepec.",
    keywords: [
        "Medicina Alternativa Metepec",
        "Spa Integral Metepec",
        "Acupuntura Metepec",
        "Homeopatía Toluca",
        "Sueroterapia",
        "Masajes Terapéuticos",
        "Bienestar Integral",
        "Merrash"
    ],
    authors: [{ name: "Merrash Medicina Alternativa y Spa" }],
    creator: "Merrash",
    publisher: "Merrash",
    alternates: {
        canonical: "/"
    },
    robots: {
        index: true,
        follow: true,
        googleBot: {
            index: true,
            follow: true,
            'max-image-preview': 'large',
            'max-snippet': -1,
        },
    },
    verification: {
        google: 'google1e2cdf2bd1a84454',
    },
    openGraph: {
        title: "Merrash - Medicina Alternativa y Spa Integral",
        description: "Equilibrio y bienestar integral. Acupuntura, Spa, Homeopatía, Sueroterapia y más en Metepec.",
        url: baseUrl,
        siteName: "Merrash",
        locale: "es_MX",
        type: "website",
        images: [
            {
                url: `${baseUrl}/hero_background_hq.png`,
                width: 1200,
                height: 630,
                alt: "Merrash - Medicina Alternativa y Spa Integral"
            }
        ]
    },
    twitter: {
        card: "summary_large_image",
        title: "Merrash - Medicina Alternativa y Spa Integral",
        description: "Equilibrio y bienestar integral en Metepec. Acupuntura, Spa, Homeopatía y Sueroterapia.",
        images: [`${baseUrl}/hero_background_hq.png`]
    }
};

export const viewport: Viewport = {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    interactiveWidget: "resizes-content",
};


export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="es" suppressHydrationWarning>
            <head>
                <JsonLd />
            </head>
            <body className={cn(outfit.className, "antialiased min-h-screen bg-background")}>
                <ThemeProvider
                    attribute="class"
                    defaultTheme="system"
                    enableSystem
                    disableTransitionOnChange
                >
                    {children}
                </ThemeProvider>
            </body>
        </html>
    );
}

