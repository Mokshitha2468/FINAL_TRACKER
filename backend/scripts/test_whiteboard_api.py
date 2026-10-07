import json
import urllib.request

def run_tests():
    # 1. Login as testuser1
    login_req = urllib.request.Request(
        'http://127.0.0.1:8000/api/auth/login',
        data=json.dumps({'username_or_email': 'testuser1@example.com', 'password': 'supersecret123'}).encode(),
        headers={'Content-Type': 'application/json'}
    )
    with urllib.request.urlopen(login_req) as res:
        token = json.loads(res.read())['access_token']
        print("[+] Logged in as testuser1.")

    headers = {'Content-Type': 'application/json', 'Authorization': f'Bearer {token}'}

    # 2. List whiteboards (should auto-provision default if empty)
    list_req = urllib.request.Request('http://127.0.0.1:8000/api/whiteboard', headers=headers)
    with urllib.request.urlopen(list_req) as res:
        boards = json.loads(res.read())
        print(f"[+] Listed {len(boards)} whiteboard(s). First board title: '{boards[0]['title']}'")
        first_id = boards[0]['id']

    # 3. Create a new whiteboard
    create_req = urllib.request.Request(
        'http://127.0.0.1:8000/api/whiteboard',
        data=json.dumps({'title': 'Week 1 DSA Notes'}).encode(),
        headers=headers
    )
    with urllib.request.urlopen(create_req) as res:
        created = json.loads(res.read())
        print(f"[+] Created whiteboard: '{created['title']}' (ID: {created['id']})")
        new_id = created['id']

    # 4. Update the whiteboard with strokes, shapes, and viewport
    elements = [
        {
            "id": "elem_1",
            "type": "stroke",
            "points": [{"x": 100, "y": 100}, {"x": 120, "y": 110}, {"x": 150, "y": 140}],
            "color": "#3b82f6",
            "width": 4
        },
        {
            "id": "elem_2",
            "type": "text",
            "x": 200,
            "y": 200,
            "text": "Monday notes: Two Pointers Pattern",
            "color": "#ffffff",
            "fontSize": 20
        },
        {
            "id": "elem_3",
            "type": "shape",
            "shapeType": "rectangle",
            "x": 50,
            "y": 50,
            "width": 300,
            "height": 200,
            "color": "#10b981",
            "strokeWidth": 2
        }
    ]
    viewport = {"panX": -50, "panY": -100, "zoom": 1.25}

    update_req = urllib.request.Request(
        f'http://127.0.0.1:8000/api/whiteboard/{new_id}',
        data=json.dumps({
            'title': 'Week 1 DSA & Algorithms Notes',
            'elements': elements,
            'viewport': viewport
        }).encode(),
        headers=headers,
        method='PUT'
    )
    with urllib.request.urlopen(update_req) as res:
        updated = json.loads(res.read())
        print(f"[+] Updated whiteboard: '{updated['title']}', {len(updated['elements'])} elements, zoom={updated['viewport']['zoom']}")
        assert len(updated['elements']) == 3
        assert updated['viewport']['zoom'] == 1.25

    # 5. Get whiteboard by ID
    get_req = urllib.request.Request(f'http://127.0.0.1:8000/api/whiteboard/{new_id}', headers=headers)
    with urllib.request.urlopen(get_req) as res:
        fetched = json.loads(res.read())
        print(f"[+] Re-fetched whiteboard: '{fetched['title']}', {len(fetched['elements'])} elements, zoom={fetched['viewport']['zoom']}")
        assert fetched['title'] == 'Week 1 DSA & Algorithms Notes'

    # 6. Delete test whiteboard
    del_req = urllib.request.Request(f'http://127.0.0.1:8000/api/whiteboard/{new_id}', headers=headers, method='DELETE')
    with urllib.request.urlopen(del_req) as res:
        del_res = json.loads(res.read())
        print(f"[+] Deleted test whiteboard: {del_res['message']}")

    print("\n>>> ALL WHITEBOARD BACKEND TESTS PASSED SUCCESSFULLY! <<<")

if __name__ == '__main__':
    run_tests()
