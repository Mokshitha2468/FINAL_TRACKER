import requests

username = "klu2300033406"
url = "https://leetcode.com/graphql"
headers = {
    "Content-Type": "application/json",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Referer": f"https://leetcode.com/{username}/",
}

# Test 1: userProfileCalendar
q_calendar = """
query userProfileCalendar($username: String!, $year: Int) {
  matchedUser(username: $username) {
    userCalendar(year: $year) {
      activeYears
      streak
      totalActiveDays
      submissionCalendar
    }
  }
}
"""
r_cal = requests.post(url, json={"query": q_calendar, "variables": {"username": username}}, headers=headers)
print("Calendar:", r_cal.status_code, r_cal.json())

# Test 2: recentAcSubmissions without variables or with different casing
# Let's test the public leetcode-stats-api or alfa-leetcode-api or similar to see how they fetch submissions
q_sub = """
query getRecentSubmissions($username: String!) {
  recentSubmissionList(username: $username) {
    title
    titleSlug
    timestamp
    statusDisplay
    lang
  }
}
"""
r_sub = requests.post(url, json={"query": q_sub, "variables": {"username": username}}, headers=headers)
print("Submissions:", r_sub.status_code, r_sub.json())

# Test 3: userProfileQuestions
# Let's check what query is used by the LeetCode frontend when browsing a user profile
# Let's search how LeetCode frontend fetches solved problems or recent submissions
