"""
Test budget optimizer with sample data
"""

from backend.api.services.budget_optimizer import BudgetOptimizer

# Sample campaign data
sample_campaigns = [
    {
        'campaign_id': 1,
        'campaign_name': 'High Performer Campaign',
        'spend': 1000,
        'roas': 4.5,
        'ctr': 2.3,
        'conversions': 150,
        'clicks': 500
    },
    {
        'campaign_id': 2,
        'campaign_name': 'Medium Campaign',
        'spend': 800,
        'roas': 2.1,
        'ctr': 1.5,
        'conversions': 80,
        'clicks': 400
    },
    {
        'campaign_id': 3,
        'campaign_name': 'Low Performer',
        'spend': 500,
        'roas': 0.8,
        'ctr': 0.5,
        'conversions': 20,
        'clicks': 300
    },
    {
        'campaign_id': 4,
        'campaign_name': 'Excellent ROAS',
        'spend': 1200,
        'roas': 5.2,
        'ctr': 3.1,
        'conversions': 200,
        'clicks': 600
    }
]

# Initialize optimizer (without DB for testing)
optimizer = BudgetOptimizer(None)

print("Testing Budget Optimizer...")
print("=" * 60)

# Test efficiency scoring
print("\nEfficiency Scores:")
print("-" * 60)
for campaign in sample_campaigns:
    score = optimizer.calculate_efficiency_score(campaign)
    print(f"{campaign['campaign_name']}: {score:.1f}/100")

# Test recommendations
print("\n\nGenerating Recommendations...")
print("-" * 60)
recommendations = optimizer.analyze_campaigns(sample_campaigns)

for rec in recommendations:
    print(f"\n{rec.action.upper()}: {rec.campaign_name}")
    print(f"  Current: ${rec.current_budget:.2f}")
    print(f"  Recommended: ${rec.recommended_budget:.2f}")
    print(f"  Efficiency Score: {rec.efficiency_score:.1f}/100")
    print(f"  Reason: {rec.reason}")
    print(f"  Impact: {rec.expected_impact}")

# Test summary
print("\n\nOverall Summary:")
print("-" * 60)
summary = optimizer.generate_summary(recommendations, sample_campaigns)
for key, value in summary.items():
    print(f"{key}: {value}")

print("\n[OK] Budget Optimizer test complete!")
