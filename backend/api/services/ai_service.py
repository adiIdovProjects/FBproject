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
import google.genai as genai
from google.genai import types
from sqlalchemy.orm import Session
from sqlalchemy import text
from backend.api.repositories.account_repository import AccountRepository

from backend.api.repositories.metrics_repository import MetricsRepository
from backend.api.repositories.campaign_repository import CampaignRepository
from backend.api.repositories.adset_repository import AdSetRepository
from backend.api.repositories.ad_repository import AdRepository
from backend.api.repositories.timeseries_repository import TimeSeriesRepository
from backend.api.repositories.breakdown_repository import BreakdownRepository
from backend.api.schemas.responses import AIQueryResponse, ChartConfig
from backend.api.services.budget_optimizer import SmartBudgetOptimizer
from backend.api.services.comparison_service import ComparisonService
from backend.config.settings import GEMINI_MODEL

logger = logging.getLogger(__name__)

# Query result cache (in-memory)
QUERY_CACHE = {}
CACHE_TTL = 3600  # 1 hour

# --- System Instruction for AI Investigator ---
SYSTEM_INSTRUCTION = (
    "You are a Facebook Ads analyst. BE BRIEF AND DIRECT.\n\n"

    "## CRITICAL: Response Length\n"
    "- Maximum 150 words\n"
    "- No lengthy explanations or methodology\n"
    "- Skip obvious observations\n\n"

    "## Response Format:\n"
    "1. **Answer** (1 sentence with the key number)\n"
    "2. **Table** (3-5 rows max, only essential columns)\n"
    "3. **Action** (1 sentence - what to do next)\n\n"

    "## Example Good Response:\n"
    "**Best converting age: 35-64** with 10 conversions.\n\n"
    "| Age | Conversions | ROAS |\n"
    "|-----|-------------|------|\n"
    "| 35-64 | 10 | 2.5x |\n"
    "| 18-34 | 0 | - |\n\n"
    "**Action:** Focus budget on 35-64 age group.\n\n"

    "## Rules:\n"
    "- Answer the question directly in the first line\n"
    "- One small table with top 3-5 results\n"
    "- One action item at the end\n"
    "- Use ✅/⚠️/🔴 for status\n"
    "- No analysis methodology explanations\n"
    "- No caveats unless critical"
)

class AIService:
    """Service for AI-powered data investigation"""

    def __init__(self, db: Session, user_id: Optional[int] = None):
        self.db = db
        self.user_id = user_id
        self.repository = MetricsRepository(db)
        self.campaign_repo = CampaignRepository(db)
        self.adset_repo = AdSetRepository(db)
        self.ad_repo = AdRepository(db)
        self.timeseries_repo = TimeSeriesRepository(db)
        self.breakdown_repo = BreakdownRepository(db)
        # Budget optimizer will be initialized with account_ids when needed
        self.budget_optimizer = None

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

    def _get_user_account_ids(self) -> Optional[List[int]]:
        """Get account IDs for current user (for data filtering)"""
        if not self.user_id:
            return None
        from backend.api.repositories.user_repository import UserRepository
        user_repo = UserRepository(self.db)
        return user_repo.get_user_account_ids(self.user_id)

    def _get_cache_key(self, question: str, start_date: date, end_date: date) -> str:
        """Generate cache key from query parameters (includes user_id for isolation)"""
        key_str = f"{self.user_id}:{question}:{start_date}:{end_date}"
        return hashlib.md5(key_str.encode()).hexdigest()

    def _is_budget_optimization_query(self, question: str) -> bool:
        """Detect if the query is about budget optimization"""
        budget_keywords = [
            'budget', 'optimize', 'allocation', 'reallocate', 'redistribute',
            'increase budget', 'decrease budget', 'pause campaign',
            'where should i spend', 'how should i allocate',
            'scale', 'scaling', 'should i scale', 'campaigns should i scale'
        ]
        question_lower = question.lower()
        return any(keyword in question_lower for keyword in budget_keywords)

    async def _generate_budget_recommendations(self, start_date: date, end_date: date, account_ids: Optional[List[int]] = None) -> str:
        """Generate smart budget optimization recommendations with comparative analysis"""
        try:
            # Initialize budget optimizer with account filtering
            budget_optimizer = SmartBudgetOptimizer(self.db, account_ids=account_ids)
            # Generate smart recommendations
            analysis = budget_optimizer.generate_smart_recommendations(start_date, end_date)

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

    async def query_data(self, question: str, account_id: Optional[str] = None) -> AIQueryResponse:
        """
        Processes a natural language query about the ads data.
        SECURITY: Only queries data from accounts the user has access to.
        """
        if not self.client:
            return AIQueryResponse(
                answer="I'm sorry, I cannot access the AI engine right now. Please check if the GEMINI_API_KEY is properly configured.",
                data=None
            )

        try:
            # SECURITY: Get user's allowed account IDs
            user_account_ids = self._get_user_account_ids() or []

            # SECURITY: Validate account_id if provided, otherwise use all user accounts
            if account_id:
                account_id_int = int(account_id)
                if account_id_int not in user_account_ids:
                    logger.warning(f"User {self.user_id} attempted to access unauthorized account {account_id}")
                    return AIQueryResponse(
                        answer="Access denied. You don't have permission to access this account's data.",
                        data=None
                    )
                filtered_account_ids = [account_id_int]
            else:
                filtered_account_ids = user_account_ids

            # Check if user has any accounts
            if not filtered_account_ids:
                return AIQueryResponse(
                    answer="No ad accounts found. Please connect your Facebook ad accounts first.",
                    data=None
                )

            # Check cache first
            end_date = date.today()
            start_date = end_date - timedelta(days=30)
            cache_key = self._get_cache_key(f"{question}:{account_id}", start_date, end_date)

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
                # SECURITY FIX: Pass account_ids for filtering
                budget_answer = await self._generate_budget_recommendations(start_date, end_date, account_ids=filtered_account_ids)
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

            # SECURITY FIX: Fetch campaign-level breakdown with account filtering
            campaign_data = self.campaign_repo.get_campaign_breakdown(
                start_date=start_date,
                end_date=end_date,
                limit=50,
                account_ids=filtered_account_ids
            )

            # SECURITY FIX: Fetch aggregated overview for both periods with account filtering
            overview = self.repository.get_aggregated_metrics(start_date, end_date, account_ids=filtered_account_ids)
            prev_overview = self.repository.get_aggregated_metrics(prev_start, prev_end, account_ids=filtered_account_ids)

            # SECURITY FIX: Fetch time-series data with account filtering
            daily_trends = self.timeseries_repo.get_time_series(
                start_date=start_date,
                end_date=end_date,
                granularity='day',
                account_ids=filtered_account_ids
            )

            # Fetch ad set breakdown (already ordered by spend DESC in repository)
            adset_data = self.adset_repo.get_adset_breakdown(
                start_date=start_date,
                end_date=end_date,
                account_ids=filtered_account_ids
            )[:10]  # Top 10

            # Fetch ad breakdown (already ordered by spend DESC in repository)
            ad_data = self.ad_repo.get_ad_breakdown(
                start_date=start_date,
                end_date=end_date,
                account_ids=filtered_account_ids
            )[:10]  # Top 10

            # Fetch demographics breakdown (age/gender)
            demographics = self.breakdown_repo.get_age_gender_breakdown(
                start_date=start_date,
                end_date=end_date,
                group_by='both',
                account_ids=filtered_account_ids
            )

            # Fetch placement breakdown
            placements = self.breakdown_repo.get_placement_breakdown(
                start_date=start_date,
                end_date=end_date,
                account_ids=filtered_account_ids
            )

            # Fetch country breakdown (top 10)
            countries = self.breakdown_repo.get_country_breakdown(
                start_date=start_date,
                end_date=end_date,
                top_n=10,
                account_ids=filtered_account_ids
            )

            # Fetch platform breakdown
            platforms = self.breakdown_repo.get_platform_breakdown(
                start_date=start_date,
                end_date=end_date,
                account_ids=filtered_account_ids
            )

            # SECURITY FIX: Fetch Account Context only if authorized
            account_context_str = ""
            if account_id and int(account_id) in user_account_ids:
                try:
                    account_repo = AccountRepository(self.db)
                    quiz = account_repo.get_account_quiz(int(account_id))
                    if quiz:
                        parts = []
                        if quiz.get('business_description'):
                            parts.append(f"Business Description: {quiz['business_description']}")
                        if quiz.get('primary_goal'):
                            parts.append(f"Priority Goal: {quiz['primary_goal']}")
                        if quiz.get('industry'):
                            parts.append(f"Industry: {quiz['industry']}")
                        
                        if parts:
                            account_context_str = "**BUSINESS CONTEXT**:\n" + "\n".join(parts) + "\n"
                except Exception as ex:
                    logger.warning(f"Failed to fetch account context: {ex}")


            # 2. Prepare context for Gemini
            data_context = {
                "current_period": f"{start_date} to {end_date}",
                "previous_period": f"{prev_start} to {prev_end}",
                "current_overview": overview,
                "previous_overview": prev_overview,
                "campaign_breakdown": campaign_data[:10],
                "adset_breakdown": adset_data[:5],
                "ad_breakdown": ad_data[:5],
                "demographics_breakdown": demographics[:5],
                "placement_breakdown": placements,
                "country_breakdown": countries[:5],
                "platform_breakdown": platforms,
                "daily_trends": daily_trends
            }
            
            context_json = json.dumps(data_context, indent=2, ensure_ascii=False)
            
            prompt = (
                f"{account_context_str}"
                f"Question: {question}\n\n"
                f"Period: {start_date} to {end_date}\n\n"
                f"Data:\n{context_json}"
            )

            # 3. Call Gemini with system instruction
            response = self.client.models.generate_content(
                model=self.model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    system_instruction=SYSTEM_INSTRUCTION,
                    temperature=0.2
                )
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
        SECURITY: Only checks data from user's accounts.
        """
        suggestions = [
            "What are my top performing campaigns this week?",
            "Show me campaign performance trends",
            "Which campaigns have the best ROAS?",
            "How is my overall spend trending?",
            "What's my average CPA across all campaigns?"
        ]

        try:
            # SECURITY FIX: Get user's account IDs for filtering
            user_account_ids = self._get_user_account_ids() or []

            # Build account filter
            if user_account_ids:
                placeholders = ', '.join([f':acc_id_{i}' for i in range(len(user_account_ids))])
                account_filter = f"AND f.account_id IN ({placeholders})"
                params = {f'acc_id_{i}': acc_id for i, acc_id in enumerate(user_account_ids)}
            else:
                # No accounts - skip checks
                return {"suggestions": suggestions[:12]}

            # Check if user has video data
            has_video = self.db.execute(text(f"""
                SELECT EXISTS(
                    SELECT 1 FROM fact_core_metrics f
                    WHERE f.video_plays > 0
                    {account_filter}
                    LIMIT 1
                )
            """), params).scalar()

            if has_video:
                suggestions.extend([
                    "Which videos have the best hook rate?",
                    "Show me video engagement metrics",
                    "What's the average watch time for my videos?"
                ])

            # Check for demographic data in user's accounts
            has_demographics = self.db.execute(text(f"""
                SELECT EXISTS(
                    SELECT 1 FROM fact_age_gender_metrics f
                    WHERE f.age_range IS NOT NULL
                    {account_filter}
                    LIMIT 1
                )
            """), params).scalar()

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
