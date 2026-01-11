"""
Metric calculation utilities for Facebook Ads analytics.

This module provides standardized formulas for calculating advertising metrics
like CTR, CPC, CPM, ROAS, CPA, and video engagement metrics.
"""

from typing import Optional


class MetricCalculator:
    """
    Provides static methods for calculating advertising metrics.

    All methods handle division by zero gracefully and return 0.0 when
    the denominator is zero or invalid.
    """

    @staticmethod
    def ctr(clicks: int, impressions: int) -> float:
        """
        Calculate Click-Through Rate.

        Args:
            clicks: Number of clicks
            impressions: Number of impressions

        Returns:
            CTR as a percentage (e.g., 0.35 for 0.35%)
        """
        return (clicks / impressions * 100) if impressions > 0 else 0.0

    @staticmethod
    def cpc(spend: float, clicks: int) -> float:
        """
        Calculate Cost Per Click.

        Args:
            spend: Total spend amount
            clicks: Number of clicks

        Returns:
            Cost per click (e.g., 2.66)
        """
        return (spend / clicks) if clicks > 0 else 0.0

    @staticmethod
    def cpm(spend: float, impressions: int) -> float:
        """
        Calculate Cost Per Mille (cost per 1000 impressions).

        Args:
            spend: Total spend amount
            impressions: Number of impressions

        Returns:
            Cost per 1000 impressions (e.g., 9.23)
        """
        return (spend / impressions * 1000) if impressions > 0 else 0.0

    @staticmethod
    def roas(revenue: float, spend: float, conversions: int = 1) -> Optional[float]:
        """
        Calculate Return on Ad Spend.
        ROAS only exists/shows if there is at least one conversion event.

        Args:
            revenue: Total conversion value
            spend: Total spend amount
            conversions: Number of conversion events (must be > 0)

        Returns:
            ROAS ratio or None if no conversions or spend is 0.
        """
        if spend <= 0 or conversions <= 0:
            return None
        return revenue / spend

    @staticmethod
    def cpa(spend: float, conversions: int) -> float:
        """
        Calculate Cost Per Acquisition based on conversions.

        Args:
            spend: Total spend amount
            conversions: Number of conversions

        Returns:
            Cost per acquisition (e.g., 108.60)
        """
        return (spend / conversions) if conversions > 0 else 0.0

    @staticmethod
    def conversion_rate(conversions: int, clicks: int) -> float:
        """
        Calculate Conversion Rate (CVR).
        Formula: Conversions / Clicks * 100

        Args:
            conversions: Number of conversions
            clicks: Number of clicks

        Returns:
            Conversion rate as a percentage (e.g., 2.5 for 2.5%)
        """
        return (conversions / clicks * 100) if clicks > 0 else 0.0

    @staticmethod
    def hook_rate(video_p25_watched: int, video_plays: int) -> float:
        """
        Calculate Hook Rate (25% video retention).

        This metric shows what percentage of viewers watched at least 25% of the video.

        Args:
            video_p25_watched: Number of viewers who watched to 25%
            video_plays: Total number of video plays

        Returns:
            Hook rate as a percentage (e.g., 65.0 for 65%)
        """
        return (video_p25_watched / video_plays * 100) if video_plays > 0 else 0.0

    @staticmethod
    def completion_rate(video_p100_watched: int, video_plays: int) -> float:
        """
        Calculate Video Completion Rate (100% video retention).

        This metric shows what percentage of viewers watched the entire video.

        Args:
            video_p100_watched: Number of viewers who watched to 100%
            video_plays: Total number of video plays

        Returns:
            Completion rate as a percentage (e.g., 25.0 for 25%)
        """
        return (video_p100_watched / video_plays * 100) if video_plays > 0 else 0.0

    @staticmethod
    def hold_rate(video_p50_watched: int, video_plays: int) -> float:
        """
        Calculate Hold Rate (50% video retention).

        This metric shows what percentage of viewers watched at least 50% of the video.

        Args:
            video_p50_watched: Number of viewers who watched to 50%
            video_plays: Total number of video plays

        Returns:
            Hold rate as a percentage (e.g., 45.0 for 45%)
        """
        return (video_p50_watched / video_plays * 100) if video_plays > 0 else 0.0

    @staticmethod
    def change_percentage(current: float, previous: float) -> Optional[float]:
        """
        Calculate percentage change between two values.

        Args:
            current: Current period value
            previous: Previous period value

        Returns:
            Percentage change (e.g., 24.9 for 24.9% increase)
            Returns None if previous value is 0 (to avoid infinity)
        """
        if current is None or previous is None or previous == 0:
            return None
        return ((current - previous) / previous) * 100
