import requests
import json

username = "klu2300033406"
url = "https://leetcode.com/graphql"

# AlgoPulse reference query:
query = """
query getRecentSubmissions($username: String!, $limit: Int) {
  recentSubmissionList(username: $username, limit: $limit) {
    title
    titleSlug
    timestamp
    statusDisplay
    lang
  }
}
"""

headers = {
    "Content-Type": "application/json",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Referer": "https://leetcode.com/",
    "Origin": "https://leetcode.com",
}

# Test with limit=20
payload = {
    "query": query,
    "variables": {"username": username, "limit": 20}
}

r = requests.post(url, json=payload, headers=headers)
print("status:", r.status_code)
print("response:", r.text)
