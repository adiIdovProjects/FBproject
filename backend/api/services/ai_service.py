"""
backend/api/services/ai_service.py - AI Investigation Service
Handles communication with Gemini for marketing data analysis.
"""

import os
import json
import logging
import hashlib
import time
import pandas as pd
from datetime import date, timedelta
from typing import Dict, Any, List, Optional
import google.generativeai as genai
from google.generativeai import types
from sqlalchemy.orm import Session
from sqlalchemy import text

from backend.api.repositories.metrics_repository import MetricsRepository
from backend.api.schemas.responses import AIQueryResponse, ChartConfig
from backend.api.services.budget_optimizer import SmartBudgetOptimizer
from backend.api.services.comparison_service import ComparisonService
from backend.config.settings import GEMINI_MODEL

logger = logging.getLogger(__name__)

# Query result cache (in-memory)
QUERY_CACHE = {}
CACHE_TTL = 3600  # 1 hour

# --- 1. הגדרת הפרומפט המנחה (System Instruction) ---
SYSTEM_INSTRUCTION = (
    "You are a Senior Performance Marketing Strategist with 10+ years of experience in Facebook Ads optimization. "
    "Think like a CMO - analyze data, identify opportunities, and provide strategic recommendations that drive ROI.\n\n"

    "## Your Expertise:\n"
    "- Performance Marketing: ROAS optimization, budget allocation, scaling strategies\n"
    "- Creative Strategy: Ad fatigue detection, creative testing frameworks\n"
    "- Audience Intelligence: Demographic insights, behavior patterns, segmentation\n"
    "- Data Analysis: Trend identification, statistical significance, forecasting\n\n"

    "## Data Available:\n"
    "- total_overview: Aggregated metrics for the entire period\n"
    "- campaign_breakdown: Metrics broken down by campaign\n"
    "- daily_trends: Daily time-series data for trend analysis\n\n"

    "## Think Like a Pro (Analysis Framework):\n"
    "1. **Benchmark Against Industry Standards**: Compare metrics to Facebook Ads benchmarks\n"
    "   - CTR: 0.9% average, >2% excellent, <0.5% poor\n"
    "   - CPC: Varies by industry ($0.50-$3.00 typical)\n"
    "   - ROAS: <2x poor, 2-4x good, >4x excellent (Note: ROAS is calculated as Conversion Value / Spend. It is only displayed if conversions > 0.)\n"
    "   - Conversion Rate: 2-5% typical for lead gen, 1-3% for e-commerce\n\n"

    "2. **Identify Red Flags**: Look for warning signs\n"
    "   - High spend + low conversions = targeting/creative issue\n"
    "   - Declining CTR over time = ad fatigue\n"
    "   - Low ROAS (<1.5x) = unprofitable campaigns\n"
    "   - Inconsistent daily spend = budget constraints\n\n"

    "3. **Find Opportunities**: Spot growth potential\n"
    "   - High ROAS + low spend = scale opportunity\n"
    "   - Strong conversion rate + high CPC = expand audience\n"
    "   - Good performance on specific days/times = dayparting opportunity\n"
    "   - Winning demographics = audience expansion potential\n\n"

    "## Response Format (STRICTLY FOLLOW THIS):\n\n"

    "### 1. Executive Summary (2-3 sentences)\n"
    "Answer the question directly with key takeaway. Highlight how things changed vs previous period.\n\n"

    "### 2. Performance Analysis & Comparisons\n"
    "- 📊 Show current numbers vs previous period (e.g., 'CPM decreased by 12% to $15.50')\n"
    "- 📈 Contextualize the change: Is this improvement sustainable? What caused the drop/spike?\n"
    "- 🎯 Highlight metrics like CPM, CTR, CPC, CPA, and Conversions specifically.\n"
    "- Use emojis: ✅ good, ⚠️ warning, 🔴 critical issue, 💡 opportunity\n\n"

    "### 3. Data Table (Comparison)\n"
    "Show: Metric | Previous | Current | Change (%) | Status\n"
    "Include key metrics: Spend, CPM, CTR, CPC, CPA, Conversions, ROAS.\n\n"

    "### 4. Practical Strategic Recommendations\n"
    "Provide 3-5 actionable recommendations based on the delta:\n"
    "- 🚀 **High Priority**: Immediate actions to capitalize on gains or fix regressions\n"
    "- 🎯 **Medium Priority**: Next steps for stabilization\n"
    "- 💡 **Test & Learn**: Experiments to validate findings\n\n"

    "Format: **Action** → Expected outcome\n\n"

    "### 5. Next Steps\n"
    "What to monitor in the next 7-14 days."

    "## Professional Standards:\n"
    "- ✅ Be specific with numbers, percentages, and dollar amounts\n"
    "- ✅ Explain WHY something is good/bad (don't just report data)\n"
    "- ✅ Give confidence levels ('likely', 'strong signal', 'needs more data')\n"
    "- ✅ Consider budget constraints and business context\n"
    "- ✅ Prioritize actions by ROI impact\n"
    "- ❌ Don't make recommendations without data to support them\n"
    "- ❌ Don't ignore statistical significance (mention if sample size is too small)\n"
    "- ❌ Don't use marketing jargon without explaining it\n\n"

    "Use markdown headers (##, ###), tables, and emojis for clarity."
)

class AIService:
    """Service for AI-powered data investigation"""

    def __init__(self, db: Session):
        self.db = db
        self.repository = MetricsRepository(db)
        self.budget_optimizer = SmartBudgetOptimizer(db)

        # Initialize Gemini Client
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            logger.error("GEMINI_API_KEY not found in environment")
            self.client = None
        else:
            try:
                self.client = genai.Client(api_key=api_key)
                self.model = GEMINI_MODEL
            except Exception as e:
                logger.error(f"Failed to initialize Gemini Client: {e}")
                self.client = None

    def _get_cache_key(self, question: str, start_date: date, end_date: date) -> str:
        """Generate cache key from query parameters"""
        key_str = f"{question}:{start_date}:{end_date}"
        return hashlib.md5(key_str.encode()).hexdigest()

    def _is_budget_optimization_query(self, question: str) -> bool:
        """Detect if the query is about budget optimization"""
        budget_keywords = [
            'budget', 'optimize', 'allocation', 'reallocate', 'redistribute',
            'increase budget', 'decrease budget', 'pause campaign',
            'where should i spend', 'how should i allocate'
        ]
        question_lower = question.lower()
        return any(keyword in question_lower for keyword in budget_keywords)

    async def _generate_budget_recommendations(self, start_date: date, end_date: date) -> str:
        """Generate smart budget optimization recommendations with comparative analysis"""
        try:
            # Generate smart recommendations
            analysis = self.budget_optimizer.generate_smart_recommendations(start_date, end_date)

            # Check for errors
            if 'error' in analysis:
                markdown_response = f"# ⚠️ {analysis['error']}\n\n"
                markdown_response += f"{analysis['message']}\n\n"
                if 'suggestions' in analysis:
                    markdown_response += "## Recommendations:\n\n"
                    for suggestion in analysis['suggestions']:
                        markdown_response += f"- {suggestion}\n"
                return markdown_response

            # Format comprehensive recommendations as markdown
            markdown_response = "# 🎯 Smart Budget Optimization Report\n\n"

            # Period comparison
            period_info = analysis['period_comparison']
            markdown_response += f"**Analysis Period:** {period_info['current_period']} ({period_info['period_length_days']} days)\n"
            markdown_response += f"**Compared to:** {period_info['previous_period']}\n\n"
            markdown_response += "---\n\n"

            # Quick action items
            if analysis['action_items']:
                markdown_response += "## 💡 Top Priority Actions\n\n"
                for action in analysis['action_items']:
                    markdown_response += f"- {action}\n"
                markdown_response += "\n---\n\n"

            # Improving campaigns
            if analysis['improving_campaigns']:
                markdown_response += "## 🚀 Campaigns Trending UP (Increase Budget)\n\n"
                markdown_response += "| Campaign | Current ROAS | Improvement | Spend | Action |\n"
                markdown_response += "|----------|--------------|-------------|-------|--------|\n"
                for camp in analysis['improving_campaigns'][:5]:
                    markdown_response += f"| {camp['campaign']} | {camp['current_roas']:.2f}x | +{camp['roas_improvement']:.2f}x | ${camp['spend']:.2f} | {camp['recommendation']} |\n"
                markdown_response += "\n"

            # Declining campaigns
            if analysis['declining_campaigns']:
                markdown_response += "## ⚠️ Campaigns Trending DOWN (Reduce/Pause)\n\n"
                markdown_response += "| Campaign | Current ROAS | Decline | Spend | Action |\n"
                markdown_response += "|----------|--------------|---------|-------|--------|\n"
                for camp in analysis['declining_campaigns'][:5]:
                    markdown_response += f"| {camp['campaign']} | {camp['current_roas']:.2f}x | {camp['roas_decline']:.2f}x | ${camp['spend']:.2f} | {camp['recommendation']} |\n"
                markdown_response += "\n"

            # Best performing ads
            if analysis['best_ads']:
                markdown_response += "## 🎨 Top Performing Creatives\n\n"
                markdown_response += "| Ad Name | ROAS | CTR | Conversions | Creative |\n"
                markdown_response += "|---------|------|-----|-------------|----------|\n"
                for ad in analysis['best_ads'][:5]:
                    markdown_response += f"| {ad['ad_name']} | {ad['roas']:.2f}x | {ad['ctr']:.2f}% | {ad['conversions']} | {ad['title'][:50]} |\n"
                markdown_response += "\n**Recommendation:** Replicate the creative style and messaging from these top performers.\n\n"

            # Targeting insights
            targeting = analysis['targeting_insights']

            # Demographics
            if targeting['best_demographics']:
                markdown_response += "## 🎯 Best Performing Demographics\n\n"
                markdown_response += "| Age | Gender | ROAS | CTR | Conversions |\n"
                markdown_response += "|-----|--------|------|-----|-------------|\n"
                for demo in targeting['best_demographics']:
                    markdown_response += f"| {demo['age']} | {demo['gender']} | {demo['roas']:.2f}x | {demo['ctr']:.2f}% | {demo['conversions']} |\n"
                markdown_response += "\n**Recommendation:** Focus budget on these high-performing demographic segments.\n\n"

            # Placements
            if targeting['best_placements']:
                markdown_response += "## 📱 Best Performing Placements\n\n"
                markdown_response += "| Placement | ROAS | CTR | Conversions |\n"
                markdown_response += "|-----------|------|-----|-------------|\n"
                for place in targeting['best_placements']:
                    markdown_response += f"| {place['placement']} | {place['roas']:.2f}x | {place['ctr']:.2f}% | {place['conversions']} |\n"
                markdown_response += "\n**Recommendation:** Increase bids and budget allocation for top placements.\n\n"

            # Time patterns
            if targeting['best_days']:
                markdown_response += "## 📅 Best Performing Days\n\n"
                markdown_response += "| Day | Avg ROAS | Total Spend | Conversions |\n"
                markdown_response += "|-----|----------|-------------|-------------|\n"
                for day in targeting['best_days']:
                    markdown_response += f"| {day['day']} | {day['avg_roas']:.2f}x | ${day['total_spend']:.2f} | {day['total_conversions']} |\n"
                markdown_response += "\n**Recommendation:** Schedule higher budgets on peak performance days.\n\n"

            # Summary
            markdown_response += "---\n\n"
            markdown_response += "## 📋 Implementation Checklist\n\n"
            markdown_response += "1. ✅ Increase budget for improving campaigns by 30-50%\n"
            markdown_response += "2. ⚠️ Reduce or pause declining campaigns\n"
            markdown_response += "3. 🎨 Create new ads replicating top creative styles\n"
            markdown_response += "4. 🎯 Refine targeting to focus on best demographics\n"
            markdown_response += "5. 📱 Optimize bid adjustments for top placements\n"
            markdown_response += "6. 📅 Schedule budgets around peak performance days\n"
            markdown_response += "7. 📊 Monitor for 48-72 hours and adjust\n"

            return markdown_response

        except Exception as e:
            logger.error(f"Error generating smart budget recommendations: {e}")
            return f"I encountered an error while analyzing your budget optimization: {str(e)}"

    async def query_data(self, question: str) -> AIQueryResponse:
        """
        Processes a natural language query about the ads data.
        """
        if not self.client:
            return AIQueryResponse(
                answer="I'm sorry, I cannot access the AI engine right now. Please check if the GEMINI_API_KEY is properly configured.",
                data=None
            )

        try:
            # Check cache first
            end_date = date.today()
            start_date = end_date - timedelta(days=30)
            cache_key = self._get_cache_key(question, start_date, end_date)

            if cache_key in QUERY_CACHE:
                cached_time, cached_response = QUERY_CACHE[cache_key]
                if time.time() - cached_time < CACHE_TTL:
                    logger.info(f"Cache hit for question: {question[:50]}...")
                    return cached_response
                else:
                    # Cache expired, remove it
                    del QUERY_CACHE[cache_key]

            # Check if this is a budget optimization query
            if self._is_budget_optimization_query(question):
                logger.info("Budget optimization query detected")
                budget_answer = await self._generate_budget_recommendations(start_date, end_date)
                ai_response = AIQueryResponse(answer=budget_answer, data=None)
                # Cache the response
                QUERY_CACHE[cache_key] = (time.time(), ai_response)
                return ai_response

            # Cache miss, proceed with query
            # 1. Fetch relevant context data
            # Use default to last 30 days or calculate from daily_trends if needed
            end_date = date.today()
            start_date = end_date - timedelta(days=30)
            
            # Determine comparison period
            prev_start, prev_end = ComparisonService.calculate_previous_period(start_date, end_date)

            # Fetch campaign-level breakdown
            campaign_data = self.repository.get_campaign_breakdown(
                start_date=start_date,
                end_date=end_date,
                limit=50
            )

            # Fetch aggregated overview for both periods
            overview = self.repository.get_aggregated_metrics(start_date, end_date)
            prev_overview = self.repository.get_aggregated_metrics(prev_start, prev_end)

            # Fetch time-series data
            daily_trends = self.repository.get_time_series(
                start_date=start_date,
                end_date=end_date,
                granularity='day'
            )

            # 2. Prepare context for Gemini
            data_context = {
                "current_period": f"{start_date} to {end_date}",
                "previous_period": f"{prev_start} to {prev_end}",
                "current_overview": overview,
                "previous_overview": prev_overview,
                "campaign_breakdown_current": campaign_data,
                "daily_trends": daily_trends
            }
            
            context_json = json.dumps(data_context, indent=2)
            
            prompt = (
                f"Based on the following Facebook Ads data for the period {start_date} to {end_date}, "
                f"answer this question: '{question}'\n\n"
                f"Data Context:\n{context_json}\n\n"
                "Provide a comprehensive answer in markdown."
            )

            # 3. Call Gemini
            config = types.GenerateContentConfig(
                system_instruction=SYSTEM_INSTRUCTION,
                temperature=0.2
            )

            response = self.client.models.generate_content(
                model=self.model,
                contents=[prompt],
                config=config,
            )

            answer = response.text.strip()

            # 4. Create response
            ai_response = AIQueryResponse(
                answer=answer,
                data=campaign_data if "best" in question.lower() or "top" in question.lower() or "campaign" in question.lower() else None
            )

            # 5. Cache the response
            QUERY_CACHE[cache_key] = (time.time(), ai_response)
            logger.info(f"Cached response for question: {question[:50]}...")

            return ai_response

        except Exception as e:
            logger.error(f"Error in AIService.query_data: {e}")
            return AIQueryResponse(
                answer=f"I encountered an error while analyzing your data: {str(e)}",
                data=None
            )

    async def get_suggested_questions(self) -> Dict[str, List[str]]:
        """
        Generate dynamic suggested questions based on available data.
        """
        suggestions = [
            "What are my top performing campaigns this week?",
            "Show me campaign performance trends",
            "Which campaigns have the best ROAS?",
            "How is my overall spend trending?",
            "What's my average CPA across all campaigns?"
        ]

        try:
            # Check if we have video data
            has_video = self.db.execute(text("""
                SELECT EXISTS(
                    SELECT 1 FROM fact_core_metrics
                    WHERE video_plays > 0
                    LIMIT 1
                )
            """)).scalar()

            if has_video:
                suggestions.extend([
                    "Which videos have the best hook rate?",
                    "Show me video engagement metrics",
                    "What's the average watch time for my videos?"
                ])

            # Check for demographic data
            has_demographics = self.db.execute(text("""
                SELECT EXISTS(
                    SELECT 1 FROM fact_core_metrics
                    WHERE age IS NOT NULL
                    LIMIT 1
                )
            """)).scalar()

            if has_demographics:
                suggestions.append("Which age group has the best performance?")

            # Add budget optimization suggestion
            suggestions.append("How should I optimize my budget allocation?")

            # Limit to 9-12 suggestions
            return {"suggestions": suggestions[:12]}

        except Exception as e:
            logger.error(f"Error generating suggestions: {e}")
            # Return default suggestions on error
            return {
                "suggestions": [
                    "What are my top performing campaigns?",
                    "Show me this week's performance",
                    "Which campaigns have the best ROAS?",
                    "How is my spend trending?",
                    "What's my average CPA?",
                    "How should I optimize my budget?"
                ]
            }
