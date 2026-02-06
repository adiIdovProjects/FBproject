/**
 * Smart recommendations for AI Captain
 * Budget, CTA, and age range suggestions based on objective
 */

// Budget recommendations by objective
export interface BudgetRecommendation {
  min: number;
  recommended: number;
  reasonKey: string; // i18n key
}

export const BUDGET_BY_OBJECTIVE: Record<string, BudgetRecommendation> = {
  SALES: { min: 15, recommended: 25, reasonKey: 'captain.budget_reason_sales' },
  LEADS: { min: 10, recommended: 20, reasonKey: 'captain.budget_reason_leads' },
  TRAFFIC: { min: 5, recommended: 10, reasonKey: 'captain.budget_reason_traffic' },
  ENGAGEMENT: { min: 5, recommended: 10, reasonKey: 'captain.budget_reason_engagement' },
  WHATSAPP: { min: 10, recommended: 15, reasonKey: 'captain.budget_reason_whatsapp' },
  CALLS: { min: 10, recommended: 15, reasonKey: 'captain.budget_reason_calls' },
};

// CTA recommendations by objective (in priority order)
export const CTA_BY_OBJECTIVE: Record<string, string[]> = {
  SALES: ['SHOP_NOW', 'GET_OFFER', 'LEARN_MORE'],
  LEADS: ['SIGN_UP', 'LEARN_MORE', 'CONTACT_US'],
  TRAFFIC: ['LEARN_MORE', 'SHOP_NOW'],
  ENGAGEMENT: ['LEARN_MORE'],
  WHATSAPP: ['CONTACT_US'],
  CALLS: ['CONTACT_US'],
};

// Age range suggestions by objective
export interface AgeRangeSuggestion {
  min: number;
  max: number;
  labelKey: string; // i18n key
}

export const AGE_BY_OBJECTIVE: Record<string, AgeRangeSuggestion> = {
  SALES: { min: 25, max: 54, labelKey: 'captain.age_suggestion_sales' },
  LEADS: { min: 25, max: 55, labelKey: 'captain.age_suggestion_leads' },
  TRAFFIC: { min: 18, max: 65, labelKey: 'captain.age_suggestion_traffic' },
  ENGAGEMENT: { min: 18, max: 44, labelKey: 'captain.age_suggestion_engagement' },
  WHATSAPP: { min: 25, max: 55, labelKey: 'captain.age_suggestion_whatsapp' },
  CALLS: { min: 25, max: 54, labelKey: 'captain.age_suggestion_calls' },
};

// Example headlines by objective
export interface HeadlineExample {
  textKey: string; // i18n key
}

export const HEADLINE_EXAMPLES: Record<string, HeadlineExample[]> = {
  SALES: [
    { textKey: 'captain.example_headline_sales_1' },
    { textKey: 'captain.example_headline_sales_2' },
    { textKey: 'captain.example_headline_sales_3' },
  ],
  LEADS: [
    { textKey: 'captain.example_headline_leads_1' },
    { textKey: 'captain.example_headline_leads_2' },
    { textKey: 'captain.example_headline_leads_3' },
  ],
  TRAFFIC: [
    { textKey: 'captain.example_headline_traffic_1' },
    { textKey: 'captain.example_headline_traffic_2' },
  ],
  ENGAGEMENT: [
    { textKey: 'captain.example_headline_engagement_1' },
    { textKey: 'captain.example_headline_engagement_2' },
  ],
  WHATSAPP: [
    { textKey: 'captain.example_headline_whatsapp_1' },
    { textKey: 'captain.example_headline_whatsapp_2' },
  ],
  CALLS: [
    { textKey: 'captain.example_headline_calls_1' },
    { textKey: 'captain.example_headline_calls_2' },
  ],
};

// Body text examples by objective
export const BODY_EXAMPLES: Record<string, HeadlineExample[]> = {
  SALES: [
    { textKey: 'captain.example_body_sales_1' },
    { textKey: 'captain.example_body_sales_2' },
  ],
  LEADS: [
    { textKey: 'captain.example_body_leads_1' },
    { textKey: 'captain.example_body_leads_2' },
  ],
  TRAFFIC: [
    { textKey: 'captain.example_body_traffic_1' },
  ],
  ENGAGEMENT: [
    { textKey: 'captain.example_body_engagement_1' },
  ],
  WHATSAPP: [
    { textKey: 'captain.example_body_whatsapp_1' },
  ],
  CALLS: [
    { textKey: 'captain.example_body_calls_1' },
  ],
};

// Get budget recommendation for objective
export function getBudgetRecommendation(objective: string): BudgetRecommendation {
  return BUDGET_BY_OBJECTIVE[objective] || { min: 5, recommended: 15, reasonKey: 'captain.budget_reason_default' };
}

// Get recommended CTAs for objective (first one is most recommended)
export function getRecommendedCTAs(objective: string): string[] {
  return CTA_BY_OBJECTIVE[objective] || ['LEARN_MORE'];
}

// Get age range suggestion for objective
export function getAgeRangeSuggestion(objective: string): AgeRangeSuggestion {
  return AGE_BY_OBJECTIVE[objective] || { min: 18, max: 65, labelKey: 'captain.age_suggestion_default' };
}

// Check if a CTA is recommended for the objective
export function isCTARecommended(cta: string, objective: string): boolean {
  const recommended = CTA_BY_OBJECTIVE[objective] || [];
  return recommended.length > 0 && recommended[0] === cta;
}

// Get headline examples for objective
export function getHeadlineExamples(objective: string): HeadlineExample[] {
  return HEADLINE_EXAMPLES[objective] || HEADLINE_EXAMPLES['SALES'];
}

// Get body text examples for objective
export function getBodyExamples(objective: string): HeadlineExample[] {
  return BODY_EXAMPLES[objective] || BODY_EXAMPLES['SALES'];
}
