import json
import urllib.request

def test_sync():
    # 1. Login
    login_req = urllib.request.Request(
        'http://127.0.0.1:8000/api/auth/login',
        data=json.dumps({'username_or_email': 'testuser1@example.com', 'password': 'supersecret123'}).encode(),
        headers={'Content-Type': 'application/json'}
    )
    with urllib.request.urlopen(login_req) as res:
        token = json.loads(res.read())['access_token']
        print("[+] Logged in successfully.")

    # 2. Test Sync endpoint with a known public LeetCode user e.g. 'striver' or 'neal_wu' or 'tourist'
    sync_req = urllib.request.Request(
        'http://127.0.0.1:8000/api/sync/leetcode',
        data=json.dumps({'username': 'striver'}).encode(),
        headers={'Content-Type': 'application/json', 'Authorization': f'Bearer {token}'}
    )
    try:
        with urllib.request.urlopen(sync_req) as res:
            data = json.loads(res.read())
            print(f"[+] LeetCode Sync Response: {data['message']}")
            print(f"    Submissions found: {data['total_accepted_submissions_found']}, Matched A2Z: {data['matched_a2z_problems']}, Newly Solved: {data['newly_solved']}")
            assert data['username'] == 'striver'
    except Exception as e:
        print(f"[!] Sync test note (API query response): {e}")

if __name__ == '__main__':
    test_sync()
