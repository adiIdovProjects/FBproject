"""
Test script to verify settings are loaded correctly
"""
import sys
print(f"Python executable: {sys.executable}")
print(f"Python version: {sys.version}")

# Force reload of config module
import importlib
if 'config.settings' in sys.modules:
    importlib.reload(sys.modules['config.settings'])

from config.settings import BASE_FIELDS_TO_PULL

print("\n=== BASE_FIELDS_TO_PULL ===")
print(f"Total fields: {len(BASE_FIELDS_TO_PULL)}")
print("\nAll fields:")
for i, field in enumerate(BASE_FIELDS_TO_PULL, 1):
    print(f"  {i}. {field}")

# Check for click fields
click_fields = [f for f in BASE_FIELDS_TO_PULL if 'click' in str(f).lower()]
print(f"\n=== Click-related fields ({len(click_fields)}) ===")
for field in click_fields:
    print(f"  - {field}")

# Extract field names (same logic as fb_api.py)
def extract_field_name(field):
    """Extract field name from AdsInsights.Field object"""
    if hasattr(field, '_field_name'):
        return field._field_name
    elif hasattr(field, 'name'):
        return field.name
    else:
        return str(field)

print("\n=== Extracted field names ===")
field_names = [extract_field_name(f) for f in BASE_FIELDS_TO_PULL]
for name in field_names:
    print(f"  - {name}")

click_field_names = [name for name in field_names if 'click' in name.lower()]
print(f"\n=== Extracted click field names ({len(click_field_names)}) ===")
for name in click_field_names:
    print(f"  - {name}")
