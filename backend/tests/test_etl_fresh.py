"""
Quick ETL test with cache cleared - single day only
"""
import os
os.environ['TEST_DATE'] = '2024-10-28'
os.environ['FIRST_PULL_DAYS'] = '1'  # Only 1 day to make it fast

from etl.main import main

if __name__ == '__main__':
    main()
