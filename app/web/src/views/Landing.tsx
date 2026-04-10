'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { client } from '@/lib/api';
import Navbar from '@/views/landing/Navbar';
import HeroSection from '@/views/landing/HeroSection';

const SectionSkeleton = () => (
  <div className="w-full h-96 animate-pulse bg-slate-800/30 rounded-xl my-2" />
);

const OnboardingPopup = dynamic(() => import('@/views/landing/OnboardingPopup'), { ssr: false });
const FoodScanDemoSection = dynamic(() => import('@/views/landing/FoodScanDemoSection'), { ssr: false, loading: SectionSkeleton });
const MobileAppSection = dynamic(() => import('@/views/landing/MobileAppSection'), { ssr: false, loading: SectionSkeleton });
const FeaturesSection = dynamic(() => import('@/views/landing/FeaturesSection'), { ssr: false, loading: SectionSkeleton });
const AIModelsSection = dynamic(() => import('@/views/landing/AIModelsSection'), { ssr: false, loading: SectionSkeleton });
const FAQSection = dynamic(() => import('@/views/landing/FAQSection'), { ssr: false, loading: SectionSkeleton });
const PricingSection = dynamic(() => import('@/views/landing/PricingSection'), { ssr: false, loading: SectionSkeleton });
const CTASection = dynamic(() => import('@/views/landing/CTASection'), { ssr: false, loading: SectionSkeleton });
const Footer = dynamic(() => import('@/views/landing/Footer'), { ssr: false });

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
