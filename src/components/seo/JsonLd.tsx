export function JsonLd() {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://merrash-web.vercel.app";

    const schemaData = {
        "@context": "https://schema.org",
        "@type": ["HealthAndBeautyBusiness", "MedicalBusiness", "LocalBusiness"],
        "name": "Merrash - Medicina Alternativa y Spa Integral",
        "image": `${baseUrl}/hero_background_hq.png`,
        "logo": `${baseUrl}/logo.jpg`,
        "@id": `${baseUrl}/#organization`,
        "url": baseUrl,
        "telephone": "+527221234567", // Número de contacto del centro
        "priceRange": "$$",
        "address": {
            "@type": "PostalAddress",
            "streetAddress": "Metepec",
            "addressLocality": "Metepec",
            "addressRegion": "Estado de México",
            "postalCode": "52140",
            "addressCountry": "MX"
        },
        "geo": {
            "@type": "GeoCoordinates",
            "latitude": 19.2567,
            "longitude": -99.6048
        },
        "openingHoursSpecification": [
            {
                "@type": "OpeningHoursSpecification",
                "dayOfWeek": [
                    "Monday",
                    "Tuesday",
                    "Wednesday",
                    "Thursday",
                    "Friday",
                    "Saturday"
                ],
                "opens": "09:00",
                "closes": "19:00"
            }
        ],
        "description": "Centro de medicina alternativa y spa integral en Metepec. Servicios de Acupuntura, Homeopatía, Sueroterapia, Masajes y Bienestar Integral.",
        "medicalSpecialty": [
            "Acupuncture",
            "Homeopathy",
            "HolisticMedicine"
        ],
        "sameAs": [
            "https://www.facebook.com/merrash",
            "https://www.instagram.com/merrash"
        ]
    };

    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaData) }}
        />
    );
}
