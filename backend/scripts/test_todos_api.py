import json
import urllib.request

def run_test():
    # 1. Login
    req = urllib.request.Request(
        'http://127.0.0.1:8000/api/auth/login',
        data=json.dumps({'username_or_email': 'testuser1@example.com', 'password': 'supersecret123'}).encode(),
        headers={'Content-Type': 'application/json'}
    )
    with urllib.request.urlopen(req) as res:
        token = json.loads(res.read())['access_token']
        print("[+] Logged in successfully.")

    # 2. Create TODO
    create_req = urllib.request.Request(
        'http://127.0.0.1:8000/api/todos',
        data=json.dumps({
            'title': 'Review Binary Search templates',
            'priority': 'high',
            'due_date': '2026-09-30'
        }).encode(),
        headers={'Content-Type': 'application/json', 'Authorization': f'Bearer {token}'}
    )
    with urllib.request.urlopen(create_req) as res:
        todo = json.loads(res.read())
        print(f"[+] Created task: id={todo['id']}, title={todo['title']}, priority={todo['priority']}")

    # 3. List TODOs
    list_req = urllib.request.Request(
        'http://127.0.0.1:8000/api/todos',
        headers={'Authorization': f'Bearer {token}'}
    )
    with urllib.request.urlopen(list_req) as res:
        todos = json.loads(res.read())
        print(f"[+] Total tasks for user: {len(todos)}")

    # 4. Toggle completion
    update_req = urllib.request.Request(
        f"http://127.0.0.1:8000/api/todos/{todo['id']}",
        data=json.dumps({'completed': True}).encode(),
        headers={'Content-Type': 'application/json', 'Authorization': f'Bearer {token}'}
    )
    update_req.get_method = lambda: 'PUT'
    with urllib.request.urlopen(update_req) as res:
        updated = json.loads(res.read())
        print(f"[+] Toggled completion: {updated['completed']}")

    # 5. Delete task
    del_req = urllib.request.Request(
        f"http://127.0.0.1:8000/api/todos/{todo['id']}",
        headers={'Authorization': f'Bearer {token}'}
    )
    del_req.get_method = lambda: 'DELETE'
    with urllib.request.urlopen(del_req) as res:
        del_res = json.loads(res.read())
        print(f"[+] Deleted task: {del_res}")

    print("\n>>> ALL TODO SYSTEM TESTS PASSED SUCCESSFULLY! <<<")

if __name__ == '__main__':
    run_test()
