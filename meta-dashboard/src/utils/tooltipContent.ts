/**
 * Tooltip content mapping for AI Captain
 * Provides minimal, personalized explanations of technical terms
 */

type TooltipTerm = 'pixel' | 'targeting' | 'conversion_event' | 'advantage_plus' | 'budget' | 'objective' | 'headline' | 'body' | 'cta' | 'link' | 'creative' | 'location' | 'age_range' | 'gender' | 'interests' | 'audiences';
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

  headline: {
    generic: "First thing people see. Keep it short and action-oriented.",
    ecommerce: "Highlight your offer: '50% Off Today' or 'Free Shipping'",
    lead_gen: "Focus on the benefit: 'Get Your Free Guide' or 'Expert Consultation'",
    local_business: "Include your area: 'Best Pizza in Brooklyn' or 'Open Now Near You'",
    saas: "Lead with value: 'Save 10 Hours/Week' or 'Try Free for 14 Days'",
  },

  body: {
    generic: "The main text of your ad. Explain your offer clearly.",
    ecommerce: "Describe your products and why customers should buy now",
    lead_gen: "Explain what they'll get and why it's valuable",
    local_business: "Highlight what makes you special and include a call to visit",
    saas: "Focus on solving their problem, not your features",
  },

  cta: {
    generic: "The button text. 'Learn More' works for most cases.",
    ecommerce: "'Shop Now' for products, 'Get Offer' for promotions",
    lead_gen: "'Sign Up' for forms, 'Learn More' for content offers",
    local_business: "'Book Now' for appointments, 'Get Directions' for visits",
    saas: "'Sign Up' for trials, 'Learn More' for demos",
  },

  link: {
    generic: "Where people go when they click. Use your landing page.",
    ecommerce: "Link to product page or collection, not just homepage",
    lead_gen: "Link to dedicated landing page with your form",
    local_business: "Link to your booking page or location page",
    saas: "Link to signup or demo request page",
  },

  creative: {
    generic: "Your image or video. Square (1:1) works best on both platforms.",
    ecommerce: "Show your product clearly. Lifestyle images often outperform",
    lead_gen: "Use images that represent the value they'll receive",
    local_business: "Show your location, team, or satisfied customers",
    saas: "Show your product in action or happy customer testimonials",
  },

  location: {
    generic: "Where your potential customers are located.",
    ecommerce: "Target regions where you can ship to",
    lead_gen: "Focus on areas where your services are available",
    local_business: "Target your city/neighborhood + nearby areas",
    saas: "Target countries where your product is available",
  },

  age_range: {
    generic: "Age of people you want to reach. Default 18-65 covers everyone.",
    ecommerce: "Match your typical customer age group",
    lead_gen: "Focus on decision-maker ages (usually 25-54)",
    local_business: "Match your local customer demographics",
    saas: "B2B typically 25-55, consumer products vary",
  },

  gender: {
    generic: "All genders usually performs best unless you have a specific product.",
    ecommerce: "Only restrict if your product is gender-specific",
    lead_gen: "Leave as 'All' unless targeting specific demographics",
    local_business: "Match your typical customer profile",
    saas: "Usually leave as 'All' for business products",
  },

  interests: {
    generic: "Topics your ideal customers care about. Facebook finds similar people.",
    ecommerce: "Add interests related to your products and competitors",
    lead_gen: "Add interests related to your industry and services",
    local_business: "Add local interests and activities in your area",
    saas: "Add industry, job titles, and business-related interests",
  },

  audiences: {
    generic: "Your existing customer lists or website visitors.",
    ecommerce: "Use past purchasers for lookalikes, cart abandoners for retargeting",
    lead_gen: "Use email lists to find similar prospects",
    local_business: "Upload customer list to find similar locals",
    saas: "Use trial users and demo requesters for lookalikes",
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
