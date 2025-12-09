# run_etl.py
import sys
import os

# Add the project root to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    from data_api.main import main
    print("Starting ETL Pipeline...")
    main()
    print("ETL Pipeline finished.")
except ImportError as e:
    print(f"❌ FATAL ERROR: Failed to import data_api.main. Please ensure main.py is inside the data_api folder. Error: {e}")
except Exception as e:
    print(f"❌ An error occurred during ETL execution: {e}")
