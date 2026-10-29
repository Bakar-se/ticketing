import { Header } from "@/components/landing/header";
import { Hero, BoardPreview } from "@/components/landing/hero";
import { Footer } from "@/components/landing/footer";
import { Features } from "@/components/landing/sections/features";
import { HowItWorks } from "@/components/landing/sections/how-it-works";
import { Tour } from "@/components/landing/sections/product-tour";
import { BuiltWith } from "@/components/landing/sections/built-with";
import { Faq } from "@/components/landing/sections/faqs";
import { Cta } from "@/components/landing/sections/cta";

export default function Page() {
  return (
    <div className="min-h-svh bg-background">
      <Header />
      <main>
        <Hero />
        <BoardPreview />
        <Features />
        <HowItWorks />
        <Tour />
        <BuiltWith />
        <Faq />
        <Cta />
      </main>
      <Footer />
    </div>
  );
}
