import json
import urllib.request

def run_tests():
    # 1. Login as test user
    login_req = urllib.request.Request(
        'http://127.0.0.1:8000/api/auth/login',
        data=json.dumps({'username_or_email': 'testuser1@example.com', 'password': 'supersecret123'}).encode(),
        headers={'Content-Type': 'application/json'}
    )
    with urllib.request.urlopen(login_req) as res:
        token = json.loads(res.read())['access_token']
        print("[+] Logged in successfully.")

    # 2. List upcoming contests
    contests_req = urllib.request.Request(
        'http://127.0.0.1:8000/api/contests',
        headers={'Authorization': f'Bearer {token}'}
    )
    with urllib.request.urlopen(contests_req) as res:
        contests = json.loads(res.read())
        print(f"[+] Retrieved {len(contests)} upcoming contests.")
        assert len(contests) >= 4
        sample_contest = contests[0]
        print(f"    Sample: {sample_contest['name']} ({sample_contest['platform']}) at {sample_contest['start_time']}")

    # 3. Bookmark contest
    bm_req = urllib.request.Request(
        f"http://127.0.0.1:8000/api/contests/{sample_contest['id']}/bookmark",
        data=b'{}',
        headers={'Content-Type': 'application/json', 'Authorization': f'Bearer {token}'}
    )
    with urllib.request.urlopen(bm_req) as res:
        bm_res = json.loads(res.read())
        assert isinstance(bm_res['is_bookmarked'], bool)
        print(f"[+] Bookmark toggle functional: now={bm_res['is_bookmarked']}")

    # 4. Generate a Mock Exam Session
    exam_req = urllib.request.Request(
        'http://127.0.0.1:8000/api/exams',
        data=json.dumps({
            'title': 'Test Drill Assessment',
            'duration_minutes': 45,
            'difficulty_preset': 'standard'
        }).encode(),
        headers={'Content-Type': 'application/json', 'Authorization': f'Bearer {token}'}
    )
    with urllib.request.urlopen(exam_req) as res:
        exam = json.loads(res.read())
        print(f"[+] Generated Mock Exam: id={exam['id']}, problems count={len(exam['problems'])}, duration={exam['duration_minutes']}m")
        assert len(exam['problems']) == 4
        exam_id = exam['id']
        first_prob_pos = exam['problems'][0]['position']

    # 5. Check active exam
    active_req = urllib.request.Request(
        'http://127.0.0.1:8000/api/exams/active',
        headers={'Authorization': f'Bearer {token}'}
    )
    with urllib.request.urlopen(active_req) as res:
        active_exam = json.loads(res.read())
        assert active_exam['id'] == exam_id
        print(f"[+] Active exam retrieved successfully: status={active_exam['status']}")

    # 6. Submit exam with first problem marked solved
    submit_req = urllib.request.Request(
        f"http://127.0.0.1:8000/api/exams/{exam_id}/submit",
        data=json.dumps({
            'solved_positions': [first_prob_pos],
            'notes': 'Completed under test harness.'
        }).encode(),
        headers={'Content-Type': 'application/json', 'Authorization': f'Bearer {token}'}
    )
    with urllib.request.urlopen(submit_req) as res:
        submit_res = json.loads(res.read())
        print(f"[+] Exam submitted: status={submit_res['status']}, score={submit_res['score']}%, solved={submit_res['solved_count']}/{submit_res['total_problems']}")
        assert submit_res['status'] == 'completed'
        assert submit_res['score'] == 25.0

    # 7. Check exam history
    hist_req = urllib.request.Request(
        'http://127.0.0.1:8000/api/exams/history',
        headers={'Authorization': f'Bearer {token}'}
    )
    with urllib.request.urlopen(hist_req) as res:
        history = json.loads(res.read())
        print(f"[+] Exam history retrieved: {len(history)} past assessments.")
        assert len(history) >= 1

    print("\n>>> ALL CONTESTS & MOCK EXAM TESTS PASSED SUCCESSFULLY! <<<")

if __name__ == '__main__':
    run_tests()
