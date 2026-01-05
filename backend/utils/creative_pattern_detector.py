"""
Creative Pattern Detector

Analyzes creative copy (titles and bodies) to identify themes and patterns
using keyword-based classification.
"""

from typing import List, Dict, Any, Set
import re


class CreativePatternDetector:
    """
    Detects themes and patterns in creative copy using keyword matching.
    Simple but effective approach for identifying messaging strategies.
    """

    # Theme keyword dictionary
    THEME_KEYWORDS = {
        'urgency': [
            'limited time', 'now', 'today', 'hurry', 'expires',
            'ending soon', 'last chance', 'don\'t miss', 'act fast',
            'only', 'until', 'while supplies', 'rush', 'instant'
        ],
        'discount': [
            '%', 'off', 'sale', 'deal', 'save', 'discount',
            'promo', 'special', 'price', 'cheap', 'affordable',
            'bargain', 'clearance', 'reduced', 'cut'
        ],
        'social_proof': [
            'customers', '5 star', 'trusted', 'rated', 'reviews',
            'testimonial', 'popular', 'best-selling', 'award',
            'verified', 'recommended', '#1', 'top rated', 'people love'
        ],
        'problem_solution': [
            'struggle', 'tired of', 'solution', 'fix', 'solve',
            'problem', 'help', 'eliminate', 'overcome', 'end',
            'stop', 'prevent', 'avoid', 'cure', 'relief'
        ],
        'benefit_focused': [
            'get', 'achieve', 'transform', 'improve', 'boost',
            'enhance', 'increase', 'grow', 'gain', 'unlock',
            'discover', 'learn', 'master', 'maximize', 'optimize'
        ],
        'question': [
            '?', 'are you', 'do you', 'want to', 'have you',
            'why', 'what', 'when', 'where', 'who', 'how'
        ],
        'exclusivity': [
            'exclusive', 'members only', 'vip', 'private',
            'invitation', 'select', 'premium', 'elite',
            'limited access', 'special access'
        ],
        'guarantee': [
            'guarantee', 'promise', 'refund', 'money back',
            'risk-free', 'no risk', 'satisfaction', 'warranty',
            '100%', 'certified', 'assured'
        ],
        'new_trending': [
            'new', 'latest', 'just launched', 'introducing',
            'trending', 'hot', 'fresh', 'now available',
            'announcement', 'unveil'
        ],
        'educational': [
            'how to', 'learn', 'guide', 'tips', 'secrets',
            'discover', 'find out', 'revealed', 'tutorial',
            'course', 'training', 'teach', 'show you'
        ]
    }

    @classmethod
    def detect_themes(cls, text: str) -> List[str]:
        """
        Detect themes present in creative text.

        Args:
            text: Creative title or body text

        Returns:
            List of detected theme names
        """
        if not text:
            return []

        text_lower = text.lower()
        detected_themes = []

        for theme, keywords in cls.THEME_KEYWORDS.items():
            if any(keyword in text_lower for keyword in keywords):
                detected_themes.append(theme)

        return detected_themes

    @classmethod
    def classify_creative(cls, creative: Dict[str, Any]) -> Dict[str, Any]:
        """
        Classify a creative by analyzing title, body, and CTA.

        Args:
            creative: Dict with 'title', 'body', 'call_to_action_type'

        Returns:
            Dict with detected themes and classification
        """
        title = creative.get('title', '')
        body = creative.get('body', '')
        cta = creative.get('call_to_action_type', '')

        # Combine title and body for analysis
        combined_text = f"{title} {body}"

        # Detect themes
        themes = cls.detect_themes(combined_text)

        # Calculate text characteristics
        word_count = len(combined_text.split())
        has_emoji = bool(re.search(r'[\U0001F600-\U0001F64F]', combined_text))
        has_numbers = bool(re.search(r'\d', combined_text))
        has_question = '?' in combined_text
        has_exclamation = '!' in combined_text

        return {
            'creative_id': creative.get('creative_id'),
            'themes': themes,
            'primary_theme': themes[0] if themes else 'generic',
            'cta_type': cta,
            'word_count': word_count,
            'has_emoji': has_emoji,
            'has_numbers': has_numbers,
            'has_question': has_question,
            'has_exclamation': has_exclamation,
            'title_length': len(title),
            'body_length': len(body)
        }

    @classmethod
    def analyze_theme_performance(
        cls,
        creatives: List[Dict[str, Any]]
    ) -> Dict[str, Dict[str, Any]]:
        """
        Aggregate performance metrics by theme.

        Args:
            creatives: List of creatives with performance data

        Returns:
            Dict mapping theme -> aggregated performance metrics
        """
        theme_stats = {}

        for creative in creatives:
            classification = cls.classify_creative(creative)
            themes = classification['themes']

            if not themes:
                themes = ['generic']

            for theme in themes:
                if theme not in theme_stats:
                    theme_stats[theme] = {
                        'creative_count': 0,
                        'total_spend': 0,
                        'total_impressions': 0,
                        'total_clicks': 0,
                        'total_conversions': 0,
                        'total_purchase_value': 0,
                        'ctr_values': [],
                        'roas_values': []
                    }

                stats = theme_stats[theme]
                stats['creative_count'] += 1
                stats['total_spend'] += creative.get('spend', 0)
                stats['total_impressions'] += creative.get('impressions', 0)
                stats['total_clicks'] += creative.get('clicks', 0)
                stats['total_conversions'] += creative.get('conversions', 0)
                stats['total_purchase_value'] += creative.get('purchase_value', 0)

                # Track individual CTR/ROAS for averaging
                if creative.get('ctr', 0) > 0:
                    stats['ctr_values'].append(creative['ctr'])
                if creative.get('roas', 0) > 0:
                    stats['roas_values'].append(creative['roas'])

        # Calculate averages
        for theme, stats in theme_stats.items():
            stats['avg_ctr'] = (
                sum(stats['ctr_values']) / len(stats['ctr_values'])
                if stats['ctr_values'] else 0
            )
            stats['avg_roas'] = (
                sum(stats['roas_values']) / len(stats['roas_values'])
                if stats['roas_values'] else 0
            )
            # Calculate overall ROAS from totals
            stats['overall_roas'] = (
                stats['total_purchase_value'] / stats['total_spend']
                if stats['total_spend'] > 0 else 0
            )
            # Clean up temporary lists
            del stats['ctr_values']
            del stats['roas_values']

        return theme_stats

    @classmethod
    def compare_cta_types(
        cls,
        creatives: List[Dict[str, Any]]
    ) -> Dict[str, Dict[str, Any]]:
        """
        Compare performance across CTA types.

        Args:
            creatives: List of creatives with performance data

        Returns:
            Dict mapping CTA type -> performance metrics
        """
        cta_stats = {}

        for creative in creatives:
            cta = creative.get('call_to_action_type', 'NONE')

            if not cta or cta == '':
                cta = 'NONE'

            if cta not in cta_stats:
                cta_stats[cta] = {
                    'creative_count': 0,
                    'total_conversions': 0,
                    'total_spend': 0,
                    'total_purchase_value': 0,
                    'avg_ctr': 0,
                    'avg_roas': 0
                }

            stats = cta_stats[cta]
            stats['creative_count'] += 1
            stats['total_conversions'] += creative.get('conversions', 0)
            stats['total_spend'] += creative.get('spend', 0)
            stats['total_purchase_value'] += creative.get('purchase_value', 0)

        # Calculate metrics
        for cta, stats in cta_stats.items():
            if stats['total_spend'] > 0:
                stats['avg_roas'] = stats['total_purchase_value'] / stats['total_spend']

        return cta_stats

    @classmethod
    def identify_winning_patterns(
        cls,
        creatives: List[Dict[str, Any]],
        min_roas: float = 2.0,
        min_conversions: int = 5
    ) -> Dict[str, List[Dict[str, Any]]]:
        """
        Identify high-performing creative patterns.

        Args:
            creatives: List of creatives with performance data
            min_roas: Minimum ROAS threshold
            min_conversions: Minimum conversions threshold

        Returns:
            Dict with winning patterns categorized by type
        """
        winners = {
            'high_roas_creatives': [],
            'common_themes': [],
            'effective_ctas': [],
            'winning_characteristics': {}
        }

        # Find high ROAS creatives
        for creative in creatives:
            if (creative.get('roas', 0) >= min_roas and
                creative.get('conversions', 0) >= min_conversions):

                classification = cls.classify_creative(creative)
                winners['high_roas_creatives'].append({
                    'creative_id': creative['creative_id'],
                    'title': creative.get('title', '')[:100],
                    'roas': creative['roas'],
                    'conversions': creative['conversions'],
                    'themes': classification['themes'],
                    'cta': classification['cta_type']
                })

        # Analyze theme distribution among winners
        theme_counts = {}
        for winner in winners['high_roas_creatives']:
            for theme in winner['themes']:
                theme_counts[theme] = theme_counts.get(theme, 0) + 1

        # Sort themes by frequency
        winners['common_themes'] = sorted(
            [{'theme': k, 'count': v} for k, v in theme_counts.items()],
            key=lambda x: x['count'],
            reverse=True
        )

        return winners
