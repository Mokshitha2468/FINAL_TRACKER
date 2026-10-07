import requests

for u in ['striver', 'lee215', 'neal_wu']:
    payload = {
        'query': """
        query getRecentSubmissions($username: String!, $limit: Int) {
          recentSubmissionList(username: $username, limit: $limit) {
            title
            titleSlug
            timestamp
            statusDisplay
            lang
          }
        }
        """,
        'variables': {'username': u, 'limit': 10}
    }
    r = requests.post('https://leetcode.com/graphql', json=payload, headers={'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0'})
    subs = r.json().get('data', {}).get('recentSubmissionList') or []
    print(u, r.status_code, len(subs), [s['titleSlug'] for s in subs[:3]])
