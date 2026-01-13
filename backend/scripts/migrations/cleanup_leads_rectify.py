import sys
import os

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__))))

from api.dependencies import SessionLocal
from sqlalchemy import text

db = SessionLocal()
try:
    print("Step 1: Cleaning fact_core_metrics...")
    # Core Metrics: Reset leads to lead_website (the total) and subtract lead_form from lead_website
    query_core = text("""
        UPDATE fact_core_metrics 
        SET 
            leads = lead_website,
            lead_website = CASE WHEN lead_website >= lead_form THEN lead_website - lead_form ELSE 0 END
        WHERE lead_website > 0 AND lead_form > 0;
    """)
    res_core = db.execute(query_core)
    print(f"Updated {res_core.rowcount} rows in fact_core_metrics")

    print("\nStep 2: Cleaning fact_action_metrics...")
    # Action Metrics: Adjust lead_website count by subtracting lead_form count
    find_rows_query = text("""
        SELECT 
            fam_w.date_id, fam_w.account_id, fam_w.campaign_id, fam_w.adset_id, 
            fam_w.ad_id, fam_w.creative_id, fam_w.attribution_window,
            fam_w.action_count as total_count, fam_f.action_count as form_count,
            fam_w.action_type_id as website_type_id
        FROM fact_action_metrics fam_w
        JOIN dim_action_type dat_w ON fam_w.action_type_id = dat_w.action_type_id
        JOIN fact_action_metrics fam_f ON 
            fam_w.date_id = fam_f.date_id AND 
            fam_w.account_id = fam_f.account_id AND
            fam_w.campaign_id = fam_f.campaign_id AND 
            fam_w.adset_id = fam_f.adset_id AND 
            fam_w.ad_id = fam_f.ad_id AND 
            fam_w.creative_id = fam_f.creative_id AND 
            fam_w.attribution_window = fam_f.attribution_window
        JOIN dim_action_type dat_f ON fam_f.action_type_id = dat_f.action_type_id
        WHERE dat_w.action_type = 'lead_website' AND dat_f.action_type = 'lead_form'
    """)
    
    rows_to_process = db.execute(find_rows_query).fetchall()
    updated_actions = 0
    deleted_actions = 0
    
    for row in rows_to_process:
        new_count = max(0, row.total_count - row.form_count)
        
        params = {
            'date_id': row.date_id,
            'account_id': row.account_id,
            'campaign_id': row.campaign_id,
            'adset_id': row.adset_id,
            'ad_id': row.ad_id,
            'creative_id': row.creative_id,
            'window': row.attribution_window,
            'type_id': row.website_type_id
        }
        
        if new_count == 0:
            db.execute(text("""
                DELETE FROM fact_action_metrics 
                WHERE date_id = :date_id AND account_id = :account_id AND campaign_id = :campaign_id 
                AND adset_id = :adset_id AND ad_id = :ad_id AND creative_id = :creative_id 
                AND attribution_window = :window AND action_type_id = :type_id
            """), params)
            deleted_actions += 1
        else:
            params['count'] = new_count
            db.execute(text("""
                UPDATE fact_action_metrics 
                SET action_count = :count
                WHERE date_id = :date_id AND account_id = :account_id AND campaign_id = :campaign_id 
                AND adset_id = :adset_id AND ad_id = :ad_id AND creative_id = :creative_id 
                AND attribution_window = :window AND action_type_id = :type_id
            """), params)
            updated_actions += 1
            
    print(f"Updated {updated_actions} rows and deleted {deleted_actions} redundant rows in fact_action_metrics")
    
    db.commit()
    print("\nCleanup complete!")
    
except Exception as e:
    db.rollback()
    print(f"Error during cleanup: {e}")
finally:
    db.close()
