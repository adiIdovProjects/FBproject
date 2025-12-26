
from facebook_business.adobjects.adsinsights import AdsInsights

fields = [getattr(AdsInsights.Field, f) for f in dir(AdsInsights.Field) if not f.startswith('_')]
# Sort alphabetically
fields.sort()

print("Available AdsInsights fields:")
for f in fields:
    if 'creative' in f.lower():
        print(f"  {f}")
    if 'id' in f.lower():
        # Print only some common ones to avoid too much output
        if f in ['ad_id', 'adset_id', 'campaign_id', 'account_id', 'ad_creative_id']:
            print(f"  {f}")

# Check specifically for creative variants
variants = ['creative_id', 'ad_creative_id', 'creative']
for v in variants:
    if hasattr(AdsInsights.Field, v):
        print(f"AdsInsights.Field.{v} EXISTS and its value is: {getattr(AdsInsights.Field, v)}")
    else:
        print(f"AdsInsights.Field.{v} does NOT exist")
