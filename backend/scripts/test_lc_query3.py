import requests

username = "klu2300033406"
url = "https://leetcode.com/graphql"

# Test query for user public profile
q = """
query userProfile($username: String!) {
  allQuestionsCount {
    difficulty
    count
  }
  matchedUser(username: $username) {
    username
    profile {
      realName
      userAvatar
      ranking
    }
    submitStats {
      acSubmissionNum {
        difficulty
        count
        submissions
      }
      totalSubmissionNum {
        difficulty
        count
        submissions
      }
    }
  }
}
"""

r = requests.post(url, json={"query": q, "variables": {"username": username}}, headers={"Content-Type": "application/json"})
print("Profile query:", r.json())
