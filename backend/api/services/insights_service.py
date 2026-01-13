"""
Insights Service
Generates AI-powered marketing insights and recommendations
"""

import os
import json
import logging
import hashlib
import time
from datetime import date, timedelta, datetime
from typing import Dict, Any, List, Optional
import google.genai as genai
from google.genai import types
from sqlalchemy.orm import Session

from backend.api.repositories.insights_repository import InsightsRepository
from backend.api.repositories.user_repository import UserRepository
from backend.api.services.comparison_service import ComparisonService
from backend.config.settings import GEMINI_MODEL

logger = logging.getLogger(__name__)

# In-memory cache for insights
INSIGHTS_CACHE = {}
CACHE_TTL = 3600  # 1 hour

# AI Prompts
SUMMARY_PROMPT_TEMPLATE = """Analyze this Facebook Ads data and provide exactly 3 actionable insights for a {page_context} page.
Respond in {target_lang}.

{account_context}

Context: This is for {page_context} view. Focus on insights most relevant to this context.

Analysis Goal: Compare the CURRENT period performance to the PREVIOUS period. Highlight significant changes and provide practical recommendations.

Format (exactly 3 items, one per line):
🚀 [One sentence insight about an opportunity - e.g. scaling something that improved]
📈 [One sentence insight about a trend - e.g. how a key metric changed vs previous period]
💡 [One sentence insight about a quick win or improvement based on the data shift]

Rules:
- Each insight must be ONE sentence only
- Be specific with numbers (e.g., "CTR increased by 15% to 1.2%, helping CPA drop by 10%")
- Focus on actionable recommendations based on the delta between periods
- Use the emoji indicators provided
- DO NOT add extra text, headers, or explanations

Data:
{data}

Provide your 3 insights now:"""

DEEP_ANALYSIS_PROMPT = """You are a Senior Performance Marketing Strategist analyzing Facebook Ads performance.
Respond in {target_lang}.

{account_context}

Analyze the performance difference between the CURRENT period and the PREVIOUS period. Provide strategic insights based on what changed.

## Data Provided:
{data}

## Your Response Must Include (use markdown format):

### 1. Executive Summary
2-3 sentences capturing the overall performance change and key takeaway. Is performance improving or declining?

### 2. Key Performance Changes
3-5 bullet points highlighting the most significant shifts in metrics (CPM, CTR, CPC, CPA, Conversions).
Format:
- 📊 [Metric] changed from [prev_value] to [curr_value] ([% change]) - [Brief explanation of why it matters]

### 3. Performance Trends & Practical Insights
3-5 insights about patterns identified when comparing the two periods.
Format:
- 📈 [Trend description with % change and practical context]

### 4. Strategic Recommendations (Priority Order)
Prioritized actions ranked by impact, specifically addressing the changes observed:
- 🚀 **High Priority**: [Action to capitalize on wins or fix major regressions] → [Expected outcome]
- 🎯 **Medium Priority**: [Action] → [Expected outcome]
- 💡 **Test & Learn**: [Action] → [Expected outcome]

### 5. Opportunity & Risk Detection
2-3 specific areas that regressed or showed new potential.
Format:
- ⚠️ [Problem/Risk] or 💡 [New Opportunity] → Action: [Specific fix or scaling step]

Be specific with numbers, percentages, and dollar amounts. Focus on practical insights and actionability."""


class InsightsService:
    """Service for generating AI-powered insights"""


    def __init__(self, db: Session, user_id: Optional[int] = None):
        self.db = db
        self.user_id = user_id
        self.repository = InsightsRepository(db)

        # Initialize Gemini
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            logger.error("GEMINI_API_KEY not found in environment")
            self.client = None
        else:
            try:
                self.client = genai.Client(api_key=api_key)
                self.model = GEMINI_MODEL
            except Exception as e:
                logger.error(f"Failed to initialize Gemini: {e}")
                self.client = None

    def _get_cache_key(
        self,
        start_date: date,
        end_date: date,
        context: str,
        campaign_filter: Optional[str] = None,
        breakdown_type: Optional[str] = None,
        breakdown_group_by: Optional[str] = None,
        user_id: Optional[int] = None,
        account_id: Optional[str] = None,
        locale: str = "en"
    ) -> str:
        """Generate cache key from parameters including filters"""
        # Version 6: Locale aware
        cache_version = "v6"
        filters_str = f":{campaign_filter or ''}:{breakdown_type or ''}:{breakdown_group_by or ''}:{user_id or ''}:{account_id or ''}:{locale}"
        key_str = f"insights:{cache_version}:{context}:{start_date}:{end_date}{filters_str}"
        return hashlib.md5(key_str.encode()).hexdigest()

    def _get_cache_ttl(self, has_filters: bool) -> int:
        """Return cache TTL based on whether filters are active"""
        return 300 if has_filters else 3600  # 5 min with filters vs 1 hour without

    def _get_user_account_ids(self, user_id: int) -> List[int]:
        """Get list of linked ad account IDs for the user"""
        if not user_id:
            return None
        
        user_repo = UserRepository(self.db)
        user = user_repo.get_user_by_id(user_id)
        if not user or not user.ad_accounts:
            return []
            
        return [acc.account_id for acc in user.ad_accounts]

    def _parse_summary_insights(self, ai_response: str, page_context: str) -> List[Dict[str, Any]]:
        """
        Parse AI response into structured insights.
        Expected format: One insight per line with emoji prefix.
        """
        insights = []
        lines = [line.strip() for line in ai_response.strip().split('\n') if line.strip()]

        for line in lines[:3]:  # Take first 3 lines
            # Extract emoji and text
            if '🚀' in line:
                icon = '🚀'
                insight_type = 'opportunity'
                text = line.replace('🚀', '').strip()
            elif '📈' in line:
                icon = '📈'
                insight_type = 'trend'
                text = line.replace('📈', '').strip()
            elif '💡' in line:
                icon = '💡'
                insight_type = 'suggestion'
                text = line.replace('💡', '').strip()
            elif '⚠️' in line:
                icon = '⚠️'
                insight_type = 'alert'
                text = line.replace('⚠️', '').strip()
            else:
                # Fallback if no emoji found
                icon = '💡'
                insight_type = 'suggestion'
                text = line.strip()

            insights.append({
                'type': insight_type,
                'icon': icon,
                'text': text,
                'priority': None
            })

        # Ensure we always have exactly 3 insights
        while len(insights) < 3:
            insights.append({
                'type': 'suggestion',
                'icon': '💡',
                'text': f'Continue monitoring {page_context} performance',
                'priority': None
            })

        return insights[:3]

    def _parse_deep_insights(self, ai_response: str) -> Dict[str, Any]:
        """Parse deep analysis response into structured format"""
        # For deep insights, we'll return the full markdown response
        # but extract sections for structured access
        sections = {
            'executive_summary': '',
            'key_findings': [],
            'performance_trends': [],
            'recommendations': [],
            'opportunities': []
        }

        # Simple section extraction (could be enhanced with better parsing)
        current_section = None
        for line in ai_response.split('\n'):
            line = line.strip()

            if 'Executive Summary' in line:
                current_section = 'executive_summary'
            elif 'Key Findings' in line:
                current_section = 'key_findings'
            elif 'Performance Trends' in line:
                current_section = 'performance_trends'
            elif 'Strategic Recommendations' in line or 'Recommendations' in line:
                current_section = 'recommendations'
            elif 'Opportunity Detection' in line or 'Opportunities' in line:
                current_section = 'opportunities'
            elif line.startswith('-') or line.startswith('*') or line.startswith('•'):
                # This is a bullet point
                if current_section in ['key_findings', 'performance_trends', 'recommendations', 'opportunities']:
                    # Extract emoji if present
                    icon = '💡'
                    for emoji in ['🚀', '📈', '💡', '⚠️', '📊', '🎯']:
                        if emoji in line:
                            icon = emoji
                            break

                    # Determine type and priority
                    insight_type = 'suggestion'
                    priority = None
                    if current_section == 'recommendations':
                        if 'High Priority' in line:
                            priority = 'high'
                            insight_type = 'opportunity'
                        elif 'Medium Priority' in line:
                            priority = 'medium'
                            insight_type = 'suggestion'
                        elif 'Test' in line:
                            priority = 'low'
                            insight_type = 'suggestion'

                    sections[current_section].append({
                        'type': insight_type,
                        'icon': icon,
                        'text': line.lstrip('- * • ').strip(),
                        'priority': priority
                    })
            elif current_section == 'executive_summary' and line and not line.startswith('#'):
                sections['executive_summary'] += line + ' '

        sections['executive_summary'] = sections['executive_summary'].strip()

        return sections

    def _format_account_context(self, context: Optional[Dict]) -> str:
        """Format account context for prompt"""
        if not context:
            return ""
        
        parts = []
        if context.get('name'):
            parts.append(f"Account Name: {context['name']}")
        if context.get('industry'):
            parts.append(f"Industry: {context['industry']}")
        if context.get('goal'):
            parts.append(f"Primary Goal: {context['goal']}")
        if context.get('priority'):
            parts.append(f"Optimization Priority: {context['priority']}")
        if context.get('business_description'):
            parts.append(f"Business Description: {context['business_description']}")
            
        if not parts:
            return ""
            
        return "**ACCOUNT CONTEXT**:\n" + "\n".join(parts) + "\n\nIMPORTANT: Tailor all insights to this specific business context and goals.\n"

    def get_summary_insights(
        self,
        start_date: date,
        end_date: date,
        page_context: str = "dashboard",
        campaign_filter: Optional[str] = None,
        breakdown_type: Optional[str] = None,
        breakdown_group_by: Optional[str] = None,
        user_id: Optional[int] = None,
        account_id: Optional[str] = None,
        locale: str = "en"
    ) -> Dict[str, Any]:
        """
        Generate 2-3 quick insights for mini cards.
        Returns cached results if available.

        Supports filtering by campaign name and breakdown analysis.
        Cache TTL: 5 minutes with filters, 1 hour without.
        """
        # Determine if filters are active
        has_filters = bool(campaign_filter or breakdown_type or user_id)

        # Check cache with filter-aware key
        cache_key = self._get_cache_key(
            start_date, end_date, f"summary_{page_context}",
            campaign_filter, breakdown_type, breakdown_group_by, user_id, account_id, locale
        )
        if cache_key in INSIGHTS_CACHE:
            cached = INSIGHTS_CACHE[cache_key]
            cache_ttl = self._get_cache_ttl(has_filters)
            if time.time() - cached['timestamp'] < cache_ttl:
                logger.info(f"Returning cached summary insights for {page_context} (filters: {has_filters})")
                return cached['data']

        # Determine comparison period
        prev_start, prev_end = ComparisonService.calculate_previous_period(start_date, end_date)

        # Get linked accounts if user_id provided
        if user_id:
            user_accounts = self._get_user_account_ids(user_id)
            if account_id:
                # If specific account requested, verify it belongs to user
                account_ids = [account_id] if account_id in user_accounts else []
            else:
                account_ids = user_accounts
        else:
            account_ids = None

        # Fetch data with filters
        data = self.repository.get_insights_data(
            start_date=start_date,
            end_date=end_date,
            page_context=page_context,
            prev_start_date=prev_start,
            prev_end_date=prev_end,
            campaign_filter=campaign_filter,
            breakdown_type=breakdown_type,
            breakdown_group_by=breakdown_group_by,
            account_ids=account_ids
        )

        # Check if we have any data (for new users with no synced data yet)
        overview = data.get('overview', {})
        if not overview or (overview.get('spend', 0) == 0 and overview.get('impressions', 0) == 0):
            # No data available yet - return empty insights
            logger.info(f"No data available for insights (user may be new or data is still syncing)")
            result = {
                "insights": [],
                "context": page_context,
                "period": f"{start_date} to {end_date}",
                "message": "Your data is being synced. Insights will appear once your Facebook ad data is loaded."
            }
            INSIGHTS_CACHE[cache_key] = {'data': result, 'timestamp': time.time()}
            return result

        # Prepare data summary for AI with filter context
        data_summary = self._prepare_data_summary(
            data,
            detailed=False,
            campaign_filter=campaign_filter,
            breakdown_type=breakdown_type
        )

        # Generate insights with AI
        if not self.client:
            # Fallback insights if AI is not available
            insights = self._generate_fallback_insights(data, page_context)
        else:
            # Build context-aware prompt
            prompt_context = page_context
            if campaign_filter:
                prompt_context += f" (campaign: {campaign_filter})"
            if breakdown_type:
                prompt_context += f" (breakdown: {breakdown_type})"

            # Map locale to language name
            lang_map = {
                'en': 'English',
                'he': 'Hebrew',
                'fr': 'French',
                'de': 'German',
                'es': 'Spanish',
                'ar': 'Arabic'
            }
            target_lang = lang_map.get(locale, 'English')

            # Format account context
            account_context_str = self._format_account_context(data.get('account_context'))

            prompt = SUMMARY_PROMPT_TEMPLATE.format(
                page_context=prompt_context,
                data=data_summary,
                target_lang=target_lang,
                account_context=account_context_str
            )

            try:
                response = self.client.models.generate_content(
                    model=self.model,
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        temperature=0.3
                    )
                )
                ai_text = response.text
                insights = self._parse_summary_insights(ai_text, page_context)
            except Exception as e:
                logger.error(f"AI generation failed: {e}")
                insights = self._generate_fallback_insights(data, page_context)

        result = {
            'insights': insights,
            'generated_at': datetime.utcnow().isoformat()
        }

        # Cache the result with filter-aware TTL
        INSIGHTS_CACHE[cache_key] = {
            'data': result,
            'timestamp': time.time()
        }

        return result

    def get_deep_analysis(
        self,
        start_date: date,
        end_date: date,
        user_id: Optional[int] = None,
        account_id: Optional[str] = None,
        locale: str = "en"
    ) -> Dict[str, Any]:
        """
        Generate comprehensive deep analysis for insights page.
        Returns cached results if available.
        """
        # Check cache
        cache_key = self._get_cache_key(start_date, end_date, "deep_analysis", user_id=user_id, account_id=account_id, locale=locale)
        if cache_key in INSIGHTS_CACHE:
            cached = INSIGHTS_CACHE[cache_key]
            if time.time() - cached['timestamp'] < CACHE_TTL:
                logger.info("Returning cached deep analysis")
                return cached['data']

        # Determine comparison period
        prev_start, prev_end = ComparisonService.calculate_previous_period(start_date, end_date)

        # Get linked accounts if user_id provided
        if user_id:
            user_accounts = self._get_user_account_ids(user_id)
            if account_id:
                # If specific account requested, verify it belongs to user
                account_ids = [account_id] if account_id in user_accounts else []
            else:
                account_ids = user_accounts
        else:
            account_ids = None

        # Fetch data
        data = self.repository.get_insights_data(
            start_date=start_date,
            end_date=end_date,
            page_context="all",
            prev_start_date=prev_start,
            prev_end_date=prev_end,
            account_ids=account_ids
        )

        # Check if we have any data
        overview = data.get('overview', {})
        if not overview or (overview.get('spend', 0) == 0 and overview.get('impressions', 0) == 0):
            logger.info(f"No data available for deep analysis (user may be new or data is still syncing)")
            result = {
                "executive_summary": "Your Facebook ad data is currently being synced. Analysis will be available once the sync is complete.",
                "key_findings": [],
                "performance_trends": [],
                "recommendations": [],
                "opportunities": [],
                "period": f"{start_date} to {end_date}"
            }
            INSIGHTS_CACHE[cache_key] = {'data': result, 'timestamp': time.time()}
            return result

        # Prepare comprehensive data for AI
        data_summary = self._prepare_data_summary(data, detailed=True)

        # Generate deep analysis with AI
        if not self.client:
            # Fallback analysis
            result = self._generate_fallback_deep_analysis(data)
        else:
            # Map locale to language name
            lang_map = {
                'en': 'English',
                'he': 'Hebrew',
                'fr': 'French',
                'de': 'German',
                'es': 'Spanish',
                'ar': 'Arabic'
            }
            target_lang = lang_map.get(locale, 'English')

            # Format account context
            account_context_str = self._format_account_context(data.get('account_context'))

            prompt = DEEP_ANALYSIS_PROMPT.format(
                data=data_summary, 
                target_lang=target_lang,
                account_context=account_context_str
            )

            try:
                response = self.client.models.generate_content(
                    model=self.model,
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        temperature=0.2
                    )
                )
                ai_text = response.text
                parsed = self._parse_deep_insights(ai_text)

                result = {
                    'executive_summary': parsed['executive_summary'],
                    'key_findings': parsed['key_findings'],
                    'performance_trends': parsed['performance_trends'],
                    'recommendations': parsed['recommendations'],
                    'opportunities': parsed['opportunities'],
                    'generated_at': datetime.utcnow().isoformat()
                }
            except Exception as e:
                logger.error(f"Deep analysis AI generation failed: {e}")
                result = self._generate_fallback_deep_analysis(data)

        # Cache the result
        INSIGHTS_CACHE[cache_key] = {
            'data': result,
            'timestamp': time.time()
        }

        return result

    def _prepare_data_summary(
        self,
        data: Dict[str, Any],
        detailed: bool = False,
        campaign_filter: Optional[str] = None,
        breakdown_type: Optional[str] = None
    ) -> str:
        """Prepare data summary for AI consumption with period comparisons and filter context"""

        def calculate_metrics(metrics_dict):
            if not metrics_dict:
                return None
            spend = float(metrics_dict.get('spend', 0))
            impressions = int(metrics_dict.get('impressions', 0))
            clicks = int(metrics_dict.get('clicks', 0))
            conversions = int(metrics_dict.get('conversions', 0))
            conversion_value = float(metrics_dict.get('conversion_value', 0))
            purchases = int(metrics_dict.get('purchases', 0))
            purchase_value = float(metrics_dict.get('purchase_value', 0))

            ctr = (clicks / impressions * 100) if impressions > 0 else 0
            cpc = (spend / clicks) if clicks > 0 else 0
            cpm = (spend / impressions * 1000) if impressions > 0 else 0
            # ROAS only if there are purchases (user requirement)
            roas = (purchase_value / spend) if spend > 0 and purchases > 0 else 0
            cpa = (spend / purchases) if purchases > 0 else 0

            return {
                'spend': spend, 'impressions': impressions, 'clicks': clicks,
                'conversions': conversions, 'conversion_value': conversion_value,
                'purchases': purchases, 'purchase_value': purchase_value,
                'ctr': ctr, 'cpc': cpc, 'cpm': cpm, 'roas': roas, 'cpa': cpa
            }

        curr = calculate_metrics(data['overview'])
        prev = calculate_metrics(data.get('prev_overview'))

        summary = f"Period: {data['period']}\n"
        if data.get('prev_period'):
            summary += f"Previous Period: {data['prev_period']}\n"

        # Add filter context for AI
        if campaign_filter:
            summary += f"\n**FILTERED VIEW**: Analyzing specific campaign '{campaign_filter}'\n"
            summary += "IMPORTANT: Compare this campaign's performance to the account average.\n"
            summary += "Highlight if this campaign is outperforming or underperforming the overall account.\n"

        if breakdown_type:
            breakdown_label = {
                'adset': 'Ad Set',
                'platform': 'Platform',
                'placement': 'Placement',
                'age-gender': 'Demographics (Age/Gender)',
                'country': 'Country'
            }.get(breakdown_type, breakdown_type)
            summary += f"\n**BREAKDOWN VIEW**: Analyzing {breakdown_label} breakdown\n"
            summary += f"IMPORTANT: Identify top performers and biggest changes in this {breakdown_label} dimension.\n"
            summary += "Show clear comparisons between winning and losing segments.\n"

        summary += "\nCORE METRICS COMPARISON:\n"
        summary += "| Metric | Previous | Current | Change % |\n"
        summary += "|--------|----------|---------|----------|\n"

        metrics_to_show = [
            ('Spend', 'spend', '${:.2f}'),
            ('Impressions', 'impressions', '{:,}'),
            ('Clicks', 'clicks', '{:,}'),
            ('CTR', 'ctr', '{:.2f}%'),
            ('CPC', 'cpc', '${:.2f}'),
            ('CPM', 'cpm', '${:.2f}'),
            ('Conversions', 'conversions', '{:,}'),
            ('Purchases', 'purchases', '{:,}'),
            ('ROAS', 'roas', '{:.2f}x'),
            ('CPA', 'cpa', '${:.2f}')
        ]

        for label, key, fmt in metrics_to_show:
            curr_val = curr[key]
            # Skip ROAS if no conversion value in any period
            if label == 'ROAS' and curr.get('conversion_value', 0) == 0 and (not prev or prev.get('conversion_value', 0) == 0):
                continue
                
            prev_val = prev[key] if prev else 0
            
            change = ComparisonService.calculate_change_percentage(curr_val, prev_val)
            change_str = f"{change:+.1f}%" if change is not None else "N/A"
            
            prev_str = fmt.format(prev_val) if prev else "N/A"
            curr_str = fmt.format(curr_val)
            
            summary += f"| {label} | {prev_str} | {curr_str} | {change_str} |\n"

        # Add explicit instruction to AI when there is no conversion value
        if curr.get('conversion_value', 0) == 0 and (not prev or prev.get('conversion_value', 0) == 0):
            summary += "\n**IMPORTANT INSTRUCTION**: There is NO conversion value in either period. Do NOT mention ROAS or purchase-related metrics in your insights.\n"
            summary += "Instead, focus on these key metrics and their changes:\n"
            summary += "- Spend changes and budget efficiency\n"
            summary += "- Number of conversions and conversion trends\n"
            summary += "- CPA (Cost Per Action/Conversion) performance\n"
            summary += "- Traffic metrics: CTR, CPC, CPM\n"
            summary += "- Click and impression trends\n"

        if detailed:
            summary += "\nTOP CAMPAIGNS (Current Period):\n"
            campaigns = data['campaigns'][:10]
            for i, camp in enumerate(campaigns, 1):
                summary += f"{i}. {camp.get('campaign_name', 'Unknown')} - Spend: ${camp.get('spend', 0):.2f}, ROAS: {camp.get('roas', 0):.2f}x, Conversions: {camp.get('conversions', 0)}\n"

        return summary

    def _calculate_metrics(self, overview: Dict[str, Any]) -> Dict[str, float]:
        """Calculate all derived metrics from overview data"""
        spend = float(overview.get('spend', 0))
        impressions = int(overview.get('impressions', 0))
        clicks = int(overview.get('clicks', 0))
        conversions = int(overview.get('conversions', 0))
        conversion_value = float(overview.get('conversion_value', 0))
        purchases = int(overview.get('purchases', 0))

        return {
            'spend': spend,
            'impressions': impressions,
            'clicks': clicks,
            'conversions': conversions,
            'conversion_value': conversion_value,
            'purchases': purchases,
            'ctr': (clicks / impressions * 100) if impressions > 0 else 0,
            'cpc': (spend / clicks) if clicks > 0 else 0,
            'cpm': (spend / impressions * 1000) if impressions > 0 else 0,
            'cpa': (spend / conversions) if conversions > 0 else 0,
            'roas': (conversion_value / spend) if spend > 0 else 0
        }

    def _generate_fallback_insights(self, data: Dict[str, Any], page_context: str) -> List[Dict[str, Any]]:
        """Generate comparison-based insights without AI"""
        overview = data['overview']
        prev_overview = data.get('prev_overview')
        campaigns = data['campaigns']

        # Calculate current period metrics
        curr = self._calculate_metrics(overview)

        insights = []

        # If no previous period data, fall back to current-only insights
        if not prev_overview:
            logger.warning("No previous period data available for comparison insights")
            return self._generate_current_only_insights(curr, campaigns)

        # Calculate previous period metrics
        prev = self._calculate_metrics(prev_overview)

        # Calculate percentage changes for all metrics
        changes = {
            'spend': ComparisonService.calculate_change_percentage(curr['spend'], prev['spend']),
            'conversions': ComparisonService.calculate_change_percentage(curr['conversions'], prev['conversions']),
            'roas': ComparisonService.calculate_change_percentage(curr['roas'], prev['roas']),
            'cpa': ComparisonService.calculate_change_percentage(curr['cpa'], prev['cpa']),
            'ctr': ComparisonService.calculate_change_percentage(curr['ctr'], prev['ctr']),
            'cpc': ComparisonService.calculate_change_percentage(curr['cpc'], prev['cpc']),
            'cpm': ComparisonService.calculate_change_percentage(curr['cpm'], prev['cpm'])
        }

        # Debug logging
        logger.debug(f"Fallback comparison insights - curr conversion_value: {curr['conversion_value']}, prev: {prev['conversion_value']}")

        # Determine campaign type and generate appropriate insights
        has_roas = curr['conversion_value'] > 0 and curr['purchases'] > 0

        if has_roas:
            insights = self._generate_roas_comparison_insights(curr, prev, changes, campaigns)
        else:
            insights = self._generate_non_roas_comparison_insights(curr, prev, changes, campaigns)

        return insights  # Always returns exactly 4 insights (no slicing needed)

    def _generate_roas_comparison_insights(
        self, curr: Dict, prev: Dict, changes: Dict, campaigns: List
    ) -> List[Dict[str, Any]]:
        """Generate 4-line structured insights: Spend → Traffic → Conversions → Recommendation"""
        # Calculate all metric changes
        spend_change = changes.get('spend')
        cpm_change = changes.get('cpm')
        impressions_change = ComparisonService.calculate_change_percentage(curr['impressions'], prev['impressions'])
        ctr_change = changes.get('ctr')
        cpc_change = changes.get('cpc')
        clicks_change = ComparisonService.calculate_change_percentage(curr['clicks'], prev['clicks'])
        conv_change = changes.get('conversions')
        cpa_change = changes.get('cpa')
        roas_change = changes.get('roas')

        # Bundle all changes for recommendation analysis
        all_changes = {
            'spend': spend_change,
            'cpm': cpm_change,
            'impressions': impressions_change,
            'ctr': ctr_change,
            'cpc': cpc_change,
            'clicks': clicks_change,
            'conversions': conv_change,
            'cpa': cpa_change,
            'roas': roas_change
        }

        insights = []

        # LINE 1: Spend/Budget layer (ALWAYS generated)
        insights.append(self._generate_spend_insight(curr, prev, spend_change, cpm_change, impressions_change))

        # LINE 2: Traffic/Engagement layer (ALWAYS generated)
        insights.append(self._generate_traffic_insight(curr, prev, ctr_change, cpc_change, clicks_change))

        # LINE 3: Conversion layer with ROAS (ALWAYS generated)
        insights.append(self._generate_conversion_insight_roas(curr, prev, conv_change, cpa_change, roas_change))

        # LINE 4: Strategic recommendation (ALWAYS generated)
        insights.append(self._generate_recommendation(curr, prev, all_changes, has_roas=True))

        return insights  # Always returns exactly 4 insights

    def _generate_non_roas_comparison_insights(
        self, curr: Dict, prev: Dict, changes: Dict, campaigns: List
    ) -> List[Dict[str, Any]]:
        """Generate 4-line structured insights: Spend → Traffic → Conversions → Recommendation"""
        # Calculate all metric changes
        spend_change = changes.get('spend')
        cpm_change = changes.get('cpm')
        impressions_change = ComparisonService.calculate_change_percentage(curr['impressions'], prev['impressions'])
        ctr_change = changes.get('ctr')
        cpc_change = changes.get('cpc')
        clicks_change = ComparisonService.calculate_change_percentage(curr['clicks'], prev['clicks'])
        conv_change = changes.get('conversions')
        cpa_change = changes.get('cpa')

        # Bundle all changes for recommendation analysis
        all_changes = {
            'spend': spend_change,
            'cpm': cpm_change,
            'impressions': impressions_change,
            'ctr': ctr_change,
            'cpc': cpc_change,
            'clicks': clicks_change,
            'conversions': conv_change,
            'cpa': cpa_change
        }

        insights = []

        # LINE 1: Spend/Budget layer (ALWAYS generated)
        insights.append(self._generate_spend_insight(curr, prev, spend_change, cpm_change, impressions_change))

        # LINE 2: Traffic/Engagement layer (ALWAYS generated)
        insights.append(self._generate_traffic_insight(curr, prev, ctr_change, cpc_change, clicks_change))

        # LINE 3: Conversion layer without ROAS (ALWAYS generated)
        insights.append(self._generate_conversion_insight_non_roas(curr, prev, conv_change, cpa_change))

        # LINE 4: Strategic recommendation (ALWAYS generated)
        insights.append(self._generate_recommendation(curr, prev, all_changes, has_roas=False))

        return insights  # Always returns exactly 4 insights

    def _generate_current_only_insights(
        self, curr: Dict, campaigns: List
    ) -> List[Dict[str, Any]]:
        """Fallback when no previous period data is available"""
        insights = []

        # Just show current state without comparisons
        if curr['conversion_value'] > 0:
            insights.append({
                'type': 'trend',
                'icon': '📊',
                'text': f"Current ROAS: {curr['roas']:.1f}x with ${curr['spend']:.2f} spend",
                'priority': None
            })

        if curr['conversions'] > 0:
            insights.append({
                'type': 'trend',
                'icon': '📊',
                'text': f"{int(curr['conversions'])} conversions at ${curr['cpa']:.2f} CPA",
                'priority': None
            })

        insights.append({
            'type': 'suggestion',
            'icon': '💡',
            'text': f"CTR of {curr['ctr']:.2f}% indicates {'strong' if curr['ctr'] > 1.5 else 'moderate'} creative engagement",
            'priority': None
        })

        return insights

    def _generate_spend_insight(
        self, curr: Dict, prev: Dict, spend_change: Optional[float],
        cpm_change: Optional[float], impressions_change: Optional[float]
    ) -> Dict[str, Any]:
        """Line 1: Natural story connecting spend with clicks and impressions"""

        # Calculate clicks change from curr/prev
        clicks_change = None
        if 'clicks' in curr and 'clicks' in prev and prev['clicks'] > 0:
            clicks_change = ComparisonService.calculate_change_percentage(curr['clicks'], prev['clicks'])

        # Build natural sentence
        main_metric = None
        related_metrics = []

        # Identify main movement
        if spend_change and abs(spend_change) > 5:
            direction = "down" if spend_change < 0 else "up"
            main_metric = f"Spend is {direction}"

            # Add related metrics moving same direction
            if clicks_change and abs(clicks_change) > 8:
                if (spend_change < 0 and clicks_change < 0) or (spend_change > 0 and clicks_change > 0):
                    related_metrics.append("clicks")

            if impressions_change and abs(impressions_change) > 10:
                if (spend_change < 0 and impressions_change < 0) or (spend_change > 0 and impressions_change > 0):
                    related_metrics.append("impressions")

        # Build the message
        if main_metric and related_metrics:
            metrics_list = " and ".join(related_metrics)
            text = f"{main_metric}, {metrics_list} also"
        elif main_metric:
            text = main_metric
        else:
            text = "Spend and reach are stable"

        return {
            'type': 'trend',
            'icon': '📊',
            'text': text,
            'priority': None
        }

    def _generate_traffic_insight(
        self, curr: Dict, prev: Dict, ctr_change: Optional[float],
        cpc_change: Optional[float], clicks_change: Optional[float]
    ) -> Dict[str, Any]:
        """Line 2: Focus on CTR as primary metric, CPC as secondary context"""

        ctr_improved = ctr_change and ctr_change > 5
        ctr_declined = ctr_change and ctr_change < -5
        cpc_improved = cpc_change and cpc_change < -5  # CPC down = good
        cpc_declined = cpc_change and cpc_change > 5   # CPC up = bad

        # CTR is primary - lead with it
        if ctr_improved:
            if cpc_improved:
                text = "CTR improved, your ads are resonating better with audience (and CPC also improved) - check creative page to see which ads are winning"
            elif cpc_declined:
                text = "CTR improved, your ads getting more engagement (though CPC went up a bit) - investigate in creative page which ads are performing"
            else:
                text = "CTR improved, your ads are getting more clicks - see which creatives are performing in creative page"
        elif ctr_declined:
            if cpc_improved:
                text = "CTR dropped, ads getting less engagement (though CPC improved) - check creative page for fatigue signals"
            elif cpc_declined:
                text = "CTR dropped, ad engagement weakening - check creative page to identify issues"
            else:
                text = "CTR dropped, ads getting less engagement - check creative page for fatigue signals"
        else:
            # CTR stable - CPC becomes focus only if changed
            if cpc_improved:
                text = "Ad engagement is stable with CPC improving - check creative page for details"
            elif cpc_declined:
                text = "Ad engagement is stable but CPC went up - review creative page for optimization"
            else:
                text = "Ad performance is stable, check creative page for details"

        return {
            'type': 'trend',
            'icon': '🎯',
            'text': text,
            'priority': None
        }

    def _generate_conversion_insight_roas(
        self, curr: Dict, prev: Dict, conv_change: Optional[float],
        cpa_change: Optional[float], roas_change: Optional[float]
    ) -> Dict[str, Any]:
        """Line 3: Story about conversions, CPA, and conversion rate"""

        improved = []
        declined = []

        # Track improvements and declines
        if conv_change and abs(conv_change) > 10:
            if conv_change > 0:
                improved.append("Conversions")
            else:
                declined.append("Conversions")

        if cpa_change and abs(cpa_change) > 10:
            if cpa_change < 0:  # CPA down = good
                improved.append("CPA")
            else:
                declined.append("CPA")

        # Calculate conversion rate (conversions / clicks)
        conv_rate_curr = None
        conv_rate_prev = None
        conv_rate_change = None

        if curr.get('clicks', 0) > 0 and curr.get('conversions', 0) is not None:
            conv_rate_curr = (curr['conversions'] / curr['clicks']) * 100
        if prev.get('clicks', 0) > 0 and prev.get('conversions', 0) is not None:
            conv_rate_prev = (prev['conversions'] / prev['clicks']) * 100

        if conv_rate_curr is not None and conv_rate_prev is not None and conv_rate_prev > 0:
            conv_rate_change = ComparisonService.calculate_change_percentage(conv_rate_curr, conv_rate_prev)

        # Add conversion rate insight if significant change
        conv_rate_text = ""
        if conv_rate_change and abs(conv_rate_change) > 15:
            if conv_rate_change > 0:
                conv_rate_text = ", conversion rate also improved"
            else:
                conv_rate_text = ", though conversion rate declined"

        # Build natural message with sentiment
        if improved and not declined:
            metrics = " and ".join(improved)
            text = f"{metrics} improved{conv_rate_text}, great sign!"
        elif improved and declined:
            imp = " and ".join(improved)
            dec = " and ".join(declined)
            text = f"{imp} improved but {dec} declined{conv_rate_text}"
        elif declined:
            metrics = " and ".join(declined)
            text = f"{metrics} declined{conv_rate_text}, needs attention"
        else:
            if conv_rate_text:
                text = f"Conversions are stable{conv_rate_text}"
            else:
                text = "Conversions are stable"

        return {
            'type': 'trend',
            'icon': '📈',
            'text': text,
            'priority': None
        }

    def _generate_conversion_insight_non_roas(
        self, curr: Dict, prev: Dict, conv_change: Optional[float],
        cpa_change: Optional[float]
    ) -> Dict[str, Any]:
        """Line 3: Story about conversions, CPA, and conversion rate"""

        improved = []
        declined = []

        # Track improvements and declines
        if conv_change and abs(conv_change) > 10:
            if conv_change > 0:
                improved.append("Conversions")
            else:
                declined.append("Conversions")

        if cpa_change and abs(cpa_change) > 10:
            if cpa_change < 0:  # CPA down = good
                improved.append("CPA")
            else:
                declined.append("CPA")

        # Calculate conversion rate (conversions / clicks)
        conv_rate_curr = None
        conv_rate_prev = None
        conv_rate_change = None

        if curr.get('clicks', 0) > 0 and curr.get('conversions', 0) is not None:
            conv_rate_curr = (curr['conversions'] / curr['clicks']) * 100
        if prev.get('clicks', 0) > 0 and prev.get('conversions', 0) is not None:
            conv_rate_prev = (prev['conversions'] / prev['clicks']) * 100

        if conv_rate_curr is not None and conv_rate_prev is not None and conv_rate_prev > 0:
            conv_rate_change = ComparisonService.calculate_change_percentage(conv_rate_curr, conv_rate_prev)

        # Add conversion rate insight if significant change
        conv_rate_text = ""
        if conv_rate_change and abs(conv_rate_change) > 15:
            if conv_rate_change > 0:
                conv_rate_text = ", conversion rate also improved"
            else:
                conv_rate_text = ", though conversion rate declined"

        # Build natural message with sentiment
        if improved and not declined:
            metrics = " and ".join(improved)
            text = f"{metrics} improved{conv_rate_text}, great sign!"
        elif improved and declined:
            imp = " and ".join(improved)
            dec = " and ".join(declined)
            text = f"{imp} improved but {dec} declined{conv_rate_text}"
        elif declined:
            metrics = " and ".join(declined)
            text = f"{metrics} declined{conv_rate_text}, needs attention"
        else:
            if conv_rate_text:
                text = f"Conversions are stable{conv_rate_text}"
            else:
                text = "Conversions are stable"

        return {
            'type': 'trend',
            'icon': '📈',
            'text': text,
            'priority': None
        }

    def _generate_recommendation(
        self, curr: Dict, prev: Dict, all_changes: Dict, has_roas: bool
    ) -> Dict[str, Any]:
        """Line 4: Simple next step recommendation"""

        # Extract metrics
        ctr_change = all_changes.get('ctr', 0) or 0
        cpc_change = all_changes.get('cpc', 0) or 0
        clicks_change = all_changes.get('clicks', 0) or 0
        conv_change = all_changes.get('conversions', 0) or 0
        cpa_change = all_changes.get('cpa', 0) or 0
        roas_change = all_changes.get('roas', 0) or 0 if has_roas else 0

        # Strong positive performance
        if conv_change > 15 and cpa_change < -15:
            return {
                'type': 'suggestion',
                'icon': '💡',
                'text': "Things are going well, go to campaign page to see which campaigns are winning",
                'priority': None
            }

        # Good improvements in traffic
        if ctr_change > 15 or (cpc_change < -15 and clicks_change > 10):
            return {
                'type': 'suggestion',
                'icon': '💡',
                'text': "Check campaign page to investigate which ads are performing better",
                'priority': None
            }

        # Performance declining
        if conv_change < -15 or cpa_change > 20:
            return {
                'type': 'alert',
                'icon': '⚠️',
                'text': "Performance dropped, go to campaign page to find what's not working",
                'priority': None
            }

        # Traffic issues
        if ctr_change < -15 or (cpc_change > 15 and clicks_change < -10):
            return {
                'type': 'alert',
                'icon': '⚠️',
                'text': "Traffic quality is declining, check which creatives or audiences need refreshing",
                'priority': None
            }

        # Mixed or stable
        return {
            'type': 'suggestion',
            'icon': '💡',
            'text': "Go to campaign page to investigate more in depth",
            'priority': None
        }

    def _generate_fallback_deep_analysis(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Generate basic deep analysis without AI"""
        overview = data['overview']

        # Calculate derived metrics
        spend = float(overview.get('spend', 0))
        impressions = int(overview.get('impressions', 0))
        clicks = int(overview.get('clicks', 0))
        conversions = int(overview.get('conversions', 0))
        conversion_value = float(overview.get('conversion_value', 0))

        ctr = (clicks / impressions * 100) if impressions > 0 else 0
        cpc = (spend / clicks) if clicks > 0 else 0
        roas = (conversion_value / spend) if spend > 0 else 0

        return {
            'executive_summary': f"Overall performance shows ${spend:.0f} in spend with {conversions} conversions at {roas:.1f}x ROAS.",
            'key_findings': [
                {'type': 'suggestion', 'icon': '📊', 'text': f"Total spend: ${spend:.2f}", 'priority': None},
                {'type': 'suggestion', 'icon': '📊', 'text': f"Average CPC: ${cpc:.2f}", 'priority': None},
                {'type': 'suggestion', 'icon': '📊', 'text': f"CTR: {ctr:.2f}%", 'priority': None}
            ],
            'performance_trends': [
                {'type': 'trend', 'icon': '📈', 'text': 'Performance data available for detailed analysis', 'priority': None}
            ],
            'recommendations': [
                {'type': 'opportunity', 'icon': '🚀', 'text': 'Review top-performing campaigns for scaling opportunities', 'priority': 'high'}
            ],
            'opportunities': [
                {'type': 'alert', 'icon': '⚠️', 'text': 'Monitor campaigns with declining performance', 'priority': None}
            ],
            'generated_at': datetime.utcnow().isoformat()
        }
