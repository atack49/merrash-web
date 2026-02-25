import { Component, Heart, Leaf, Sparkles, Sun, Users, Activity, Gem, ScanFace, Smile, Stethoscope, Zap, Wand2, TreePine } from "lucide-react";

// CONTACT_INFO removed: now fetched from DB

export const SERVICES = [
    // CUERPO
    {
        id: "acupuntura",
        title: "Acupuntura",
        description: "Técnica milenaria para restaurar el flujo de energía y aliviar dolor.",
        icon: Activity,
        category: "Cuerpo",
        active: true
    },
    {
        id: "homeopatia",
        title: "Homeopatía",
        description: "Medicina suave y natural para estimular la autocuración.",
        icon: Component,
        category: "Cuerpo",
        active: true
    },
    {
        id: "rehabilitacion",
        title: "Rehabilitación",
        description: "Terapias físicas personalizadas para tu recuperación.",
        icon: Users,
        category: "Cuerpo",
        active: true
    },
    {
        id: "auriculoterapia",
        title: "Auriculoterapia",
        description: "Estimulación de puntos en la oreja para tratar diversas condiciones.",
        icon: Stethoscope,
        category: "Cuerpo",
        active: true
    },
    {
        id: "biomagnetismo",
        title: "Par Biomagnético",
        description: "Equilibrio del pH corporal mediante el uso de imanes.",
        icon: Activity,
        category: "Cuerpo",
        active: true
    },
    {
        id: "terapia-neural",
        title: "Terapia Neural",
        description: "Estimulación de puntos clave para equilibrar el sistema nervioso.",
        icon: Zap,
        category: "Cuerpo",
        active: true
    },
    {
        id: "sueroterapia",
        title: "Sueroterapia Intravenosa",
        description: "Terapia de sueros y complementos vía intravenosa para revitalización.",
        icon: Activity,
        category: "Cuerpo",
        active: true
    },
    {
        id: "faciales",
        title: "Tratamientos Faciales",
        description: "Limpieza y rejuvenecimiento para una piel radiante.",
        icon: ScanFace,
        category: "Cuerpo",
        active: true
    },
    {
        id: "corporales",
        title: "Tratamientos Corporales",
        description: "Reductivos, reafirmantes y cuidado integral de la piel.",
        icon: Gem,
        category: "Cuerpo",
        active: true
    },
    {
        id: "masajes",
        title: "Masajes",
        description: "Técnicas manuales para liberar estrés y tensión muscular.",
        icon: Smile,
        category: "Cuerpo",
        active: true
    },
    // ESPÍRITU
    {
        id: "tarot",
        title: "Tarot Terapéutico",
        description: "Guía emocional y espiritual para el autoconocimiento.",
        icon: Sun,
        category: "Espíritu",
        active: true
    },
    {
        id: "reiki",
        title: "Reiki",
        description: "Canalización de energía vital para armonizar los chakras.",
        icon: Zap,
        category: "Espíritu",
        active: true
    },
    {
        id: "healy",
        title: "Healy",
        description: "Tecnología de frecuencias para el bienestar bioenergético.",
        icon: Activity,
        category: "Espíritu",
        active: true
    },
    {
        id: "toque-cuantico",
        title: "Toque Cuántico",
        description: "Técnica de sanación basada en principios cuánticos para equilibrar la energía.",
        icon: Wand2,
        category: "Espíritu",
        active: true
    },
    {
        id: "arborologia",
        title: "Arborología",
        description: "Sanación mediante la conexión con la energía de los árboles.",
        icon: TreePine,
        category: "Espíritu",
        active: true
    },
    // MENTE
    {
        id: "metodo-integral",
        title: "Método Integral",
        description: "Abordaje integral para el equilibrio mental y emocional.",
        icon: Heart,
        category: "Mente",
        active: true
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
