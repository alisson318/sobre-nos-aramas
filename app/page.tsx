import MorphHeroSection from "@/components/MorphHeroSection";
import HistoryGallerySection from "@/components/HistoryGallerySection";
import { CircularTestimonials } from "@/components/ui/circular-testimonials";
import { ImageStreamHero } from "@/components/ui/image-stream-hero";
import OrbitDeliveryHero from "@/components/ui/orbit-delivery-hero";
import Timeline from "@/components/ui/timeline";

// Automatically generate the array for the 10 local images
const DESTINATION_IMAGES = Array.from({ length: 10 }, (_, i) => ({
  src: `/destino-${i + 1}.jpg`,
  alt: `Destino Aramas Tur ${i + 1}`,
}));

const teamTestimonials = [
  {
    name: "Layza Filipim",
    designation: "Auxiliar Administrativo",
    quote:
      "Apaixonada por turismo desde pequena, Layza adora trabalhar com pessoas e fazer parte da realização de sonhos e da criação de novas memórias em cada viagem.",
    src: "/layza-filipim.webp",
  },
  {
    name: "Cleide Botan Filipim",
    designation: "Agente de Turismo",
    quote:
      "Com o ônibus como sua segunda casa, Cleide é apaixonada por estradas e novas aventuras. Comunicativa, adora descobrir novos destinos e partilhar histórias com todos.",
    src: "/cleide-botan.jpeg",
  },
  {
    name: "Cleonice de Souza",
    designation: "Agente de Turismo",
    quote:
      "Conhecida com carinho como a cozinheira das nossas excursões, Cleonice ama cuidar das pessoas e preparar comidas deliciosas para tornar cada viagem inesquecível.",
    src: "/cleonice-souza.jpeg",
  },
  {
    name: "Layson Filipim",
    designation: "Administrador",
    quote:
      "Crescido em uma família de empreendedores do turismo, Layson gere a empresa com dedicação, garantindo que tudo funcione perfeitamente e dando suporte total à equipe.",
    src: "/layson-filipim.jpeg",
  },
  {
    name: "Kate Filipim",
    designation: "Auxiliar Administrativo",
    quote:
      "Dedicada e prestativa, Kate encontrou no turismo a sua verdadeira paixão. Está sempre pronta para ajudar a equipe e proporcionar a melhor experiência aos clientes.",
    src: "/kate-filipim.jpeg",
  },
  {
    name: "Cleuza de Souza",
    designation: "Agente de Turismo",
    quote:
      "Com uma longa história nas estradas e uma paixão eterna pelo turismo, Cleuza traz para o dia a dia da agência toda a sua experiência, carinho e dedicação.",
    src: "/cleuza-souza.jpeg",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen w-full bg-black">
      <MorphHeroSection />

      {/* Intro to Timeline */}
      <section className="flex h-[70vh] flex-col items-center justify-center gap-6 px-6 text-center bg-zinc-50 dark:bg-zinc-950">
        <p className="font-mono text-xs md:text-sm uppercase tracking-[0.3em] text-gray-500">
          Nossa Trajetória
        </p>
        <h2 className="max-w-[20ch] text-5xl md:text-7xl font-bold leading-tight tracking-tight text-black dark:text-white">
          Mais de 30 anos, uma única estrada.
        </h2>
        <p className="max-w-2xl text-base md:text-lg text-gray-600 dark:text-gray-400 mt-4">
          Continue rolando. Acompanhe a nossa história, desde as primeiras
          excursões de compras até os milhares de sonhos realizados a bordo.
        </p>
      </section>

      {/* The Timeline Component */}
      <Timeline
        title="A Nossa História"
        periodLabel="1990 — 2026"
        backgroundColor="#fafafa"
        textColor="#000000"
        mutedTextColor="#52525b"
        activeColor="#ea580c"
        imageUrl="/historia-capa.jpg"
        imageAlt="História da Aramas Tur"
        duration={1.4}
      />

      <section className="bg-white py-20 w-full flex justify-center items-center overflow-hidden">
        <div className="w-full max-w-[1456px] flex justify-center">
          <CircularTestimonials
            testimonials={teamTestimonials}
            autoplay={true}
            colors={{
              name: "#0a0a0a",
              designation: "#454545",
              testimony: "#171717",
              arrowBackground: "#f1f1f7",
              arrowForeground: "#141414",
              arrowHoverBackground: "#e5e5e5",
            }}
            fontSizes={{
              name: "24px",
              designation: "16px",
              quote: "18px",
            }}
          />
        </div>
      </section>

      {/* New 3D Image Stream Section */}
      <section className="relative z-10 w-full bg-white pt-10 pb-10">
        <ImageStreamHero
          images={DESTINATION_IMAGES}
          className="h-[600px] w-full md:h-[800px]"
        >
          {/* Changed to justify-between to push text to top and bottom, removed dark overlay */}
          <div className="pointer-events-none relative z-10 flex h-full flex-col items-center justify-between py-12 text-center md:py-20">
            {/* Top Text */}
            <div className="px-6">
              <h2 className="text-balance text-4xl md:text-6xl font-bold tracking-tight text-black">
                Conheça o melhor do Brasil
                <br />
                viajando com a Aramas.
              </h2>
            </div>

            {/* Bottom Text */}
            <p className="max-w-2xl text-balance px-6 text-base tracking-wide text-gray-600 md:text-lg">
              Descubra os melhores roteiros rodoviários com quem tem mais de 30
              anos de estrada.
            </p>
          </div>
        </ImageStreamHero>
      </section>

      <HistoryGallerySection />

      <OrbitDeliveryHero />
    </main>
  );
}
