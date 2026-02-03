/**
 * Tooltip content mapping for AI Captain
 * Provides minimal, personalized explanations of technical terms
 */

type TooltipTerm = 'pixel' | 'targeting' | 'conversion_event' | 'advantage_plus' | 'budget' | 'objective';
type BusinessType = 'ecommerce' | 'lead_gen' | 'saas' | 'local_business' | 'agency' | 'media' | 'nonprofit' | 'other';

interface TooltipContent {
  generic: string;
  [key: string]: string; // Business-specific variations
}

const tooltips: Record<TooltipTerm, TooltipContent> = {
  pixel: {
    generic: "Tracks actions after ad clicks (e.g., purchases, signups)",
    ecommerce: "Tracks purchases on your store after someone clicks your ad",
    lead_gen: "Tracks form submissions or contact requests from your ads",
    local_business: "Tracks visits, calls, or bookings from your ads",
    saas: "Tracks trial signups or demo requests from your ads",
  },

  targeting: {
    generic: "Who sees your ad (age, location, interests)",
    ecommerce: "Define who sees your products (location, interests, demographics)",
    lead_gen: "Choose your ideal customer profile (age, location, interests)",
    local_business: "Target people near your location with specific interests",
    saas: "Target professionals or businesses that match your ideal customer",
  },

  conversion_event: {
    generic: "The action you want (e.g., Purchase, Lead, Sign Up)",
    ecommerce: "What you want customers to do (e.g., Complete Purchase, Add to Cart)",
    lead_gen: "The goal of your ad (e.g., Submit Form, Contact Us, Download)",
    local_business: "Your desired outcome (e.g., Get Directions, Call, Book Appointment)",
    saas: "What success looks like (e.g., Start Trial, Request Demo, Sign Up)",
  },

  advantage_plus: {
    generic: "Facebook finds best audience automatically",
    ecommerce: "Facebook shows your products to people likely to buy",
    lead_gen: "Facebook finds people interested in your offer automatically",
    local_business: "Facebook targets people near you who match your customer profile",
    saas: "Facebook finds decision-makers interested in your solution",
  },

  budget: {
    generic: "How much you spend per day on this campaign",
    ecommerce: "Daily ad spend - start with $10-20 to test what works",
    lead_gen: "Cost per day - expect 5-15 leads per week at $15/day",
    local_business: "Daily budget - $10-15 typically reaches 200-500 locals per day",
    saas: "Daily spend - B2B ads often need $20-50/day for good results",
  },

  objective: {
    generic: "What you want people to do after seeing your ad",
    ecommerce: "Sales = Track purchases | Traffic = Send people to browse",
    lead_gen: "Leads = Collect contacts | Engagement = Build awareness",
    local_business: "Store Visits = Drive foot traffic | Leads = Get calls/messages",
    saas: "Leads = Capture emails | Traffic = Drive website visits",
  },
};

/**
 * Get personalized tooltip content based on business type
 * Falls back to generic if no business-specific version exists
 */
export function getPersonalizedTooltip(
  term: TooltipTerm,
  businessType?: BusinessType | null
): string {
  const tooltip = tooltips[term];

  if (!tooltip) {
    return "Learn more about this setting";
  }

  // Return business-specific version if available
  if (businessType && tooltip[businessType]) {
    return tooltip[businessType];
  }

  // Fall back to generic
  return tooltip.generic;
}
