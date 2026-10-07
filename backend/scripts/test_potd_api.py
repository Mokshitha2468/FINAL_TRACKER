import json
import urllib.request

def run_test():
    # 1. Test anonymous POTD fetch
    req = urllib.request.Request('http://127.0.0.1:8000/api/potd/today')
    with urllib.request.urlopen(req) as res:
        potd = json.loads(res.read())
        print(f"[+] Anonymous POTD fetched: date={potd['date']}, pos=#{potd['problem']['position']}, title='{potd['problem']['title']}', diff={potd['problem']['difficulty']}")
        assert potd['problem']['position'] >= 1 and potd['problem']['position'] <= 474
        assert len(potd['history']) == 7

    # 2. Login as test user
    login_req = urllib.request.Request(
        'http://127.0.0.1:8000/api/auth/login',
        data=json.dumps({'username_or_email': 'testuser1@example.com', 'password': 'supersecret123'}).encode(),
        headers={'Content-Type': 'application/json'}
    )
    with urllib.request.urlopen(login_req) as res:
        token = json.loads(res.read())['access_token']
        print("[+] Logged in as testuser1.")

    # 3. Authenticated POTD fetch
    auth_req = urllib.request.Request(
        'http://127.0.0.1:8000/api/potd/today',
        headers={'Authorization': f'Bearer {token}'}
    )
    with urllib.request.urlopen(auth_req) as res:
        potd_user = json.loads(res.read())
        print(f"[+] User POTD fetched: is_solved={potd_user['is_solved']}, streak={potd_user['streak']}")

    # 4. Complete POTD
    comp_req = urllib.request.Request(
        'http://127.0.0.1:8000/api/potd/today/complete',
        data=b'{}',
        headers={'Content-Type': 'application/json', 'Authorization': f'Bearer {token}'}
    )
    with urllib.request.urlopen(comp_req) as res:
        comp_res = json.loads(res.read())
        print(f"[+] Completed POTD: {comp_res['message']}, new streak={comp_res['streak']}")
        assert comp_res['is_solved'] is True
        assert comp_res['streak'] >= 1

    # 5. Re-fetch to verify updated state and 7-day strip
    with urllib.request.urlopen(auth_req) as res:
        updated_potd = json.loads(res.read())
        print(f"[+] Verified updated POTD state: is_solved={updated_potd['is_solved']}, streak={updated_potd['streak']}")
        assert updated_potd['is_solved'] is True
        # Check today in history
        today_in_hist = updated_potd['history'][-1]
        assert today_in_hist['is_solved'] is True

    print("\n>>> ALL POTD SYSTEM TESTS PASSED SUCCESSFULLY! <<<")

if __name__ == '__main__':
    run_test()
