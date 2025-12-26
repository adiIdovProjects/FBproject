"""
utils/mapping_utils.py - Shared mapping logic (Country names, etc.)
"""

COUNTRY_MAP = {
    'BR': 'Brazil', 'US': 'United States', 'GB': 'United Kingdom', 'DE': 'Germany',
    'FR': 'France', 'IT': 'Italy', 'ES': 'Spain', 'PT': 'Portugal', 'MX': 'Mexico',
    'AR': 'Argentina', 'CL': 'Chile', 'CO': 'Colombia', 'PE': 'Peru', 'UY': 'Uruguay',
    'CA': 'Canada', 'AU': 'Australia', 'JP': 'Japan', 'CN': 'China', 'KR': 'South Korea',
    'IL': 'Israel', 'IN': 'India', 'RU': 'Russia', 'ZA': 'South Africa', 'TR': 'Turkey',
    'NL': 'Netherlands', 'SE': 'Sweden', 'NO': 'Norway', 'DK': 'Denmark', 'FI': 'Finland',
    'BE': 'Belgium', 'CH': 'Switzerland', 'AT': 'Austria', 'IE': 'Ireland', 'NZ': 'New Zealand',
    'SG': 'Singapore', 'HK': 'Hong Kong', 'AE': 'United Arab Emirates', 'SA': 'Saudi Arabia',
    'PL': 'Poland', 'GR': 'Greece', 'CY': 'Cyprus', 'RO': 'Romania', 'HU': 'Hungary',
    'CZ': 'Czech Republic', 'TH': 'Thailand', 'VN': 'Vietnam', 'MY': 'Malaysia',
    'PH': 'Philippines', 'ID': 'Indonesia', 'EG': 'Egypt', 'UA': 'Ukraine', 'CO': 'Colombia',
    'VE': 'Venezuela', 'EC': 'Ecuador', 'GT': 'Guatemala', 'CR': 'Costa Rica', 'PA': 'Panama',
    'PR': 'Puerto Rico', 'DO': 'Dominican Republic', 'JO': 'Jordan', 'KW': 'Kuwait', 'QA': 'Qatar',
    'OM': 'Oman', 'BH': 'Bahrain', 'LU': 'Luxembourg', 'IS': 'Iceland', 'MT': 'Malta'
}

def map_country_code(code: str) -> str:
    """Map 2-letter country code to full name"""
    if not code or not isinstance(code, str):
        return code
    
    clean_code = code.upper().strip()
    if len(clean_code) == 2:
        return COUNTRY_MAP.get(clean_code, clean_code)
    return code

def get_country_code(name: str) -> str:
    """Reverse lookup country code from full name"""
    if not name or not isinstance(name, str):
        return None
    
    clean_name = name.upper().strip()
    for code, full_name in COUNTRY_MAP.items():
        if full_name.upper() == clean_name:
            return code
    return None
