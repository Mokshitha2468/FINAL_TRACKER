import requests
import json

username = "klu2300033406"
url = "https://leetcode.com/graphql"

headers = {
    "Content-Type": "application/json",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Referer": f"https://leetcode.com/{username}/",
}

# 1. Test recentAcSubmissionList
q1 = """
query recentAcSubmissions($username: String!, $limit: Int!) {
  recentAcSubmissionList(username: $username, limit: $limit) {
    id
    title
    titleSlug
    timestamp
  }
}
"""

try:
    r1 = requests.post(url, json={"query": q1, "variables": {"username": username, "limit": 50}}, headers=headers, timeout=15)
    print("q1 status:", r1.status_code)
    print("q1 json:", r1.json())
except Exception as e:
    print("q1 err:", e)

# 2. Test matchedUser
q2 = """
query userProfile($username: String!) {
  matchedUser(username: $username) {
    username
    submitStatsGlobal {
      acSubmissionNum {
        difficulty
        count
        submissions
      }
    }
  }
}
"""
try:
    r2 = requests.post(url, json={"query": q2, "variables": {"username": username}}, headers=headers, timeout=15)
    print("q2 status:", r2.status_code)
    print("q2 json:", r2.json())
except Exception as e:
    print("q2 err:", e)

# 3. Test recentSubmissionList (all submissions including failed)
q3 = """
query recentSubmissions($username: String!, $limit: Int!) {
  recentSubmissionList(username: $username, limit: $limit) {
    id
    title
    titleSlug
    statusDisplay
    lang
    time
    timestamp
  }
}
"""
try:
    r3 = requests.post(url, json={"query": q3, "variables": {"username": username, "limit": 50}}, headers=headers, timeout=15)
    print("q3 status:", r3.status_code)
    print("q3 json:", r3.json())
except Exception as e:
    print("q3 err:", e)
