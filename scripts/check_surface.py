import json
import pathlib
import urllib.error
import urllib.request

base = "http://localhost:8080"


def req(path, cookie=None, method="GET", body=None):
    request = urllib.request.Request(base + path, method=method)
    if cookie:
        request.add_header("Cookie", "session=" + cookie)
    if body is not None:
        request.data = json.dumps(body).encode()
        request.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(request, timeout=10) as response:
            return response.status, response.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as error:
        return error.code, error.read().decode()


feed_a = req("/events/evt_01/judges/jdg_01/feed", "jdg_a_91bc")
feed_cross = req("/events/evt_01/judges/jdg_01/feed", "jdg_b_44de")
commit = req("/api/judge/scores", "jdg_a_91bc", "POST", {"project_id": "prj_02", "stars": 4})
own = req("/api/judge/scores", "jdg_a_91bc")
pathlib.Path("evidence/05-reels.txt").write_text(
    "\n".join(
        [
            f"feed judge A {feed_a[0]}",
            f"feed judge B opening judge A {feed_cross[0]}",
            f"commit {commit[0]} {commit[1]}",
            f"own ballot lists prj_02 {('prj_02' in own[1])}",
        ]
    )
    + "\n",
    encoding="utf-8",
)

docs = req("/docs")
cert = req("/projects/prj_34/certificate")
vote = req("/api/projects/prj_01/vote", "prt_2e88", "POST", {"votes": 2})
sealed = req("/api/voting/results")
pairs = req("/events/evt_01/judges/jdg_01/pairwise", "jdg_a_91bc")
pathlib.Path("evidence/07-bonuses.txt").write_text(
    "\n".join(
        [
            f"docs {docs[0]} cdn={'cdn' in docs[1].lower()}",
            f"certificate {cert[0]} demo={'demo seal' in cert[1].lower()}",
            f"vote {vote[1]}",
            f"sealed {sealed[1]}",
            f"pairs {pairs[0]}",
        ]
    )
    + "\n",
    encoding="utf-8",
)
