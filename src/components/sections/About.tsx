import Image from "next/image";
import { ABOUT_TEXT } from "@/lib/data";
import { Check } from "lucide-react";

export function About() {
    return (
        <section id="nosotros" className="py-24 bg-secondary/30 relative overflow-hidden">
            <div className="container mx-auto px-4 md:px-6">
                <div className="flex flex-col lg:flex-row items-center gap-16">
                    {/* Text Content */}
                    <div className="flex-1 space-y-8 order-2 lg:order-1">
                        <h2 className="text-3xl md:text-5xl font-bold text-primary tracking-tight">
                            {ABOUT_TEXT.title}
                        </h2>
                        <h3 className="text-xl text-accent-foreground/80 font-medium">
                            {ABOUT_TEXT.subtitle}
                        </h3>
                        <p className="text-lg text-muted-foreground leading-relaxed font-light">
                            {ABOUT_TEXT.description}
                        </p>

                        <div className="bg-card p-6 rounded-xl shadow-sm border border-border/50">
                            <p className="italic text-foreground/80 mb-4">"{ABOUT_TEXT.mission}"</p>
                            <div className="space-y-2">
                                <p className="font-semibold text-primary">{ABOUT_TEXT.doctor}</p>
                                <ul className="space-y-1 text-sm text-muted-foreground">
                                    {ABOUT_TEXT.credentials.map((cred, i) => (
                                        <li key={i} className="flex items-center gap-2">
                                            <Check className="w-4 h-4 text-accent" />
                                            {cred}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>

                    {/* Image Content */}
                    <div className="flex-1 order-1 lg:order-2 relative">
                        <div className="relative aspect-square md:aspect-[4/5] w-full max-w-md mx-auto">
                            {/* Decorative background blob or shape could go here */}
                            <div className="absolute inset-0 bg-primary/10 rounded-full transform translate-x-4 translate-y-4 blur-3xl z-0" />
                            <div className="relative z-10 w-full h-full rounded-2xl overflow-hidden shadow-2xl">
                                {/* Reusing hero background or another placeholder for now, since I only generated one. 
                     Ideally I'd generate another specific one for 'About', but reusing fits the 'placeholder' requirement if needed. 
                     Alternatively, I can just use a color block or the same image. I'll use the same hero bg for visual consistency for now. */}
                                <Image
                                    src="/merrash_center_hp.png"
                                    alt="Merrash Center"
                                    fill
                                    className="object-cover hover:scale-105 transition-transform duration-700"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
