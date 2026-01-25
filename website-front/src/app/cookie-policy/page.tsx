import React from 'react';
import { Metadata } from 'next';
import LegalPageLayout from '../../components/legal/LegalPageLayout';

export const metadata: Metadata = {
  title: 'Cookie Policy - AdsAI',
  description: 'Learn about how AdsAI uses cookies and similar technologies.',
};

export default function CookiePolicyPage() {
  return (
    <LegalPageLayout title="Cookie Policy" lastUpdated="January 20, 2026">
      <p>
        This Cookie Policy explains how AdsAI (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) uses cookies and similar technologies when you visit our website and use our platform. It explains what these technologies are, why we use them, and your rights to control their use.
      </p>

      <h2>1. What Are Cookies?</h2>
      <p>
        Cookies are small text files stored on your device (computer, tablet, or mobile) when you visit a website. They help websites remember your preferences, understand how you use the site, and improve your experience.
      </p>
      <p>
        Similar technologies include:
      </p>
      <ul>
        <li><strong>Local Storage:</strong> Data stored in your browser that persists until cleared</li>
        <li><strong>Session Storage:</strong> Temporary data cleared when you close your browser</li>
        <li><strong>Pixels/Web Beacons:</strong> Small images that track page views and actions</li>
      </ul>

      <h2>2. Types of Cookies We Use</h2>

      <h3>2.1 Strictly Necessary Cookies</h3>
      <p>
        These cookies are essential for the website to function and cannot be switched off. They are usually set in response to actions you take, such as logging in or setting privacy preferences.
      </p>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 dark:border-slate-700">
            <th className="text-left py-2">Cookie Name</th>
            <th className="text-left py-2">Purpose</th>
            <th className="text-left py-2">Duration</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-slate-100 dark:border-slate-800">
            <td className="py-2">auth_token</td>
            <td>Authentication session</td>
            <td>Session / 30 days</td>
          </tr>
          <tr className="border-b border-slate-100 dark:border-slate-800">
            <td className="py-2">cookie_consent</td>
            <td>Stores your cookie preferences</td>
            <td>1 year</td>
          </tr>
          <tr className="border-b border-slate-100 dark:border-slate-800">
            <td className="py-2">csrf_token</td>
            <td>Security - prevents cross-site attacks</td>
            <td>Session</td>
          </tr>
        </tbody>
      </table>

      <h3>2.2 Performance/Analytics Cookies</h3>
      <p>
        These cookies help us understand how visitors interact with our website by collecting anonymous, aggregated information. This helps us improve our platform.
      </p>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 dark:border-slate-700">
            <th className="text-left py-2">Cookie Name</th>
            <th className="text-left py-2">Purpose</th>
            <th className="text-left py-2">Duration</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-slate-100 dark:border-slate-800">
            <td className="py-2">_ga</td>
            <td>Google Analytics - distinguishes users</td>
            <td>2 years</td>
          </tr>
          <tr className="border-b border-slate-100 dark:border-slate-800">
            <td className="py-2">_gid</td>
            <td>Google Analytics - distinguishes users</td>
            <td>24 hours</td>
          </tr>
          <tr className="border-b border-slate-100 dark:border-slate-800">
            <td className="py-2">_gat</td>
            <td>Google Analytics - throttles requests</td>
            <td>1 minute</td>
          </tr>
        </tbody>
      </table>

      <h3>2.3 Functional Cookies</h3>
      <p>
        These cookies enable enhanced functionality and personalization, such as remembering your language preference or display settings.
      </p>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 dark:border-slate-700">
            <th className="text-left py-2">Cookie Name</th>
            <th className="text-left py-2">Purpose</th>
            <th className="text-left py-2">Duration</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-slate-100 dark:border-slate-800">
            <td className="py-2">locale</td>
            <td>Remembers your language preference</td>
            <td>1 year</td>
          </tr>
          <tr className="border-b border-slate-100 dark:border-slate-800">
            <td className="py-2">theme</td>
            <td>Remembers dark/light mode preference</td>
            <td>1 year</td>
          </tr>
        </tbody>
      </table>

      <h3>2.4 Marketing/Targeting Cookies</h3>
      <p>
        These cookies track your browsing activity to deliver relevant advertisements. They may be set by our advertising partners.
      </p>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 dark:border-slate-700">
            <th className="text-left py-2">Cookie Name</th>
            <th className="text-left py-2">Purpose</th>
            <th className="text-left py-2">Duration</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-slate-100 dark:border-slate-800">
            <td className="py-2">_fbp</td>
            <td>Meta Pixel - tracks conversions</td>
            <td>3 months</td>
          </tr>
          <tr className="border-b border-slate-100 dark:border-slate-800">
            <td className="py-2">_fbc</td>
            <td>Meta Pixel - click tracking</td>
            <td>3 months</td>
          </tr>
        </tbody>
      </table>

      <h2>3. How to Manage Cookies</h2>

      <h3>3.1 Through Our Cookie Banner</h3>
      <p>
        When you first visit our website, you will see a cookie consent banner. You can:
      </p>
      <ul>
        <li>Accept all cookies</li>
        <li>Reject all non-essential cookies</li>
        <li>Customize your preferences by category</li>
      </ul>
      <p>
        You can change your preferences at any time by clicking &quot;Cookie Settings&quot; in the footer.
      </p>

      <h3>3.2 Through Browser Settings</h3>
      <p>
        Most browsers allow you to control cookies through settings. Common options include:
      </p>
      <ul>
        <li><strong>Chrome:</strong> Settings → Privacy and Security → Cookies</li>
        <li><strong>Firefox:</strong> Settings → Privacy & Security → Cookies</li>
        <li><strong>Safari:</strong> Preferences → Privacy → Cookies</li>
        <li><strong>Edge:</strong> Settings → Cookies and Site Permissions</li>
      </ul>
      <p>
        Note: Blocking all cookies may impact website functionality.
      </p>

      <h3>3.3 Opt-Out Links</h3>
      <p>You can opt out of specific tracking services:</p>
      <ul>
        <li><a href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noopener noreferrer">Google Analytics Opt-Out</a></li>
        <li><a href="https://www.facebook.com/settings?tab=ads" target="_blank" rel="noopener noreferrer">Facebook Ad Preferences</a></li>
        <li><a href="https://optout.aboutads.info/" target="_blank" rel="noopener noreferrer">Digital Advertising Alliance Opt-Out</a></li>
      </ul>

      <h2>4. Third-Party Cookies</h2>
      <p>
        Some cookies are placed by third-party services that appear on our pages. We do not control these cookies. Third parties include:
      </p>
      <ul>
        <li><strong>Google Analytics:</strong> <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">Privacy Policy</a></li>
        <li><strong>Meta (Facebook):</strong> <a href="https://www.facebook.com/privacy/explanation" target="_blank" rel="noopener noreferrer">Privacy Policy</a></li>
      </ul>

      <h2>5. Meta Consent Mode</h2>
      <p>
        We implement Meta Consent Mode to respect your privacy choices. When you decline marketing cookies:
      </p>
      <ul>
        <li>Meta Pixel will not track your activity</li>
        <li>No personal data is sent to Meta for advertising purposes</li>
        <li>Conversion tracking operates in privacy-safe mode using aggregated data</li>
      </ul>

      <h2>6. Do Not Track</h2>
      <p>
        Some browsers offer a &quot;Do Not Track&quot; (DNT) signal. Currently, there is no industry standard for DNT. Our site does not currently respond to DNT signals, but you can use our cookie banner to control tracking.
      </p>

      <h2>7. Updates to This Policy</h2>
      <p>
        We may update this Cookie Policy to reflect changes in technology, regulation, or our practices. We will update the &quot;Last updated&quot; date and notify you of material changes.
      </p>

      <h2>8. Contact Us</h2>
      <p>
        If you have questions about our use of cookies:
      </p>
      <ul>
        <li><strong>Email:</strong> privacy@adsai.com</li>
        <li><strong>Address:</strong> [Your Business Address]</li>
      </ul>
      <p>
        For more information about how we handle your personal data, please see our <a href="/privacy-policy">Privacy Policy</a>.
      </p>
    </LegalPageLayout>
  );
}
