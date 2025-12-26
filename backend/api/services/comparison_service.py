"""
Period comparison service for calculating changes between time periods.

This module provides utilities for comparing metrics between different time periods
and calculating percentage changes.
"""

from datetime import date, timedelta
from typing import Tuple, Optional, Dict, Any
import logging

logger = logging.getLogger(__name__)


class ComparisonService:
    """Service for period comparison calculations"""

    @staticmethod
    def calculate_previous_period(
        start_date: date,
        end_date: date
    ) -> Tuple[date, date]:
        """
        Calculate the previous period date range of equal length.

        Given a current period, returns the immediately preceding period
        of the same duration.

        Args:
            start_date: Current period start date
            end_date: Current period end date

        Returns:
            Tuple of (previous_start_date, previous_end_date)

        Example:
            Current: 2024-01-15 to 2024-01-31 (16 days)
            Previous: 2023-12-30 to 2024-01-14 (16 days)
        """
        days_diff = (end_date - start_date).days + 1
        previous_end = start_date - timedelta(days=1)
        previous_start = previous_end - timedelta(days=days_diff - 1)

        logger.debug(
            f"Calculated previous period: {previous_start} to {previous_end} "
            f"(current: {start_date} to {end_date}, duration: {days_diff} days)"
        )

        return previous_start, previous_end

    @staticmethod
    def calculate_change_percentage(
        current: float,
        previous: float
    ) -> Optional[float]:
        """
        Calculate percentage change between two values.

        Args:
            current: Current period value
            previous: Previous period value

        Returns:
            Percentage change (positive = increase, negative = decrease)
            Returns None if previous value is 0 (to avoid division by zero)

        Example:
            current=150, previous=100 → 50.0 (50% increase)
            current=75, previous=100 → -25.0 (25% decrease)
        """
        if previous == 0:
            return None

        change = ((current - previous) / previous) * 100
        return round(change, 2)

    @staticmethod
    def calculate_absolute_change(
        current: float,
        previous: float
    ) -> float:
        """
        Calculate absolute change between two values.

        Args:
            current: Current period value
            previous: Previous period value

        Returns:
            Absolute change (current - previous)
        """
        return current - previous

    @staticmethod
    def get_comparison_insights(
        current_metrics: Dict[str, Any],
        previous_metrics: Dict[str, Any]
    ) -> Dict[str, str]:
        """
        Generate human-readable insights from metric comparisons.

        Args:
            current_metrics: Current period metrics dict
            previous_metrics: Previous period metrics dict

        Returns:
            Dict of metric_name -> insight_message

        Example:
            {
                "spend": "Increased by 24.9% ($3,071 more)",
                "ctr": "Decreased by 5.2%",
                "roas": "Improved from 1.60 to 1.88"
            }
        """
        insights = {}

        metric_configs = {
            'spend': {'format': 'currency', 'better': 'higher'},
            'impressions': {'format': 'number', 'better': 'higher'},
            'clicks': {'format': 'number', 'better': 'higher'},
            'ctr': {'format': 'percentage', 'better': 'higher'},
            'cpc': {'format': 'currency', 'better': 'lower'},
            'cpm': {'format': 'currency', 'better': 'lower'},
            'roas': {'format': 'ratio', 'better': 'higher'},
            'cpa': {'format': 'currency', 'better': 'lower'},
        }

        for metric_name, config in metric_configs.items():
            if metric_name not in current_metrics or metric_name not in previous_metrics:
                continue

            current_val = current_metrics[metric_name]
            previous_val = previous_metrics[metric_name]

            if previous_val == 0:
                insights[metric_name] = f"New activity (was 0)"
                continue

            pct_change = ComparisonService.calculate_change_percentage(current_val, previous_val)
            abs_change = ComparisonService.calculate_absolute_change(current_val, previous_val)

            if pct_change is None:
                insights[metric_name] = "No previous data"
                continue

            # Determine if change is positive or negative based on "better" direction
            is_improvement = (
                (config['better'] == 'higher' and pct_change > 0) or
                (config['better'] == 'lower' and pct_change < 0)
            )

            change_direction = "Increased" if pct_change > 0 else "Decreased"
            if abs(pct_change) < 0.1:
                insights[metric_name] = "No significant change"
                continue

            # Format absolute change based on metric type
            if config['format'] == 'currency':
                abs_change_str = f"${abs(abs_change):,.2f}"
            elif config['format'] == 'percentage':
                abs_change_str = f"{abs(abs_change):.2f}pp"  # percentage points
            else:
                abs_change_str = f"{abs(abs_change):,.0f}"

            direction_word = "more" if abs_change > 0 else "less"

            insights[metric_name] = (
                f"{change_direction} by {abs(pct_change):.1f}% "
                f"({abs_change_str} {direction_word})"
            )

        return insights

    @staticmethod
    def compare_metrics_dict(
        current_metrics: Dict[str, Any],
        previous_metrics: Dict[str, Any]
    ) -> Dict[str, Dict[str, Any]]:
        """
        Compare two metrics dictionaries and return detailed comparison.

        Args:
            current_metrics: Current period metrics
            previous_metrics: Previous period metrics

        Returns:
            Dict with structure:
            {
                "metric_name": {
                    "current": float,
                    "previous": float,
                    "change_pct": float,
                    "change_abs": float,
                    "insight": str
                }
            }
        """
        comparison = {}
        insights = ComparisonService.get_comparison_insights(current_metrics, previous_metrics)

        for metric_name in current_metrics.keys():
            if metric_name not in previous_metrics:
                continue

            current_val = current_metrics[metric_name]
            previous_val = previous_metrics[metric_name]

            comparison[metric_name] = {
                "current": current_val,
                "previous": previous_val,
                "change_pct": ComparisonService.calculate_change_percentage(current_val, previous_val),
                "change_abs": ComparisonService.calculate_absolute_change(current_val, previous_val),
                "insight": insights.get(metric_name, "No comparison available")
            }

        return comparison
