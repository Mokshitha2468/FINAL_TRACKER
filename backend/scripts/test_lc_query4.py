import requests

username = "klu2300033406"
url = "https://leetcode.com/graphql"

queries = [
    ("skillStats", """
    query skillStats($username: String!) {
      matchedUser(username: $username) {
        tagProblemCounts {
          advanced { tagName tagSlug problemsSolved }
          intermediate { tagName tagSlug problemsSolved }
          fundamental { tagName tagSlug problemsSolved }
        }
      }
    }
    """),
    ("badges", """
    query userBadges($username: String!) {
      matchedUser(username: $username) {
        badges { id displayName icon }
      }
    }
    """),
]

for name, q in queries:
    res = requests.post(url, json={"query": q, "variables": {"username": username}}, headers={"Content-Type": "application/json"})
    print(f"--- {name} ---")
    print(res.json())
