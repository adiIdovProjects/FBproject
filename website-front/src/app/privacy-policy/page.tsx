import React from 'react';
import { Metadata } from 'next';
import LegalPageLayout from '../../components/legal/LegalPageLayout';

export const metadata: Metadata = {
  title: 'Privacy Policy - AdsAI',
  description: 'Learn how AdsAI collects, uses, and protects your personal data. GDPR compliant.',
};

export default function PrivacyPolicyPage() {
  return (
    <LegalPageLayout title="Privacy Policy" lastUpdated="January 20, 2026">
      <p>
        At AdsAI (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;), we are committed to protecting your privacy and ensuring the security of your personal data. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform.
      </p>

      <h2>1. Data Controller</h2>
      <p>
        AdsAI Ltd. is the data controller responsible for your personal data. If you have questions about this policy or our data practices, contact us at:
      </p>
      <ul>
        <li>Email: privacy@adsai.com</li>
        <li>Address: Tel Aviv, Israel</li>
      </ul>

      <h2>2. Information We Collect</h2>

      <h3>2.1 Information You Provide</h3>
      <ul>
        <li><strong>Account Information:</strong> Name, email address, company name, and password when you register</li>
        <li><strong>Payment Information:</strong> Billing address and payment details (processed securely by our payment provider)</li>
        <li><strong>Communications:</strong> Messages you send us via support or contact forms</li>
      </ul>

      <h3>2.2 Information from Facebook/Meta</h3>
      <p>
        When you connect your Facebook Ads account, we access:
      </p>
      <ul>
        <li>Ad account IDs and names</li>
        <li>Campaign, ad set, and ad performance data</li>
        <li>Audience insights and demographic data (aggregated)</li>
        <li>Creative assets (images, videos, ad copy)</li>
      </ul>
      <p>
        <strong>Important:</strong> We do not access or store personal data of individuals who interact with your ads. We only process aggregated, anonymized performance metrics.
      </p>

      <h3>2.3 Automatically Collected Information</h3>
      <ul>
        <li><strong>Usage Data:</strong> Pages visited, features used, and actions taken</li>
        <li><strong>Device Information:</strong> Browser type, operating system, device identifiers</li>
        <li><strong>Log Data:</strong> IP address, access times, referring URLs</li>
        <li><strong>Cookies:</strong> See our <a href="/cookie-policy">Cookie Policy</a> for details</li>
      </ul>

      <h2>3. Legal Basis for Processing (GDPR)</h2>
      <p>We process your personal data based on:</p>
      <ul>
        <li><strong>Contract Performance:</strong> To provide our services as agreed in our Terms of Service</li>
        <li><strong>Legitimate Interests:</strong> To improve our services, prevent fraud, and ensure security</li>
        <li><strong>Consent:</strong> For marketing communications and non-essential cookies</li>
        <li><strong>Legal Obligation:</strong> To comply with applicable laws and regulations</li>
      </ul>

      <h2>4. How We Use Your Information</h2>
      <ul>
        <li>Provide, maintain, and improve our platform</li>
        <li>Generate AI-powered insights and analytics</li>
        <li>Process payments and manage subscriptions</li>
        <li>Send service-related communications</li>
        <li>Respond to support requests</li>
        <li>Detect and prevent fraud or abuse</li>
        <li>Comply with legal obligations</li>
      </ul>

      <h2>5. Data Sharing and Disclosure</h2>
      <p>We may share your data with:</p>
      <ul>
        <li><strong>Service Providers:</strong> Cloud hosting (AWS/GCP), payment processors, analytics providers</li>
        <li><strong>AI Providers:</strong> Google Gemini API for generating insights (data is processed per their privacy policy)</li>
        <li><strong>Legal Requirements:</strong> When required by law, court order, or governmental authority</li>
        <li><strong>Business Transfers:</strong> In connection with mergers, acquisitions, or asset sales</li>
      </ul>
      <p>
        <strong>We never sell your personal data to third parties.</strong>
      </p>

      <h2>6. International Data Transfers</h2>
      <p>
        Your data may be transferred to and processed in countries outside your residence, including the United States. We ensure appropriate safeguards through:
      </p>
      <ul>
        <li>Standard Contractual Clauses (SCCs) approved by the European Commission</li>
        <li>Data Processing Agreements with all processors</li>
        <li>Compliance with EU-US Data Privacy Framework where applicable</li>
      </ul>

      <h2>7. Data Retention</h2>
      <p>We retain your data for:</p>
      <ul>
        <li><strong>Account Data:</strong> Duration of your account plus 30 days after deletion request</li>
        <li><strong>Analytics Data:</strong> Up to 3 years to enable historical comparisons</li>
        <li><strong>Payment Records:</strong> As required by tax and accounting laws (typically 7 years)</li>
        <li><strong>Support Communications:</strong> 2 years from last interaction</li>
      </ul>

      <h2>8. Your Rights (GDPR & CCPA)</h2>
      <p>You have the right to:</p>
      <ul>
        <li><strong>Access:</strong> Request a copy of your personal data</li>
        <li><strong>Rectification:</strong> Correct inaccurate or incomplete data</li>
        <li><strong>Erasure:</strong> Request deletion of your data (&quot;right to be forgotten&quot;)</li>
        <li><strong>Portability:</strong> Receive your data in a machine-readable format</li>
        <li><strong>Restriction:</strong> Limit how we process your data</li>
        <li><strong>Objection:</strong> Object to processing based on legitimate interests</li>
        <li><strong>Withdraw Consent:</strong> Withdraw consent at any time for consent-based processing</li>
        <li><strong>Non-Discrimination:</strong> Exercise your rights without discriminatory treatment (CCPA)</li>
      </ul>
      <p>
        To exercise these rights, email us at <a href="mailto:privacy@adsai.com">privacy@adsai.com</a> or use our <a href="/data-request">Data Request Form</a>.
      </p>

      <h2>9. Security Measures</h2>
      <p>We implement industry-standard security measures including:</p>
      <ul>
        <li>TLS/SSL encryption for data in transit</li>
        <li>AES-256 encryption for data at rest</li>
        <li>Regular security audits and penetration testing</li>
        <li>Access controls and authentication</li>
        <li>Employee security training</li>
      </ul>

      <h2>10. Children&apos;s Privacy</h2>
      <p>
        Our services are not directed to individuals under 16. We do not knowingly collect personal data from children. If we learn we have collected such data, we will delete it promptly.
      </p>

      <h2>11. Third-Party Links</h2>
      <p>
        Our platform may contain links to third-party websites. We are not responsible for their privacy practices. We encourage you to review their privacy policies.
      </p>

      <h2>12. Changes to This Policy</h2>
      <p>
        We may update this Privacy Policy periodically. We will notify you of material changes via email or prominent notice on our platform. Continued use after changes constitutes acceptance.
      </p>

      <h2>13. Contact Us</h2>
      <p>For privacy-related inquiries:</p>
      <ul>
        <li><strong>Email:</strong> privacy@adsai.com</li>
        <li><strong>Data Protection Officer:</strong> dpo@adsai.com</li>
      </ul>
      <p>
        You also have the right to lodge a complaint with your local data protection authority.
      </p>
    </LegalPageLayout>
  );
}
