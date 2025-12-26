
import pandas as pd
import numpy as np

class MockFBObject:
    def __init__(self, data):
        self._data = data
    def __getitem__(self, key):
        return self._data[key]
    def get(self, key, default=None):
        return self._data.get(key, default)
    def __repr__(self):
        return f"<MockFBObject> {self._data}"

def test_extraction():
    # Simulate what comes from [dict(a) for a in ads]
    mock_creative = MockFBObject({'id': '12345'})
    
    data = [
        {'id': 'ad1', 'creative': mock_creative},
        {'id': 'ad2', 'creative': {'id': '67890'}}, # dict
        {'id': 'ad3', 'creative': None}
    ]
    
    df = pd.DataFrame(data)
    
    print("Initial DF:")
    print(df)
    
    # My current fix:
    # df['creative_id'] = df['creative'].apply(lambda x: x.get('id') if hasattr(x, 'get') else (x['id'] if x else None))
    
    try:
        df['creative_id'] = df['creative'].apply(lambda x: x.get('id') if hasattr(x, 'get') else (x['id'] if x else None))
        print("\nAfter current fix applied:")
        print(df[['id', 'creative_id']])
    except Exception as e:
        print(f"\nCurrent fix failed: {e}")

    # Alternative:
    def extract_cid(x):
        if not x: return None
        if hasattr(x, 'get'): return x.get('id')
        if isinstance(x, (dict, object)) and 'id' in x: return x['id']
        return None

    df['creative_id_alt'] = df['creative'].apply(extract_cid)
    print("\nAfter alt fix:")
    print(df[['id', 'creative_id_alt']])

if __name__ == "__main__":
    test_extraction()
