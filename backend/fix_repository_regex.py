
import os
import re

filepath = r'c:\Users\user\Documents\newproject\backend\api\repositories\metrics_repository.py'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Weighted average calculation string
weighted_avg = """,
                CASE WHEN SUM(f.video_plays) > 0 
                     THEN SUM(f.video_avg_time_watched * f.video_plays) / SUM(f.video_plays) 
                     ELSE 0 END as video_avg_time_watched"""

# 1. Update SELECT clauses that don't have video_avg_time_watched yet
# We look for the pattern where video_p100_watched is the last column before FROM
# Match p100 without a following comma, then whitespace, then FROM
pattern1 = re.compile(r'(SUM\(f\.video_p100_watched\)\s+as\s+video_p100_watched)(\s+FROM\s+fact_core_metrics\s+f)', re.IGNORECASE)
content, count1 = pattern1.subn(r'\1' + weighted_avg + r'\2', content)
print(f"Updated SELECT clauses (p100 end): {count1}")

# 2. Update SELECT clauses that ALREADY HAVE the simple SUM(f.video_avg_time_watched)
# Match p100 with comma, then simple SUM avg watch
pattern2 = re.compile(r'(SUM\(f\.video_p100_watched\)\s+as\s+video_p100_watched,\s+)SUM\(f\.video_avg_time_watched\)\s+as\s+video_avg_time_watched', re.IGNORECASE)
content, count2 = pattern2.subn(r'\1CASE WHEN SUM(f.video_plays) > 0 THEN SUM(f.video_avg_time_watched * f.video_plays) / SUM(f.video_plays) ELSE 0 END as video_avg_time_watched', content)
print(f"Updated SELECT clauses (simple avg replace): {count2}")

# 3. Add video_avg_time_watched to return dict in get_creative_detail
# Search for the block in get_creative_detail return
# Look for video_p100_watched mapping, then trend mapping
pattern3 = re.compile(r"('video_p100_watched':\s+int\(result\.video_p100_watched\s+or\s+0\),)(\s+'trend':\s+trend)", re.MULTILINE)
content, count3 = pattern3.subn(r"\1\n            'video_avg_time_watched': float(result.video_avg_time_watched or 0),\2", content)
print(f"Updated get_creative_detail return dict: {count3}")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
