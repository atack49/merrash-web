import { Component, Heart, Leaf, Sparkles, Sun, Users, Activity, Gem, ScanFace, Smile, Stethoscope, Zap } from "lucide-react";

export const CONTACT_INFO = {
    address: "Av. Estado de México 433, Santiaguito, 52140 Metepec, Méx.",
    phone: ["222 238 6181", "722 495 8550", "729 165 4769"],
    email: "dramalumolina@gmail.com",
    socials: {
        facebook: "https://www.facebook.com/MerrashSpayMedicinaAlternativa",
        instagram: "https://www.instagram.com/merrashyspaintegraldebelleza/",
    },
};

export const SERVICES = [
    {
        id: "acupuntura",
        title: "Acupuntura",
        description: "Técnica milenaria para restaurar el flujo de energía y aliviar dolor.",
        icon: Activity,
        category: "Cuerpo"
    },
    {
        id: "spa",
        title: "Spa Integral",
        description: "Tratamientos relajantes para revitalizar cuerpo y mente.",
        icon: Sparkles,
        category: "Cuerpo"
    },
    {
        id: "auriculoterapia",
        title: "Auriculoterapia",
        description: "Estimulación de puntos en la oreja para tratar diversas condiciones.",
        icon: Stethoscope,
        category: "Mente"
    },
    {
        id: "tarot",
        title: "Tarot Terapéutico",
        description: "Guía emocional y espiritual para el autoconocimiento.",
        icon: Sun,
        category: "Espíritu"
    },
    {
        id: "rehabilitacion",
        title: "Rehabilitación",
        description: "Terapias físicas personalizadas para tu recuperación.",
        icon: Users,
        category: "Cuerpo"
    },
    {
        id: "nutricion",
        title: "Nutrición",
        description: "Planes alimenticios adaptados a tus necesidades de salud.",
        icon: Leaf,
        category: "Cuerpo"
    },
    {
        id: "homeopatia",
        title: "Homeopatía",
        description: "Medicina suave y natural para estimular la autocuración.",
        icon: Component,
        category: "Mente"
    },
    {
        id: "reiki",
        title: "Reiki",
        description: "Canalización de energía vital para armonizar los chakras.",
        icon: Zap,
        category: "Espíritu"
    },
    {
        id: "healy",
        title: "Dispositivo Healy",
        description: "Tecnología de frecuencias para el bienestar bioenergético.",
        icon: Activity,
        category: "Espíritu"
    },
    {
        id: "biomagnetismo",
        title: "Par Biomagnético",
        description: "Equilibrio del pH corporal mediante el uso de imanes.",
        icon: Activity,
        category: "Cuerpo"
    },
    {
        id: "faciales",
        title: "Tratamientos Faciales",
        description: "Limpieza y rejuvenecimiento para una piel radiante.",
        icon: ScanFace,
        category: "Cuerpo"
    },
    {
        id: "corporales",
        title: "Tratamientos Corporales",
        description: "Reductivos, reafirmantes y cuidado integral de la piel.",
        icon: Gem,
        category: "Cuerpo"
    },
    {
        id: "relajantes",
        title: "Masajes Relajantes",
        description: "Técnicas manuales para liberar estrés y tensión muscular.",
        icon: Smile,
        category: "Mente"
    },
];

export const ABOUT_TEXT = {
    title: "Bienvenido a Merrash",
    subtitle: "Donde la salud se encuentra con la armonía.",
    description: "En Merrash, nos dedicamos a restaurar tu equilibrio físico, mental y espiritual. Fusionamos la sabiduría de la medicina alternativa con las técnicas más avanzadas de spa para ofrecerte una experiencia de sanación integral.",
    mission: "Ofrecer servicios de salud integral de excelencia, inspirando una transformación positiva en el bienestar de nuestros pacientes.",
    doctor: "Dra. María de Lourdes Molina Olivares",
    credentials: [
        "Acupunturista Internacional Certificada (WFCMS)",
        "Especialista en Homeopatía (IPN)",
        "Médico Cirujano y Partero (BUAP)"
    ]
};

export const TESTIMONIALS = [
    {
        id: 1,
        name: "Ana García",
        text: "La acupuntura me ayudó a eliminar el dolor crónico que tenía desde hace años. ¡Increíble transformación!",
        rating: 5,
        service: "Acupuntura"
    },
    {
        id: 2,
        name: "Carlos Rodríguez",
        text: "Los tratamientos de spa son relajantes y rejuvenecedores. Me siento renovado después de cada sesión.",
        rating: 5,
        service: "Spa Integral"
    },
    {
        id: 3,
        name: "María López",
        text: "La homeopatía cambió mi vida. Finalmente encontré alivio para mis alergias sin efectos secundarios.",
        rating: 5,
        service: "Homeopatía"
    },
    {
        id: 4,
        name: "José Martínez",
        text: "El Reiki me ayudó a equilibrar mi energía y reducir el estrés diario. Recomiendo ampliamente.",
        rating: 5,
        service: "Reiki"
    },
    {
        id: 5,
        name: "Laura Sánchez",
        text: "Los masajes relajantes son perfectos para desconectar. El ambiente es muy profesional y acogedor.",
        rating: 5,
        service: "Masajes Relajantes"
    },
    {
        id: 6,
        name: "Pedro Hernández",
        text: "La nutrición personalizada me ayudó a perder peso de manera saludable y sostenible.",
        rating: 5,
        service: "Nutrición"
    }
];
