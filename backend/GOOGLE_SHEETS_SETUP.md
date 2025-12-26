# Google Sheets Export Setup Guide

This guide explains how to set up Google Sheets API credentials for the export functionality in the Facebook Ads Analytics API.

## Overview

The export functionality allows you to export analytics data directly to Google Sheets with proper formatting. This requires:
1. A Google Cloud Project
2. Enabled Google Sheets API
3. A Service Account with credentials

## Step-by-Step Setup

### 1. Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" → "New Project"
3. Enter project name: "Facebook Ads Analytics" (or any name)
4. Click "Create"

### 2. Enable Google Sheets API

1. In your project, go to **APIs & Services** → **Library**
2. Search for "Google Sheets API"
3. Click on it and press **Enable**
4. Also enable "Google Drive API" (for creating new spreadsheets)

### 3. Create a Service Account

1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **Service Account**
3. Fill in the details:
   - Service account name: `facebook-ads-export`
   - Service account ID: (auto-generated)
   - Description: "Service account for exporting Facebook Ads data to Google Sheets"
4. Click **Create and Continue**
5. Skip granting roles (click **Continue**)
6. Skip granting user access (click **Done**)

### 4. Generate Service Account Key

1. In **Credentials**, find your service account in the list
2. Click on the service account email
3. Go to the **Keys** tab
4. Click **Add Key** → **Create new key**
5. Choose **JSON** format
6. Click **Create**
7. The JSON file will download automatically

### 5. Configure Your Application

1. Move the downloaded JSON file to a secure location:
   ```bash
   mkdir -p ~/credentials
   mv ~/Downloads/facebook-ads-export-*.json ~/credentials/google-sheets-sa.json
   chmod 600 ~/credentials/google-sheets-sa.json
   ```

2. Update your `.env` file:
   ```bash
   GOOGLE_CREDENTIALS_PATH=/path/to/credentials/google-sheets-sa.json
   ```

   **Windows example:**
   ```
   GOOGLE_CREDENTIALS_PATH=C:\Users\YourName\credentials\google-sheets-sa.json
   ```

   **Linux/Mac example:**
   ```
   GOOGLE_CREDENTIALS_PATH=/home/yourname/credentials/google-sheets-sa.json
   ```

### 6. Share Spreadsheets with Service Account

**IMPORTANT:** To export to an **existing** spreadsheet, you must share it with the service account.

1. Open your Google Sheet
2. Click **Share**
3. Add the service account email (found in your JSON credentials file)
   - Example: `facebook-ads-export@your-project.iam.gserviceaccount.com`
4. Give **Editor** permissions
5. Uncheck "Notify people" (it's a robot, not a person)
6. Click **Share**

**Note:** If you create a new spreadsheet via the API, this step is not needed. The API automatically sets the service account as the owner.

## Usage Examples

### Export to New Google Sheet

```bash
curl -X POST "http://localhost:8000/api/v1/export/google-sheets" \
  -H "Content-Type: application/json" \
  -d '{
    "data_type": "campaign_breakdown",
    "start_date": "2024-10-01",
    "end_date": "2024-10-31",
    "title": "Facebook Ads - October 2024",
    "sheet_name": "Campaign Performance"
  }'
```

Response:
```json
{
  "spreadsheet_url": "https://docs.google.com/spreadsheets/d/1abc123.../edit",
  "spreadsheet_id": "1abc123...",
  "sheet_name": "Campaign Performance",
  "rows_exported": 45
}
```

### Export to Existing Google Sheet

1. First, share the spreadsheet with your service account (see step 6 above)
2. Get the spreadsheet ID from the URL:
   ```
   https://docs.google.com/spreadsheets/d/1abc123xyz/edit
                                          ^^^^^^^^^^^
                                          This is the ID
   ```
3. Make the API call with `spreadsheet_id`:

```bash
curl -X POST "http://localhost:8000/api/v1/export/google-sheets" \
  -H "Content-Type: application/json" \
  -d '{
    "data_type": "age_gender",
    "start_date": "2024-10-01",
    "end_date": "2024-10-31",
    "spreadsheet_id": "1abc123xyz",
    "sheet_name": "Demographics"
  }'
```

### Available Data Types

- `core_metrics` - High-level overview metrics
- `campaign_breakdown` - Campaign-level performance
- `age_gender` - Age and gender breakdown
- `placement` - Placement performance (Facebook, Instagram, etc.)
- `country` - Geographic performance by country
- `creative_metrics` - Creative/ad performance

### Export to Excel (Alternative)

If you don't want to use Google Sheets, you can export to Excel:

```bash
curl -X POST "http://localhost:8000/api/v1/export/excel" \
  -H "Content-Type: application/json" \
  -d '{
    "data_type": "campaign_breakdown",
    "start_date": "2024-10-01",
    "end_date": "2024-10-31",
    "filename": "facebook_ads_october_2024.xlsx"
  }' \
  --output facebook_ads.xlsx
```

Excel export does not require Google credentials.

## Troubleshooting

### Error: "Google Sheets credentials not found"

**Solution:**
1. Check that `GOOGLE_CREDENTIALS_PATH` is set in your `.env` file
2. Verify the file exists at that path
3. Ensure the file is a valid JSON file (not corrupted)

### Error: "The caller does not have permission"

**Solution:**
1. Make sure you've shared the existing spreadsheet with the service account email
2. Grant **Editor** permissions (not just Viewer)
3. Wait a few seconds for permissions to propagate

### Error: "Failed to initialize Google Sheets service"

**Solution:**
1. Check if dependencies are installed:
   ```bash
   pip install google-auth google-api-python-client
   ```
2. Verify the JSON credentials file is valid (open it and check for syntax errors)
3. Ensure the Google Sheets API is enabled in your project

### Error: "Invalid credentials"

**Solution:**
1. Re-download the service account key JSON
2. Make sure you're using a **service account key**, not an OAuth 2.0 client
3. Ensure the service account has not been deleted or disabled

## Security Best Practices

1. **Never commit credentials to Git:**
   ```bash
   # Add to .gitignore:
   *.json
   credentials/
   .env
   ```

2. **Restrict file permissions:**
   ```bash
   chmod 600 /path/to/credentials.json
   ```

3. **Use environment variables** for the path, never hardcode it in code

4. **Rotate credentials periodically:**
   - Delete old keys
   - Generate new keys every 90 days

5. **Monitor service account usage** in Google Cloud Console

## Testing

To test if your setup is correct, run a simple export:

```python
from api.services.export_service import ExportService

# Initialize service
service = ExportService()

# Test data
test_data = [
    {"campaign": "Test Campaign", "spend": 100.50, "clicks": 50}
]

# Try exporting
try:
    url = service.export_to_google_sheets(
        data=test_data,
        title="Test Export",
        sheet_name="Test"
    )
    print(f"✅ Success! Spreadsheet created: {url}")
except Exception as e:
    print(f"❌ Error: {e}")
```

## API Documentation

Once the server is running, view interactive API docs at:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

Look for the **export** section to see all export endpoints and try them out.

## Support

If you encounter issues not covered here, check:
1. [Google Sheets API Documentation](https://developers.google.com/sheets/api)
2. [Google Service Accounts Documentation](https://cloud.google.com/iam/docs/service-accounts)
3. Project logs: `tail -f /var/log/facebook-ads-api.log`
