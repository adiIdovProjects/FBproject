'use client';

import {
  Hero,
  PainPoints,
  HowItWorks,
  Features,
  Testimonials,
  FAQ,
  AgencyComparison,
  LandingNavbar,
  LandingFooter,
  AccessibilityWidget,
} from '@/components/landing';

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-[#101622]">
      <LandingNavbar />
      <main className="flex-1">
        <Hero />
        <PainPoints />
        <HowItWorks />
        <AgencyComparison />
        <Features />
        <Testimonials />
        <FAQ />
      </main>
      <LandingFooter />
      {/* Sienna Accessibility Widget - WCAG 2.1 & Israeli Standard 5568 */}
      <AccessibilityWidget />
    </div>
  );
}
