'use client';

import {
  Hero,
  HowItWorks,
  Features,
  Testimonials,
  FAQ,
  AgencyComparison,
  LandingNavbar,
  LandingFooter,
} from '@/components/landing';

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-[#101622]">
      <LandingNavbar />
      <main className="flex-1">
        <Hero />
        <HowItWorks />
        <AgencyComparison />
        <Features />
        <Testimonials />
        <FAQ />
      </main>
      <LandingFooter />
    </div>
  );
}
