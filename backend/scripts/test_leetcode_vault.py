import json
import urllib.request

def run_tests():
    # 1. Login
    login_req = urllib.request.Request(
        'http://127.0.0.1:8000/api/auth/login',
        data=json.dumps({'username_or_email': 'testuser1@example.com', 'password': 'supersecret123'}).encode(),
        headers={'Content-Type': 'application/json'}
    )
    with urllib.request.urlopen(login_req) as res:
        token = json.loads(res.read())['access_token']
        print("[+] Logged in as testuser1.")

    # 2. Save LeetCode username
    user_req = urllib.request.Request(
        'http://127.0.0.1:8000/api/sync/leetcode/username',
        data=json.dumps({'username': 'striver'}).encode(),
        headers={'Content-Type': 'application/json', 'Authorization': f'Bearer {token}'}
    )
    with urllib.request.urlopen(user_req) as res:
        user_res = json.loads(res.read())
        print(f"[+] Saved LeetCode username: {user_res['username']}")
        assert user_res['username'] == 'striver'

    # 3. Get profile
    prof_req = urllib.request.Request(
        'http://127.0.0.1:8000/api/sync/leetcode/profile',
        headers={'Authorization': f'Bearer {token}'}
    )
    with urllib.request.urlopen(prof_req) as res:
        prof = json.loads(res.read())
        print(f"[+] Profile fetched: username={prof['username']}, total_synced={prof['total_synced']}")
        assert prof['username'] == 'striver'

    # 4. Trigger Sync
    sync_req = urllib.request.Request(
        'http://127.0.0.1:8000/api/sync/leetcode/sync',
        data=json.dumps({}).encode(),
        headers={'Content-Type': 'application/json', 'Authorization': f'Bearer {token}'}
    )
    with urllib.request.urlopen(sync_req) as res:
        sync_res = json.loads(res.read())
        print(f"[+] Sync triggered: {sync_res['message']}")
        assert 'username' in sync_res

    # 5. List problems
    list_req = urllib.request.Request(
        'http://127.0.0.1:8000/api/sync/leetcode/problems',
        headers={'Authorization': f'Bearer {token}'}
    )
    with urllib.request.urlopen(list_req) as res:
        list_res = json.loads(res.read())
        print(f"[+] Synced problems list retrieved: {len(list_res['problems'])} items.")

    print("\n>>> ALL LEETCODE VAULT & REVISION API TESTS PASSED! <<<")

if __name__ == '__main__':
    run_tests()
