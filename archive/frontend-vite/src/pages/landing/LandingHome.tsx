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

type LandingHomeProps = {
  onAuthStart: () => void | Promise<void>;
};

export default function LandingHome({ onAuthStart }: LandingHomeProps) {
  return (
    <div
      style={{
        fontFamily: "'Inter', 'Space Grotesk', sans-serif",
        background: '#050d05',
        color: '#ffffff',
        overflowX: 'hidden',
      }}
    >
      <OnboardingPopup onAuthStart={onAuthStart} />
      <Navbar onAuthStart={onAuthStart} />
      <HeroSection onAuthStart={onAuthStart} />
      <FoodScanDemoSection onAuthStart={onAuthStart} />
      <MobileAppSection />
      <FeaturesSection />
      <AIModelsSection />
      <HowItWorksSection />
      <FAQSection />
      <PricingSection onAuthStart={onAuthStart} />
      <CTASection onAuthStart={onAuthStart} />
      <Footer />
    </div>
  );
}
