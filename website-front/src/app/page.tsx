'use client';

import React from 'react';
import Hero from '@/components/Hero';
import HowItWorks from '@/components/HowItWorks';
import Features from '@/components/Features';
import Testimonials from '@/components/Testimonials';
import Pricing from '@/components/Pricing';
import FAQ from '@/components/FAQ';

export default function AdsAILandingPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Hero />
      <HowItWorks />
      <Features />
      <Testimonials />
      <Pricing />
      <FAQ />
    </div>
  );
}
