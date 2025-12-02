import os
from dotenv import load_dotenv

# טוען את המפתחות מקובץ .env לתוך משתני הסביבה של המערכת
load_dotenv()

# משתמשים במפתחות באמצעות פונקציית os.getenv()
my_app_id = os.getenv("FACEBOOK_APP_ID")
my_access_token = os.getenv("FACEBOOK_ACCESS_TOKEN")
openai_key = os.getenv("OPENAI_API_KEY")

# בדיקה: אם אחד מהם ריק, תדע שיש תקלה
if not my_access_token:
    print("שגיאה: Access Token לא נמצא בקובץ .env")

# שימוש בקוד שכתבנו קודם:
# FacebookAdsApi.init(my_app_id, ..., my_access_token)