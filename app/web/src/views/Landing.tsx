'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { client } from '@/lib/api';
import OnboardingPopup from '@/views/landing/OnboardingPopup';
import Navbar from '@/views/landing/Navbar';
import HeroSection from '@/views/landing/HeroSection';
import FoodScanDemoSection from '@/views/landing/FoodScanDemoSection';
import MobileAppSection from '@/views/landing/MobileAppSection';
import FeaturesSection from '@/views/landing/FeaturesSection';
import AIModelsSection from '@/views/landing/AIModelsSection';
import FAQSection from '@/views/landing/FAQSection';
import PricingSection from '@/views/landing/PricingSection';
import CTASection from '@/views/landing/CTASection';
import Footer from '@/views/landing/Footer';

export default function Landing() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const user = await client.auth.me();
        if (user?.data) {
          router.push('/dashboard');
          return;
        }
      } catch {
        // not logged in
      }
      setLoading(false);
    };
    checkAuth();
  }, [router]);

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: '#050d05' }}
      >
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500" />
      </div>
    );
  }

  return (
    <div
      style={{
        background: '#050d05',
        color: '#ffffff',
        overflowX: 'hidden',
        minHeight: '100vh',
      }}
    >
      <OnboardingPopup />
      <Navbar />
      <HeroSection />
      <FoodScanDemoSection />
      <MobileAppSection />
      <FeaturesSection />
      <AIModelsSection />
      <FAQSection />
      <PricingSection />
      <CTASection />
      <Footer />
    </div>
  );
}
