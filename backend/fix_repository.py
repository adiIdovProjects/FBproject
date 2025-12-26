
import os

filepath = r'c:\Users\user\Documents\newproject\backend\api\repositories\metrics_repository.py'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update get_aggregated_metrics SELECT
old_agg = """                SUM(f.video_p100_watched) as video_p100_watched
            FROM fact_core_metrics f"""
new_agg = """                SUM(f.video_p100_watched) as video_p100_watched,
                CASE WHEN SUM(f.video_plays) > 0 
                     THEN SUM(f.video_avg_time_watched * f.video_plays) / SUM(f.video_plays) 
                     ELSE 0 END as video_avg_time_watched
            FROM fact_core_metrics f"""
if old_agg in content:
    content = content.replace(old_agg, new_agg)
    print("Updated get_aggregated_metrics SQL")

# 2. Update get_creative_detail SELECT
old_det = """                SUM(f.video_p100_watched) as video_p100_watched
            FROM fact_core_metrics f"""
# Since old_agg and old_det are identical, replace might have already done it if content appeared twice.
# But let's check for the comma version if it was partially updated
old_det_comma = """                SUM(f.video_p100_watched) as video_p100_watched,
                SUM(f.video_avg_time_watched) as video_avg_time_watched
            FROM fact_core_metrics f"""
new_det = """                SUM(f.video_p100_watched) as video_p100_watched,
                CASE WHEN SUM(f.video_plays) > 0 
                     THEN SUM(f.video_avg_time_watched * f.video_plays) / SUM(f.video_plays) 
                     ELSE 0 END as video_avg_time_watched
            FROM fact_core_metrics f"""

if old_det_comma in content:
    content = content.replace(old_det_comma, new_det)
    print("Updated get_creative_detail SQL (comma version)")
elif old_det in content:
    content = content.replace(old_det, new_det)
    print("Updated get_creative_detail SQL")

# 3. Ensure float mapping in get_creative_detail if it exists
# We need to find where result is converted to dict in get_creative_detail
# Based on view_file, it's returning a result object. 
# Usually it's mapped at the end of the function.
# Let's find 'return {' in get_creative_detail

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
