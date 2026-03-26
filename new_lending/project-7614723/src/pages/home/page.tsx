import Navbar from './components/Navbar';
import HeroSection from './components/HeroSection';
import FoodScanDemoSection from './components/FoodScanDemoSection';
import FeaturesSection from './components/FeaturesSection';
import AIModelsSection from './components/AIModelsSection';
import HowItWorksSection from './components/HowItWorksSection';
import MobileAppSection from './components/MobileAppSection';
import FAQSection from './components/FAQSection';
import PricingSection from './components/PricingSection';
import CTASection from './components/CTASection';
import Footer from './components/Footer';
import OnboardingPopup from './components/OnboardingPopup';

export default function Home() {
  return (
    <div
      style={{
        fontFamily: "'Inter', 'Space Grotesk', sans-serif",
        background: '#050d05',
        color: '#ffffff',
        overflowX: 'hidden',
      }}
    >
      <link
        href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700;900&family=Inter:wght@400;500;600&display=swap"
        rel="stylesheet"
      />
      <OnboardingPopup />
      <Navbar />
      <HeroSection />
      <FoodScanDemoSection />
      <MobileAppSection />
      <FeaturesSection />
      <AIModelsSection />
      <HowItWorksSection />
      <FAQSection />
      <PricingSection />
      <CTASection />
      <Footer />
    </div>
  );
}
