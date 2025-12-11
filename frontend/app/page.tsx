import Hero from "@/components/Hero";
import Features from "@/components/Features";
import Steps from "@/components/Steps";
import Footer from "@/components/Footer";
import "./styles/home.css";

export default function HomePage() {
  return (
    <div className="home-root">
      <Hero />
      <Features />
      <Steps />
      <Footer />
    </div>
  );
}
