'use client';

import Script from 'next/script';

/**
 * Sienna Accessibility Widget
 * Free, open-source accessibility widget for WCAG compliance
 * https://github.com/bennyluk/Sienna-Accessibility-Widget
 */
export default function AccessibilityWidget() {
  return (
    <Script
      src="https://cdn.jsdelivr.net/gh/nicholasrmiller/Sienna-Accessibility-Widget@main/sienna.min.js"
      strategy="lazyOnload"
      id="sienna-accessibility-widget"
    />
  );
}
