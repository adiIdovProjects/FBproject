import requests
import uuid
import sys

BASE_URL = "http://localhost:8000/api/v1/auth"

def test_magic_auth():
    email = f"magic_{uuid.uuid4().hex[:6]}@example.com"
    password = "password123"
    wrong_password = "wrongpassword"
    
    print(f"--- Testing Magic Auth Flow for {email} ---")

    # 1. Test New User (No Confirm)
    # Expected: 404 status, X-Auth-Action header
    print("\n1. Test New User (No Confirm)...")
    try:
        r = requests.post(f"{BASE_URL}/unified-login", json={
            "email": email,
            "password": password,
            "confirm_create": False
        })
        if r.status_code == 404 and r.headers.get("X-Auth-Action") == "confirm_creation":
            print("✅ PASS: Correctly asked for confirmation.")
        else:
            print(f"❌ FAIL: Status {r.status_code}, Header {r.headers.get('X-Auth-Action')}")
            print(r.text)
    except Exception as e:
        print(f"❌ FAIL: Exception {e}")

    # 2. Test New User (With Confirm)
    # Expected: 200 status, status="created"
    print("\n2. Test New User (With Confirm)...")
    try:
        r = requests.post(f"{BASE_URL}/unified-login", json={
            "email": email,
            "password": password,
            "confirm_create": True
        })
        data = r.json()
        if r.status_code == 200 and data.get("status") == "created":
            print("✅ PASS: User created successfully.")
        else:
            print(f"❌ FAIL: Status {r.status_code}")
            print(r.text)
    except Exception as e:
        print(f"❌ FAIL: Exception {e}")

    # 3. Test Existing User (Correct Password)
    # Expected: 200 status, status="login_success"
    print("\n3. Test Existing User (Login)...")
    try:
        r = requests.post(f"{BASE_URL}/unified-login", json={
            "email": email,
            "password": password
        })
        data = r.json()
        if r.status_code == 200 and data.get("status") == "login_success":
            print("✅ PASS: Login successful.")
        else:
            print(f"❌ FAIL: Status {r.status_code}")
            print(r.text)
    except Exception as e:
        print(f"❌ FAIL: Exception {e}")

    # 4. Test Existing User (Wrong Password)
    # Expected: 401 status
    print("\n4. Test Existing User (Wrong Password)...")
    try:
        r = requests.post(f"{BASE_URL}/unified-login", json={
            "email": email,
            "password": wrong_password
        })
        if r.status_code == 401:
            print("✅ PASS: Correctly rejected wrong password.")
        else:
            print(f"❌ FAIL: Status {r.status_code}")
            print(r.text)
    except Exception as e:
        print(f"❌ FAIL: Exception {e}")

if __name__ == "__main__":
    test_magic_auth()
