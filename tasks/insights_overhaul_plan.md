# Insights Overhaul & AI Investigator Plan

## Goal Description
Revamp the Insights experience to be more "real", understandable, and actionable. The goal is to move away from scattered "mini-insights" and consolidate everything into a powerful **Insights & AI Investigator** page. This page will allow users to drill down from Account to Ad level, view Breakdowns, and interact with an AI Assistant that understands their specific business context.

## User Review Required
> [!IMPORTANT]
> **Data Removal**: This plan involves removing "mini-insight" cards from the Dashboard, Campaigns, and Creatives pages to reduce clutter, as requested ("remove all the insights inside the page's").
> **New Field**: We will add a "Business Description" free-text field to the Ad Account Settings. Users must populate this for the best AI experience.

## Proposed Changes

### 1. Settings & Context (Foundation)
Current AI insights rely on structured quiz data (Industry, Goal). We will add a rich free-text "Business Context" field to give the AI "real" understanding.

#### Backend
- **Database**: Add `business_description` and `insight_preferences` columns to `dim_account` table.
- **API**: Update `AccountQuizRequest` schema and `AccountRepository` to save/retrieve these fields.
- **Service**: Update `InsightsService` and `AIService` to inject these preferences into the System Prompt.

#### Frontend
- **Page**: `src/app/[locale]/accounts/[accountId]/settings/page.tsx`.
- **Component**: Update **Optimization** tab in `AdAccountSettings` to include:
  1.  **Label**: "Add information on your activity"
  2.  **Helper Text**: "Any info you want our AI to know to improve insights"
  3.  **Input**: Large text area for free-form context.

### 2. Frontend Cleanup
Remove the "unclear" mini-insight components from general pages.

#### [DELETE] Usage of `InsightsSection`
- `src/app/[locale]/dashboard/page.tsx`: Remove `InsightsSection`.
- `src/app/[locale]/campaigns/page.tsx`: Remove `InsightsSection`.
- `src/app/[locale]/creatives/page.tsx`: Remove `InsightsSection` / `VideoInsightsSection`.

### 3. Insights Page Overhaul (`src/app/[locale]/insights/page.tsx`)
Transform this into the central hub.

#### Layout & Navigation
- **Header**: "Insights & AI Investigator".
- **Controls**:
  - Global Date Range Picker.
  - Account Selector (via Context).

#### Tabs (Drill Down Levels)
1.  **Overview (Account Level)**
    - **Concise Insights**: Short, bulleted "Executive Summary" items.
    - **Drill Down Feature**: Each insight card has an "Investigate with AI" button.
      - *Action*: Opens the AI Chat sidebar/drawer.
      - *Context*: Pre-loads the specific insight topic (e.g., "Tell me more about the drop in ROAS...").
    - Top Strategic Recommendations (Actionable).
2.  **Creative Lab (Ad Level)**
    - *Renamed from 'Creatives' to 'Creative Lab'.*
    - Top Performing vs Underperforming Ads.
    - "Investigate" button on specific ads to ask AI about creative elements.
3.  **Breakdown Analyzer (Breakdown Level)**
    - *New dedicated tab.*
    - Graphs for Age, Gender, Placement, Region.
    - "Drill Down" into specific segments (e.g., "Why is Instagram Stories performing better?").

#### AI Investigator (Chat Integration)
- **Status**: **KEEP** the existing standalone AI Investigator page (`src/app/[locale]/ai-investigator/page.tsx`) for now.
- **New Integration**: ALSO add user access via a drawer in the Insights page.
- **UI**:
  - **Floating Action Button (FAB)**: "Ask AI" always visible on Insights page.
  - **Slide-over Drawer**: Opens the chat interface.
- **Features**:
  - **Context Aware**: Knows which tab/date range is active.
  - **Drill Down Mode**: If opened from an insight, starts with that context.
  - **Free Text**: User can ask anything.
  - **Suggested Questions**: Derived from current data context.

### 4. Backend Enhancements

#### `AIService` (`backend/api/services/ai_service.py`)
- Update `SYSTEM_INSTRUCTION` to explicitly prioritize the new `business_description`.
- Ensure `query_data` retrieves and uses this context.

#### `InsightsService` (`backend/api/services/insights_service.py`)
- Update `DEEP_ANALYSIS_PROMPT` to include `business_description`.

## Verification Plan

### Automated Tests
- `npm run dev`: Verify build passes.
- Check Backend logs for correct Context injection in prompts.

### Manual Verification
1.  **Settings**: Go to Account Settings -> Optimization. Enter "We sell organic dog food...". Save.
2.  **Cleanup**: Verify Dashboard/Campaigns pages no longer show the old insight cards.
3.  **Insights Page**:
    - Go to Insights.
    - Check "Overview" - does it mention "organic dog food" or related strategy?
    - Check "Creative Lab" - does it load ad analysis?
    - Check "Breakdown Analyzer" - do graphs appear?
4.  **AI Chat**:
    - Click "Ask AI".
    - Ask "How can I improve my ROAS for dog food?".
    - Verify answer uses the context.
