"""
Creative Insights Service - AI-Powered Creative Analysis

Analyzes creative performance patterns, themes, CTA effectiveness,
and ad fatigue using pattern detection and Gemini AI.
"""

import os
import json
import logging
import hashlib
import time
from datetime import date, timedelta
from typing import Dict, Any, List, Optional
import google.genai as genai
from google.genai import types
from sqlalchemy.orm import Session

from backend.api.repositories.creative_analysis_repository import CreativeAnalysisRepository
from backend.utils.creative_pattern_detector import CreativePatternDetector
from backend.config.settings import GEMINI_MODEL
from backend.utils.cache_utils import TTLCache

logger = logging.getLogger(__name__)

# Creative analysis cache with size limit
CREATIVE_CACHE = TTLCache(ttl_seconds=3600, max_size=100)

CREATIVE_ANALYSIS_PROMPT = """Analyze creative/ad performance for the period {start_date} to {end_date} and provide SHORT insights.
Respond in {target_lang}.

{no_roas_instruction}

**What are themes?** Themes are categories we detect from ad copy (e.g., 'urgency', 'social proof', 'discount', 'benefit-focused').

Rules:
- Maximum 4-5 bullet points
- Each bullet: 1 sentence with specific numbers
- NO long paragraphs
- Use simple language
- Always use AD NAME (not creative ID) when mentioning specific ads
- Focus on: hook rate, view rate, CTR, format performance

Format:

🎨 **{themes_label}:** Your top messaging themes are: [list 2-3 themes detected with their performance].

🏆 **{best_ads_label}:** [Name 1-2 best performing ads by name. Include hook rate, view rate, CTR]

📊 **{format_winner_label}:** [Compare Image vs Video vs Carousel performance. Which format has best CTR/hook rate?]

⚠️ **{fatigue_alert_label}:** [Name any ads with declining CTR that need refresh. Use ad name, not ID]

💡 **{test_idea_label}:** [One specific creative test based on what's working]
"""

# Translated labels for creative analysis
CREATIVE_LABELS = {
    'en': {'themes': 'Themes', 'best_ads': 'Best Ads', 'format_winner': 'Format Winner', 'fatigue_alert': 'Fatigue Alert', 'test_idea': 'Test Idea'},
    'he': {'themes': 'נושאים', 'best_ads': 'מודעות מובילות', 'format_winner': 'פורמט מנצח', 'fatigue_alert': 'התראת עייפות', 'test_idea': 'רעיון לבדיקה'},
    'ar': {'themes': 'المواضيع', 'best_ads': 'أفضل الإعلانات', 'format_winner': 'الصيغة الفائزة', 'fatigue_alert': 'تنبيه الإرهاق', 'test_idea': 'فكرة اختبار'},
    'de': {'themes': 'Themen', 'best_ads': 'Beste Anzeigen', 'format_winner': 'Format-Gewinner', 'fatigue_alert': 'Ermüdungswarnung', 'test_idea': 'Testidee'},
    'fr': {'themes': 'Thèmes', 'best_ads': 'Meilleures Pubs', 'format_winner': 'Format Gagnant', 'fatigue_alert': 'Alerte Fatigue', 'test_idea': 'Idée de Test'},
}


class CreativeInsightsService:
    """Service for AI-powered creative performance analysis"""

    def __init__(self, db: Session, user_id: Optional[int] = None):
        self.db = db
        self.user_id = user_id
        self.repository = CreativeAnalysisRepository(db)
        self.pattern_detector = CreativePatternDetector()

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

    def _get_cache_key(
        self,
        start_date: date,
        end_date: date,
        campaign_id: Optional[int],
        locale: str = "en"
    ) -> str:
        """Generate cache key from parameters"""
        key_str = f"creative:{start_date}:{end_date}:{campaign_id}:{locale}"
        return hashlib.md5(key_str.encode()).hexdigest()

    def analyze_creative_patterns(
        self,
        start_date: date,
        end_date: date,
        campaign_id: Optional[int] = None,
        account_ids: Optional[List[int]] = None,
        locale: str = "en"
    ) -> Dict[str, Any]:
        """
        Generate comprehensive creative performance analysis.

        Args:
            start_date: Start date for analysis
            end_date: End date for analysis
            campaign_id: Optional campaign filter
            account_ids: Optional account filter

        Returns:
            Dict with creative analysis and AI insights
        """
        if not self.client:
            return {
                'error': 'AI service unavailable',
                'message': 'GEMINI_API_KEY not configured',
                'data': None
            }

        try:
            # Check cache
            cache_key = self._get_cache_key(start_date, end_date, campaign_id, locale)
            cached_response = CREATIVE_CACHE.get(cache_key)
            if cached_response:
                logger.info(f"Cache hit for creative analysis: {start_date} to {end_date}")
                return cached_response

            # Fetch creative performance data
            creatives = self.repository.get_creative_performance(
                start_date=start_date,
                end_date=end_date,
                campaign_id=campaign_id,
                account_ids=account_ids,
                min_impressions=1000
            )

            if not creatives:
                return {
                    'error': 'no_data',
                    'message': f'No creative data found for period {start_date} to {end_date}',
                    'data': None
                }

            # Analyze themes using pattern detector
            theme_performance = self.pattern_detector.analyze_theme_performance(creatives)

            # Get CTA effectiveness
            cta_performance = self.repository.get_cta_effectiveness(
                start_date=start_date,
                end_date=end_date,
                account_ids=account_ids,
                min_creatives=2
            )

            # Detect fatigued creatives
            fatigued_creatives = self.repository.get_fatigued_creatives(
                lookback_days=(end_date - start_date).days,
                fatigue_threshold=-20.0,
                min_impressions=5000
            )

            # Identify winning patterns
            winning_patterns = self.pattern_detector.identify_winning_patterns(
                creatives=creatives,
                min_roas=2.0,
                min_conversions=5
            )

            # Get format performance (Image vs Video vs Carousel)
            format_performance = self.repository.get_format_performance(
                start_date=start_date,
                end_date=end_date,
                account_ids=account_ids
            )

            # Prepare context for Gemini
            context = {
                'analysis_period': f'{start_date} to {end_date}',
                'total_creatives': len(creatives),
                'theme_performance': theme_performance,
                'cta_performance': cta_performance,
                'format_performance': format_performance,  # Image vs Video vs Carousel comparison
                'fatigued_creatives': fatigued_creatives[:10],  # Top 10 most fatigued
                'winning_patterns': winning_patterns,
                'top_performers': creatives[:10],  # Top 10 by ROAS
                'campaign_filter': f'Campaign ID: {campaign_id}' if campaign_id else 'All campaigns'
            }

            context_json = json.dumps(context, indent=2, default=str, ensure_ascii=False)

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

            # Check if we have ROAS data
            has_roas = any(c.get('roas', 0) > 0 for c in creatives)
            no_roas_instruction = ""
            if not has_roas:
                no_roas_instruction = "IMPORTANT: There is NO ROAS data. Do NOT mention ROAS at all. Focus ONLY on: hook rate, view rate (video), CTR, and conversions."

            # Get translated labels
            labels = CREATIVE_LABELS.get(locale, CREATIVE_LABELS['en'])

            prompt = CREATIVE_ANALYSIS_PROMPT.format(
                target_lang=target_lang,
                no_roas_instruction=no_roas_instruction,
                start_date=start_date.isoformat(),
                end_date=end_date.isoformat(),
                themes_label=labels['themes'],
                best_ads_label=labels['best_ads'],
                format_winner_label=labels['format_winner'],
                fatigue_alert_label=labels['fatigue_alert'],
                test_idea_label=labels['test_idea']
            ) + f"\n\nData:\n{context_json}"

            # Call Gemini
            response = self.client.models.generate_content(
                model=self.model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    temperature=0.2
                )
            )

            analysis_text = response.text.strip()

            # Prepare response
            result = {
                'analysis': analysis_text,
                'data': {
                    'total_creatives': len(creatives),
                    'theme_performance': theme_performance,
                    'cta_performance': cta_performance,
                    'format_performance': format_performance,  # Image vs Video vs Carousel
                    'fatigued_creatives_count': len(fatigued_creatives),
                    'fatigued_creatives': fatigued_creatives[:10],
                    'top_performers': creatives[:5],  # Top 5 for display
                    'winning_patterns': winning_patterns
                },
                'metadata': {
                    'start_date': start_date.isoformat(),
                    'end_date': end_date.isoformat(),
                    'campaign_id': campaign_id,
                    'generated_at': date.today().isoformat()
                }
            }

            # Cache the result
            CREATIVE_CACHE.set(cache_key, result)
            logger.info(f"Cached creative analysis for {start_date} to {end_date}")

            return result

        except Exception as e:
            logger.error(f"Error in creative pattern analysis: {e}")
            return {
                'error': 'analysis_failed',
                'message': f'Failed to generate creative analysis: {str(e)}',
                'data': None
            }

    def get_creative_fatigue_report(
        self,
        lookback_days: int = 30,
        locale: str = "en",
        account_ids: Optional[List[int]] = None
    ) -> Dict[str, Any]:
        """
        Generate focused ad fatigue report.

        Args:
            lookback_days: Days to analyze
            locale: Language for recommendations
            account_ids: Optional list of account IDs to filter by

        Returns:
            Fatigue report with refresh recommendations
        """
        try:
            fatigued = self.repository.get_fatigued_creatives(
                lookback_days=lookback_days,
                fatigue_threshold=-15.0,  # More sensitive threshold
                min_impressions=3000,
                account_ids=account_ids
            )

            if not fatigued:
                return {
                    'message': 'No fatigued creatives detected',
                    'fatigued_count': 0,
                    'data': []
                }

            # Categorize by severity
            critical = [c for c in fatigued if c['fatigue_pct'] <= -30]
            warning = [c for c in fatigued if -30 < c['fatigue_pct'] <= -20]
            monitor = [c for c in fatigued if -20 < c['fatigue_pct'] <= -15]

            return {
                'summary': {
                    'total_fatigued': len(fatigued),
                    'critical_count': len(critical),
                    'warning_count': len(warning),
                    'monitor_count': len(monitor)
                },
                'critical_refreshes': critical,
                'warning_refreshes': warning,
                'monitor_closely': monitor,
                'recommendations': self._generate_fatigue_recommendations(critical, warning, locale)
            }

        except Exception as e:
            logger.error(f"Error generating fatigue report: {e}")
            return {
                'error': 'report_failed',
                'message': f'Failed to generate fatigue report: {str(e)}'
            }

    def _generate_fatigue_recommendations(
        self,
        critical: List[Dict],
        warning: List[Dict],
        locale: str = "en"
    ) -> List[str]:
        """Generate action items for fatigued creatives"""
        recommendations = []

        # Define translations
        translations = {
            'en': {
                'urgent': "🔴 URGENT: Pause or refresh {count} critically fatigued ads immediately (CTR declined >30%)",
                'warning': "⚠️ Plan refreshes for {count} ads showing significant fatigue (CTR declined 20-30%)",
                'new_vars': "💡 Create new ad variations with different hooks/angles",
                'new_formats': "🎨 Test new creative formats (if using images, try video and vice versa)",
                'review': "📊 Review winning ads from historical analysis for inspiration"
            },
            'he': {
                'urgent': "🔴 דחוף: עצור או רענן {count} מודעות שחוקות באופן קריטי (CTR ירד >30%)",
                'warning': "⚠️ תכנן רענון עבור {count} מודעות המראות שחיקה משמעותית (CTR ירד 20-30%)",
                'new_vars': "💡 צור וריאציות חדשות עם זוויות/הוקים שונים",
                'new_formats': "🎨 בדוק פורמטים חדשים (אם משתמשים בתמונות, נסה וידאו ולהפך)",
                'review': "📊 סקור מודעות מנצחות מהניתוח ההיסטורי להשראה"
            },
            # Add other languages as needed, fallback to 'en'
        }
        
        t = translations.get(locale, translations['en'])

        if critical:
            recommendations.append(t['urgent'].format(count=len(critical)))

        if warning:
            recommendations.append(t['warning'].format(count=len(warning)))

        recommendations.extend([
            t['new_vars'],
            t['new_formats'],
            t['review']
        ])

        return recommendations
