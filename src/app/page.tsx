import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Hero } from "@/components/sections/Hero";
import { About } from "@/components/sections/About";
import { Services } from "@/components/sections/Services";
import { Testimonials } from "@/components/sections/Testimonials";
import { Contact } from "@/components/sections/Contact";
import { ChatbotWidget } from "@/components/chatbot/ChatbotWidget";

export default function Home() {
    return (
        <div className="flex flex-col min-h-screen">
            <Header />
            <main className="grow">
                <Hero />
                <About />
                <Services />
                <Testimonials />
                <Contact />
            </main>
            <Footer />
            <ChatbotWidget />
        </div>
    );
}