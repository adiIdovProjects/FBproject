# data_handler.py

import pandas as pd
from config import CORE_PK, BREAKDOWN_PK

# מפה לשינוי שמות עמודות הליבה לפורמט נקי (כולל Campaign_Name)
CORE_COLUMNS_MAP = {
    'date_start': 'Date',
    'campaign_id': 'Campaign_ID',
    'campaign_name': 'Campaign_Name',
    'spend': 'Spend',
    'impressions': 'Impressions',
    'clicks': 'Clicks',
    'cpc': 'CPC_Raw',
    'actions': 'Actions'
}

METRIC_COLUMNS = ['Spend', 'Impressions', 'Clicks', 'Purchases', 'Leads']


def extract_actions(df: pd.DataFrame) -> pd.DataFrame:
    """
    מחלק את עמודת 'Actions' (מערך מורכב) לעמודות Purchases ו-Leads.
    """
    
    df['Purchases'] = 0.0
    df['Leads'] = 0.0

    if 'Actions' in df.columns and not df['Actions'].empty:
        
        def find_action_value(actions_list, action_type):
            if isinstance(actions_list, list):
                for item in actions_list:
                    if item.get('action_type') == action_type:
                        try:
                            return float(item.get('value', 0))
                        except (TypeError, ValueError):
                            return 0.0
            return 0.0

        df['Purchases'] = df['Actions'].apply(lambda x: find_action_value(x, 'offsite_conversion.fb_pixel_purchase'))
        df['Leads'] = df['Actions'].apply(lambda x: find_action_value(x, 'lead'))

    if 'Actions' in df.columns:
        df = df.drop(columns=['Actions'])
        
    return df


def calculate_kpis(df: pd.DataFrame) -> pd.DataFrame:
    """
    מחשב מדדי KPI נגזרים (CTR, CPC, CPA).
    """

    df['CTR'] = (df['Clicks'] / df['Impressions']).fillna(0)
    df['CPC'] = (df['Spend'] / df['Clicks']).fillna(0)
    
    # **תיקון 2: ודא ש-Leads/Purchases קיימים לפני חישוב CPA**
    if 'Leads' in df.columns:
        df['CPA_Lead'] = (df['Spend'] / df['Leads']).fillna(0)
    else:
        df['CPA_Lead'] = 0.0
        
    if 'Purchases' in df.columns:
        df['CPA_Purchase'] = (df['Spend'] / df['Purchases']).fillna(0)
    else:
        df['CPA_Purchase'] = 0.0

    df.replace([float('inf'), -float('inf')], 0, inplace=True)
    
    return df


def clean_and_calculate(df: pd.DataFrame, is_core: bool) -> pd.DataFrame:
    """
    פונקציה ראשית לעיבוד וניקוי נתונים לפני שמירה.
    """

    # 1. ניקוי ועיבוד כללי
    df.rename(columns=CORE_COLUMNS_MAP, inplace=True)
    df = extract_actions(df)
    
    if 'Date' in df.columns:
        df['Date'] = pd.to_datetime(df['Date']).dt.date
    
    for col in METRIC_COLUMNS:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0)
    
    df = calculate_kpis(df)

    # 2. טיפול ספציפי בנתוני פיצולים (Breakdowns)
    if not is_core:
        
        # יצירת Breakdown_Type המבוסס על העמודות הקיימות מה-API
        breakdown_type_list = []
        if 'age' in df.columns:
            breakdown_type_list.append('age')
        if 'gender' in df.columns:
            breakdown_type_list.append('gender')
        if 'country' in df.columns:
            breakdown_type_list.append('country')
        if 'publisher_platform' in df.columns:
            breakdown_type_list.append('publisher_platform')

        df['Breakdown_Type'] = '|'.join(breakdown_type_list)
        
        # **תיקון 3: מילוי עמודות PK חסרות ב-'N/A'**
        for col in BREAKDOWN_PK:
            if col not in df.columns:
                df[col] = 'N/A'
            else:
                 df[col] = df[col].fillna('N/A')
            

    # 3. ניקוי עמודות מיותרות ובחירה סופית
    
    if 'CPC_Raw' in df.columns:
        df = df.drop(columns=['CPC_Raw'])

    if is_core:
        df = df[CORE_PK + ['Campaign_Name', 'Spend', 'Impressions', 'Clicks', 'CTR', 'CPC', 'Purchases', 'Leads', 'CPA_Lead', 'CPA_Purchase']]
        
    else: # אם זו טבלת פיצולים
        required_cols = BREAKDOWN_PK + ['Spend', 'Impressions', 'Clicks', 'CTR', 'CPC', 'Purchases', 'Leads', 'CPA_Lead', 'CPA_Purchase']
        final_cols = [col for col in required_cols if col in df.columns]
        df = df[final_cols]
        
    return df