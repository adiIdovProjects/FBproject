import requests
import uuid

BASE_URL = "http://localhost:8000/api/v1/auth"

def test_auth():
    email = f"test_{uuid.uuid4().hex[:6]}@example.com"
    password = "password123"
    name = "Test User"
    
    print(f"Testing Registration: {email}")
    try:
        r = requests.post(f"{BASE_URL}/register", json={
            "email": email,
            "password": password,
            "full_name": name
        }, timeout=10)
        print(f"Status: {r.status_code}")
        print(f"Response: {r.text}")
        
        if r.status_code == 200:
            print("Registration Success!")
            
            print(f"\nTesting Login: {email}")
            r = requests.post(f"{BASE_URL}/login", json={
                "email": email,
                "password": password
            }, timeout=10)
            print(f"Status: {r.status_code}")
            if r.status_code == 200:
                print("Login Success!")
            else:
                print("Login Failed")
        else:
            print("Registration Failed")
            
    except Exception as e:
        print(f"Error: {str(e)}")

if __name__ == "__main__":
    test_auth()
