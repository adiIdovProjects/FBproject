import sys
import os

# Add backend and api to path
sys.path.insert(0, os.getcwd())
sys.path.insert(0, os.path.join(os.getcwd(), 'api'))

from api.dependencies import SessionLocal
from sqlalchemy import text

db = SessionLocal()

try:
    # 1. Ensure 'lead' action type exists
    db.execute(text("INSERT INTO dim_action_type (action_type, is_conversion) VALUES ('lead', TRUE) ON CONFLICT (action_type) DO NOTHING"))
    db.commit()
    
    # Get ID of 'lead'
    lead_id = db.execute(text("SELECT action_type_id FROM dim_action_type WHERE action_type = 'lead'")).scalar()
    print(f"Unified lead_id: {lead_id}")
    
    # 2. Find old lead types
    old_leads = db.execute(text("SELECT action_type_id, action_type FROM dim_action_type WHERE action_type IN ('lead_total', 'lead_form', 'lead_website')")).fetchall()
    old_ids = [r[0] for r in old_leads]
    
    if not old_ids:
        print("No old lead types found for cleanup.")
    else:
        print(f"Cleaning up old IDs: {old_ids}")
        
        # 3. Consolidate. Since we want to AVOID triple counting, we take the MAX count of any lead type for a given PK
        # OR if we know they are identical, just pick one. 
        # The user said they are all 5 (total, website, form). So they are identical reports of the same lead.
        
        # We'll create a temp table with unified data
        db.execute(text("""
            CREATE TEMP TABLE unified_leads AS
            SELECT 
                date_id, account_id, campaign_id, adset_id, ad_id, creative_id, attribution_window,
                MAX(action_count) as action_count,
                MAX(action_value) as action_value
            FROM fact_action_metrics
            WHERE action_type_id IN :old_ids
            GROUP BY 1, 2, 3, 4, 5, 6, 7
        """), {"old_ids": tuple(old_ids)})
        
        # Delete old rows
        res_del = db.execute(text("DELETE FROM fact_action_metrics WHERE action_type_id IN :old_ids"), {"old_ids": tuple(old_ids)})
        print(f"Deleted {res_del.rowcount} stale lead rows.")
        
        # Insert unified rows (picking 'lead')
        db.execute(text(f"""
            INSERT INTO fact_action_metrics 
            (date_id, account_id, campaign_id, adset_id, ad_id, creative_id, action_type_id, attribution_window, action_count, action_value)
            SELECT 
                date_id, account_id, campaign_id, adset_id, ad_id, creative_id, {lead_id}, attribution_window, action_count, action_value
            FROM unified_leads
            ON CONFLICT (date_id, account_id, campaign_id, adset_id, ad_id, creative_id, action_type_id, attribution_window) 
            DO UPDATE SET 
                action_count = EXCLUDED.action_count,
                action_value = EXCLUDED.action_value
        """))
        print("Inserted unified lead records.")
        
        # Update fact_core_metrics (if necessary, though we don't strictly use those columns in current repository logic for conversions)
        # But we should update the 'leads' column there too.
        db.execute(text("""
            UPDATE fact_core_metrics f
            SET leads = ul.action_count
            FROM unified_leads ul
            WHERE f.date_id = ul.date_id 
              AND f.account_id = ul.account_id 
              AND f.campaign_id = ul.campaign_id
              AND f.adset_id = ul.adset_id
              AND f.ad_id = ul.ad_id
              AND f.creative_id = ul.creative_id
              AND ul.attribution_window = '7d_click'
        """))
        print("Updated fact_core_metrics leads column.")
        
        db.commit()
    
except Exception as e:
    print(f"Error during cleanup: {e}")
    db.rollback()
finally:
    db.close()
