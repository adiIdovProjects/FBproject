# Smart Recommendations Usage Guide

## Overview
The `SmartSuggestions` component provides AI-powered recommendations for:
1. **Ad Copy** - Headlines, primary text, descriptions, and CTAs matching your brand tone
2. **Audience Targeting** - Interests, demographics, countries based on your business
3. **Creative Direction** - Visual style, content angles, ad formats, best practices

---

## Component Location
`meta-dashboard/src/components/recommendations/SmartSuggestions.tsx`

---

## Basic Usage

```tsx
import { SmartSuggestions } from '@/components/recommendations/SmartSuggestions';

function CampaignWizard() {
  const accountId = "123456789"; // Current ad account ID
  const objective = "SALES"; // Campaign objective

  const handleApplyAdCopy = (variant) => {
    // Apply the ad copy to your form
    setHeadline(variant.headline);
    setPrimaryText(variant.primary_text);
    setDescription(variant.description);
    setCTA(variant.cta);
  };

  const handleApplyAudience = (recommendations) => {
    // Apply audience targeting
    setInterests(recommendations.interests);
    setAgeRange(recommendations.age_range);
    setCountries(recommendations.countries);
  };

  return (
    <div>
      {/* Your campaign form */}
      <div>...</div>

      {/* Smart Recommendations Panel */}
      <SmartSuggestions
        accountId={accountId}
        objective={objective}
        onApplyAdCopy={handleApplyAdCopy}
        onApplyAudience={handleApplyAudience}
      />
    </div>
  );
}
```

---

## Integration Example: Campaign Wizard

### Option 1: Sidebar Panel
Add recommendations as a collapsible sidebar during campaign creation:

```tsx
// meta-dashboard/src/app/[locale]/uploader/wizard/page.tsx

import { SmartSuggestions } from '@/components/recommendations/SmartSuggestions';

export default function WizardPage() {
  const [showRecommendations, setShowRecommendations] = useState(true);

  return (
    <div className="flex gap-6">
      {/* Main Campaign Form */}
      <div className="flex-1">
        {/* Your wizard steps */}
      </div>

      {/* Recommendations Sidebar */}
      {showRecommendations && (
        <div className="w-96">
          <SmartSuggestions
            accountId={selectedAccountId}
            objective={campaignObjective}
            onApplyAdCopy={(variant) => {
              setFormData({
                ...formData,
                headline: variant.headline,
                primaryText: variant.primary_text,
                description: variant.description,
                cta: variant.cta
              });
            }}
            onApplyAudience={(recs) => {
              setFormData({
                ...formData,
                interests: recs.interests,
                ageMin: recs.age_range.min,
                ageMax: recs.age_range.max,
                countries: recs.countries
              });
            }}
          />
        </div>
      )}
    </div>
  );
}
```

### Option 2: Modal/Dialog
Show recommendations in a modal when user clicks "Get AI Suggestions":

```tsx
import { Dialog } from '@/components/ui/dialog';

function CampaignForm() {
  const [showAIModal, setShowAIModal] = useState(false);

  return (
    <>
      <button onClick={() => setShowAIModal(true)}>
        ✨ Get AI Suggestions
      </button>

      <Dialog open={showAIModal} onClose={() => setShowAIModal(false)}>
        <SmartSuggestions
          accountId={accountId}
          objective={objective}
          onApplyAdCopy={(variant) => {
            applyAdCopy(variant);
            setShowAIModal(false);
          }}
        />
      </Dialog>
    </>
  );
}
```

### Option 3: Inline Suggestions
Show recommendations inline as the user fills out the form:

```tsx
function AdCopyStep() {
  return (
    <div>
      <h2>Write Your Ad Copy</h2>

      {/* Form fields */}
      <input placeholder="Headline" />
      <textarea placeholder="Primary text" />

      {/* AI Suggestions */}
      <div className="mt-6 p-4 bg-purple-50 rounded-lg">
        <p className="font-semibold mb-2">💡 AI Suggestions</p>
        <SmartSuggestions
          accountId={accountId}
          objective={objective}
          onApplyAdCopy={(variant) => {
            setHeadline(variant.headline);
            setPrimaryText(variant.primary_text);
          }}
        />
      </div>
    </div>
  );
}
```

---

## API Endpoints Used

The component calls these backend endpoints:

```
GET /api/v1/accounts/{account_id}/recommendations/audience
GET /api/v1/accounts/{account_id}/recommendations/ad-copy?objective=SALES
GET /api/v1/accounts/{account_id}/recommendations/creative-direction
```

---

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `accountId` | `string` | ✅ | The ad account ID |
| `objective` | `string` | ❌ | Campaign objective (default: "SALES") |
| `onApplyAdCopy` | `(variant) => void` | ❌ | Callback when user clicks "Use This Copy" |
| `onApplyAudience` | `(recs) => void` | ❌ | Callback when user clicks "Apply These Settings" |

---

## Ad Copy Variant Structure

```typescript
interface AdCopyVariant {
  headline: string;        // e.g. "Transform Your Health Today"
  primary_text: string;    // 1-2 sentences of compelling copy
  description: string;     // Short description
  cta: string;            // e.g. "LEARN_MORE", "SHOP_NOW"
}
```

---

## Audience Recommendations Structure

```typescript
interface AudienceRecommendations {
  interests: string[];                    // e.g. ["fitness", "health", "wellness"]
  age_range: { min: number; max: number }; // e.g. { min: 25, max: 45 }
  genders: string[];                      // e.g. ["all"] or ["male", "female"]
  countries: string[];                    // e.g. ["US", "CA", "UK"]
  languages?: string[];                   // e.g. ["en", "es"]
  rationale: string;                      // Explanation of why
}
```

---

## Requirements

**Business Profile Must Be Completed**

The recommendations require the user to have completed the business profile during onboarding (website URL or business description). If no profile exists, the API returns:

```json
{
  "error": "No business profile found. Please complete business profile setup."
}
```

The component displays this error to the user with a helpful message.

---

## Styling

The component uses your existing design system:
- Dark theme with `bg-white/5` and `border-white/10`
- Purple accent colors (`purple-400`, `purple-600`)
- Tailwind utility classes
- Responsive design

---

## Example: Full Campaign Wizard Integration

```tsx
// meta-dashboard/src/app/[locale]/campaign-control/page.tsx

import { SmartSuggestions } from '@/components/recommendations/SmartSuggestions';
import { useState } from 'react';

export default function CampaignControlPage() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    objective: 'SALES',
    headline: '',
    primaryText: '',
    interests: [],
    ageRange: { min: 18, max: 65 },
    countries: []
  });

  return (
    <div className="flex gap-6">
      {/* Left: Wizard Steps */}
      <div className="flex-1">
        {step === 1 && <ObjectiveStep />}
        {step === 2 && <TargetingStep formData={formData} setFormData={setFormData} />}
        {step === 3 && <AdCopyStep formData={formData} setFormData={setFormData} />}
        {step === 4 && <BudgetStep />}
      </div>

      {/* Right: AI Recommendations */}
      <aside className="w-96 sticky top-6 h-fit">
        <SmartSuggestions
          accountId={selectedAccountId}
          objective={formData.objective}
          onApplyAdCopy={(variant) => {
            setFormData({
              ...formData,
              headline: variant.headline,
              primaryText: variant.primary_text,
              description: variant.description,
              cta: variant.cta
            });
            // Optional: auto-advance to next step
            setStep(4);
          }}
          onApplyAudience={(recs) => {
            setFormData({
              ...formData,
              interests: recs.interests,
              ageRange: recs.age_range,
              countries: recs.countries
            });
            // Optional: auto-advance to next step
            setStep(3);
          }}
        />
      </aside>
    </div>
  );
}
```

---

## Next Steps

1. **Add to Campaign Wizard:** Import and use the component in your campaign creation flow
2. **Test with Real Data:** Complete business profile for a test account, then view recommendations
3. **Customize Callbacks:** Implement the `onApply*` handlers to populate your form fields
4. **Add Loading States:** The component handles its own loading, but you may want to disable form submission while recommendations are loading

---

## Troubleshooting

**"No business profile found" error:**
- User must complete `/onboard/business-profile` step after linking accounts
- Check if business profile exists: `GET /api/v1/accounts/{id}/business-profile`

**Empty or generic recommendations:**
- Ensure business profile has been analyzed (check `analysis_status` = 'completed')
- Provide more detailed business description or website URL during onboarding

**API errors:**
- Check GEMINI_API_KEY is set in backend environment
- Verify user has access to the account (account_id in user's linked accounts)

---

Enjoy AI-powered campaign recommendations! 🎉
