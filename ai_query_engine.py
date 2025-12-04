# ai_query_engine.py

import os
from google import genai
from google.genai import types
from dotenv import load_dotenv
import pandas as pd
from config import GEMINI_MODEL # <-- ייבוא חדש

load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

# --- 1. הגדרת חיבור (Client Initialization) ---
try:
    if not GEMINI_API_KEY:
        print("🚨 CRITICAL: GEMINI_API_KEY not found in .env file.")
        client = None
    else:
        client = genai.Client(api_key=GEMINI_API_KEY)
        MODEL = GEMINI_MODEL # <-- שימוש בקבוע
        print(f"✅ Gemini Client initialized using {MODEL}.")
except Exception as e:
    print(f"❌ Error initializing Gemini Client: {e}")
    client = None

# --- 2. הפרומפט המנחה (System Instruction) ---
SYSTEM_INSTRUCTION = (
    "You are an expert Data Analyst and a Python/Pandas Code Generator. "
    "Your task is to convert a user's question about marketing data into a single, executable Python code snippet "
    "that uses a global variable called 'df'. "
    "The dataframe 'df' is already loaded and contains campaign-level core metrics. "
    "The columns in 'df' are: 'Date', 'Campaign_ID', 'Campaign_Name', 'Spend', 'Impressions', 'Clicks', 'CPC', 'CTR', 'CPM', 'Purchases', 'Leads'. "
    "The 'Date' column is already a datetime object. "
    "Your response must ONLY contain the Python code snippet and nothing else. "
    "The code must print the final calculated result or summary as a clean, simple number or string."
    "Example: Question: 'What was the total spend in the last 7 days?' -> Code: print(df['Spend'].tail(7).sum())"
)


def query_data_with_gemini(df_data: pd.DataFrame, user_question: str) -> str:
    """
    שולח את שאלת המשתמש ל-Gemini, מקבל קוד Python, ומריץ אותו על ה-DataFrame.
    
    :param df_data: ה-DataFrame המעובד (core_campaign_daily).
    :param user_question: שאלת המשתמש (לדוגמה: 'מה היה ה-CTR הממוצע בשבוע שעבר?').
    :return: סטטוס הביצוע או הודעת שגיאה.
    """
    
    if client is None:
        return "Gemini API is not initialized. Cannot run query."
    if df_data.empty:
        return "The DataFrame is empty. Cannot perform analysis."

    print(f"\n🧠 Sending query to Gemini: '{user_question}'")

    # שליפת מבנה ה-DataFrame לשליחה לפרומפט
    schema_info = df_data.head(5).to_string(index=False) 
    
    prompt = (
        f"Based on the following DataFrame structure and data preview, generate the Python code "
        f"to answer the question: '{user_question}'\n\n"
        f"DataFrame Preview:\n{schema_info}\n\n"
        f"YOUR PYTHON CODE SNIPPET (must start with 'print(' and must not include imports or comments):"
    )

    try:
        config = types.GenerateContentConfig(
            system_instruction=SYSTEM_INSTRUCTION,
            temperature=0.1
        )

        response = client.models.generate_content(
            model=MODEL,
            contents=[prompt],
            config=config,
        )

        # ניקוי הקוד שהתקבל
        python_code = response.text.strip().replace('```python', '').replace('```', '')
        print(f"📝 Generated Python Code:\n{python_code}")
        
        # --- 3. ביצוע הקוד בצורה בטוחה (Execution) ---
        # ⚠️ הפעלת הקוד עם משתנים מקומיים מבודדים (Sandbox)
        local_vars = {'df': df_data} 
        exec(python_code, {'__builtins__': None}, local_vars) 
        
        return "✅ Code Executed. Result printed above."

    except Exception as e:
        return f"❌ Execution or API Error: {e}"