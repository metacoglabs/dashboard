# Tex SDK — Developer Integration Guide

A complete, end-to-end walkthrough of integrating **Tex** — the memory layer for AI agents — into your application. Covers signup, auth, every core verb, error semantics, production patterns, and ten ready-to-paste integration recipes.

> Looking for the dashboard? Sign up and manage keys at https://app.getmetacognition.com.
> Looking for the API reference? `python -c "from tex import Tex; help(Tex)"` after install, or read [`sdk/tex/`](https://github.com/metacoglabs/tex-sdk/tree/main/sdk/tex).

---

## Contents

1. [What Tex is, and what it isn't](#1-what-tex-is-and-what-it-isnt)
2. [Prerequisites](#2-prerequisites)
3. [Get an API key](#3-get-an-api-key)
4. [Install the SDK](#4-install-the-sdk)
5. [Quickstart — three calls](#5-quickstart--three-calls)
6. [Configuration & client lifecycle](#6-configuration--client-lifecycle)
7. [The auth model — API keys, JWTs, refresh](#7-the-auth-model--api-keys-jwts-refresh)
8. [Scopes — `org_id` / `user_id` / `session_id`](#8-scopes--org_id--user_id--session_id)
9. [Core verbs](#9-core-verbs)
   - [`tex.conversations.remember(...)`](#91-conversationsremember)
   - [`tex.recall(...)`](#92-recall)
   - [`tex.usage.today()` / `tex.usage.summary()`](#93-usage)
10. [Error handling](#10-error-handling)
11. [Production patterns](#11-production-patterns)
12. [Integration recipes](#12-integration-recipes)
    - [Plain Python script](#121-plain-python-script)
    - [FastAPI server](#122-fastapi-server)
    - [LangChain agent](#123-langchain-agent)
    - [OpenAI / Azure GPT-4o RAG-on-memory](#124-openai--azure-gpt-4o-rag-on-memory)
    - [Slack bot](#125-slack-bot)
    - [Streamlit web app](#126-streamlit-web-app)
    - [CLI tool](#127-cli-tool)
    - [Background worker (Celery / RQ)](#128-background-worker-celery--rq)
    - [Multi-tenant SaaS backend](#129-multi-tenant-saas-backend)
    - [Notebook / data analysis](#1210-notebook--data-analysis)
13. [Quotas, billing, and metering](#13-quotas-billing-and-metering)
14. [Troubleshooting](#14-troubleshooting)
15. [Migrating an existing chatbot to Tex](#15-migrating-an-existing-chatbot-to-tex)

---

## 1. What Tex is, and what it isn't

**Tex is a hosted memory layer for AI agents.** You give it conversation turns; it builds a multi-modal memory store (raw turns + extracted observations + entities + temporal index). When your agent needs context, you call `tex.recall(...)` and get back the most relevant slice of history.

| Tex is for… | Tex is not for… |
| --- | --- |
| Long-running chat history that exceeds the LLM context window | Loading static documentation into a vector DB (use plain RAG) |
| Personal / per-user memory that must persist across sessions | Bulk file ingestion at GB scale (use a data lake first) |
| Multi-session retrieval with temporal ordering | A general-purpose graph database |
| Metered, multi-tenant SaaS where each org has private memory | Cold storage / archival |

**Mental model:** Tex sits between your agent loop and your LLM. Every turn → `remember`. Before every prompt → `recall` and stuff the hits into your system prompt.

---

## 2. Prerequisites

- **Python ≥ 3.9.** `pip` or `uv` available.
- **A Tex API key** (next section).
- **An LLM** (any — OpenAI, Anthropic, Azure, local). Tex stores and retrieves memory; *you* stay in charge of generation.

Optional but recommended:
- `httpx[http2]>=0.27` already pulled in by the SDK; HTTP/2 reduces tail latency by ~25% on the recall path.
- A correlation-ID-aware logger so you can trace requests across your service and ours.

---

## 3. Get an API key

### 3a. Through the dashboard (recommended)

```text
1. Open https://app.getmetacognition.com
2. Click "Create account"
3. Choose an org name → submit
4. Copy the API key shown ONCE on the next screen.
   (You will not see it again — store it in your secrets manager now.)
```

You can mint additional keys (one per environment, per machine, or per teammate) from **Dashboard → API Keys → New key**. Revoke at any time; revocation is effective within seconds.

### 3b. Programmatically (for SaaS that resells Tex)

```bash
curl -X POST https://api.getmetacognition.com/signup \
  -H 'content-type: application/json' \
  -d '{"name": "acme corp"}'
```

Response:

```json
{
  "org_id":   "org_…",
  "user_id":  "user_…",
  "api_key":  "tex_live_…",
  "key": { "id": "…", "prefix": "tex_live_", "display_id": "…", … }
}
```

The `api_key` field appears only in this signup response. Persist it server-side — there is no recovery.

### 3c. Where to keep the key

| Environment | Storage |
| --- | --- |
| Local dev | `.env` file, never committed |
| Docker / k8s | Secret manager → mounted as env var |
| GitHub Actions | Repository secret (`TEX_API_KEY`) |
| Vercel | Project Environment Variable |
| Lambda / Cloud Run | Secret Manager binding |

The SDK reads `TEX_API_KEY` automatically when `api_key=` is omitted.

---

## 4. Install the SDK

```bash
pip install tex-sdk
```

> The PyPI distribution is named `tex-sdk` but the import name is `tex`:
>
> ```python
> from tex import Tex
> ```

Check version:

```bash
python -c "import tex; print(tex.__version__)"
# → 1.1.0
```

Pin in `requirements.txt`:

```
tex-sdk>=1.1.0,<2
```

Pin in `pyproject.toml` (PEP 621):

```toml
[project]
dependencies = [
  "tex-sdk>=1.1.0,<2",
]
```

---

## 5. Quickstart — three calls

```python
import os
from tex import Tex

tex = Tex(
    api_key=os.environ["TEX_API_KEY"],
    base_url="https://api.getmetacognition.com",
)

# (1) REMEMBER — push a few turns into memory
tex.conversations.remember(
    session_id="chat-42",
    turns=[
        {"role": "user", "text": "I'm allergic to shellfish.",
         "timestamp": "2026-01-12T14:00:00Z"},
        {"role": "assistant", "text": "Got it — I'll avoid shellfish in future suggestions.",
         "timestamp": "2026-01-12T14:00:01Z"},
    ],
)

# (2) RECALL — pull the most relevant slice of history
hits = tex.recall(
    q="any food restrictions I should know about?",
    session_id="chat-42",
    top_k=5,
)
for hit in hits.hits.turns:
    print(f"[{hit.score:.2f}] {hit.text}")

# (3) USAGE — see how many tokens you've burned today
status = tex.usage.today()
print(f"in: {status.tokens_in_used:,} / {status.tokens_in_limit:,}")
print(f"out: {status.tokens_out_used:,} / {status.tokens_out_limit:,}")
```

That's the whole core loop.

---

## 6. Configuration & client lifecycle

### 6.1. Constructor

```python
Tex(
    api_key: str | None = None,         # or env TEX_API_KEY
    *,
    base_url: str | None = None,        # or env TEX_BASE_URL
    org_id: str | None = None,          # default scope
    user_id: str | None = None,         # default scope
    session_id: str | None = None,      # default scope (you usually pass per-call)
    access_token: str | None = None,    # bring-your-own JWT
    refresh_token: str | None = None,   # bring-your-own refresh JWT
    timeout: float = 60.0,              # per-request, seconds
    max_retries: int = 2,               # transient error retries
    http2: bool = True,                 # disable if your egress proxy blocks h2
)
```

All keyword args are optional except *one* of: `api_key`, `access_token`, or (`org_id` + `user_id` for shared-cluster passwordless logins).

### 6.2. Lifecycle

The client maintains a pooled `httpx.Client` under the hood. **Construct once, reuse everywhere.**

```python
# ✅ DO — module-level, long-lived
tex = Tex(api_key=os.environ["TEX_API_KEY"], base_url=BASE_URL)

# ✅ DO — context manager for short scripts
with Tex(api_key=...) as tex:
    tex.recall(...)

# ❌ DON'T — per-request construction in a hot loop
def handler(req):
    tex = Tex(api_key=...)   # opens a new HTTPS connection every time
    return tex.recall(...)
```

The client is **thread-safe for read traffic** (`recall`, `usage.today`). For write traffic (`remember`) under high concurrency you may want a worker pool — see [§11](#11-production-patterns).

### 6.3. Environment variables

| Variable | Read by | Default |
| --- | --- | --- |
| `TEX_API_KEY` | constructor | — (required) |
| `TEX_BASE_URL` | constructor | — (required if not passed) |

A `.env` template:

```bash
TEX_API_KEY=tex_live_xxxxxxxxxxxxxxxxxxxxxxxx
TEX_BASE_URL=https://api.getmetacognition.com
```

---

## 7. The auth model — API keys, JWTs, refresh

You pass an **API key**. The SDK internally exchanges it for a short-lived **JWT** the first time it's needed, caches the JWT, and refreshes transparently when it expires.

```text
                    ┌───────────────────────────┐
api_key  ─POST /auth/token-exchange─▶  access_token (24h) + refresh_token (7d)
                    │                          │
                    └────── stays in client ───┘
                              │
                              ▼
            every request → Authorization: Bearer <access_token>
                              │
                       on 401 (expired) ──▶ POST /auth/refresh ──▶ new access_token
```

**You never see the JWT.** It's an implementation detail. You hold the API key; the SDK handles everything else.

### 7.1. What if the API key is bad?

You get an `AuthenticationError` on the first call:

```python
from tex import Tex, AuthenticationError

try:
    tex = Tex(api_key="tex_live_BOGUS", base_url=BASE_URL)
    tex.usage.today()
except AuthenticationError as e:
    print(e.status_code)   # 401
    print(e.message)       # "Invalid API key" or similar
```

### 7.2. Bring-your-own JWT

If you've already obtained a JWT (e.g. via a backend service that brokers auth), pass it directly:

```python
tex = Tex(
    access_token=jwt_from_my_auth_service,
    base_url=BASE_URL,
    org_id="org_abc",
    user_id="user_xyz",
)
```

The SDK still refreshes on 401 if you also passed `refresh_token`.

### 7.3. Rotating keys without downtime

1. Mint key B in the dashboard.
2. Deploy your service with `TEX_API_KEY=<key B>`.
3. Verify traffic is succeeding (look at usage dashboard or your own logs).
4. Revoke key A.

Old in-flight JWTs minted from key A continue to work for up to ~24h after revocation, so step 4 has zero customer-visible impact.

---

## 8. Scopes — `org_id` / `user_id` / `session_id`

Every turn and every recall is scoped to a `(org_id, user_id, session_id)` tuple.

| Field | Set by | Required? |
| --- | --- | --- |
| `org_id` | The JWT (i.e. your API key) — the SDK injects it automatically | ✓ |
| `user_id` | The JWT, *unless* you log in as a sub-user explicitly | ✓ |
| `session_id` | **You, per-call** | ✓ for `remember`, ✓ for `recall` |

Picking a `session_id`:

- **One conversation** → one `session_id`. E.g. `"chat-2026-04-12-uuid"`.
- **Long-running agent / autonomous worker** → one `session_id` per task.
- **Group chat / Slack channel** → one `session_id` per channel.
- **Per-user lifetime memory** → use a stable id like `user-bio` plus a per-conversation id, then `recall` against both.

`session_id` is just a string — there's no limit on length and no setup cost. Reuse, don't enumerate.

### 8.1. Multi-user SaaS — sub-user scoping

If you sell to end-users (e.g. each end-user gets their own memory), you have two patterns:

**Pattern A — one Tex API key, sub-user scoped:**
```python
tex = Tex(
    api_key=os.environ["TEX_API_KEY"],     # your platform key
    base_url=BASE_URL,
    user_id=f"u_{end_user_id}",             # tells Tex "this turn is end_user X's"
)
```
Memory is partitioned per `user_id`. Recommended for most cases.

**Pattern B — one Tex API key per end-user:** mint a key via the signup endpoint per end-user and store it in your DB. Heavier, but lets you give end-users direct dashboard access to their own usage.

---

## 9. Core verbs

### 9.1. `conversations.remember`

```python
RememberResponse = tex.conversations.remember(
    turns: list[dict],
    *,
    session_id: str,
    metadata: dict | None = None,
) -> RememberResponse
```

`turns` is a list of dicts. Each dict shape:

```python
{
    "role": "user" | "assistant" | "system" | str,   # any free-form role
    "text": "the thing said",
    "timestamp": "2026-01-12T14:00:00Z",             # ISO 8601, UTC preferred
    "observations": [...],                            # optional, see below
}
```

#### What happens server-side

`remember` is **two-phase**:

1. **Active write (synchronous, ~50–200ms)** — turns land in active memory immediately and are recallable on the very next call. The `active_fragment_ids` you get back are the canonical IDs.
2. **Passive enrichment (async, seconds–minutes)** — observations and entities are extracted, embedded into the long-term store, and indexed. You can monitor the job via `passive_job_id` if returned.

So: **a `remember` returns before deep indexing finishes, but the turn is recallable straight away.**

#### Response

```python
@dataclass
class RememberResponse:
    job_id: str
    active_fragment_ids: list[str]
    passive_job_id: str | None
    usage: Usage   # tokens_in, tokens_out
```

#### Batching

You can pass **dozens of turns in one call**. Don't call `remember` once per turn in a tight loop — batch them.

```python
# ✅ batch
tex.conversations.remember(session_id="chat-1", turns=all_new_turns)

# ❌ chatty
for turn in all_new_turns:
    tex.conversations.remember(session_id="chat-1", turns=[turn])
```

#### Custom observations (advanced)

If you've already extracted structured facts on your side, pass them inline to skip Tex's extraction step:

```python
turns = [{
    "role": "user",
    "text": "I'm allergic to shellfish.",
    "timestamp": "...",
    "observations": [
        {"type": "preference",  "predicate": "avoids", "value": "shellfish"},
    ],
}]
```

### 9.2. `recall`

```python
RecallResponse = tex.recall(
    q: str,
    *,
    session_id: str,
    mode: "active" | "deep" = "active",
    top_k: int | None = None,        # default 8
    include_timeline: bool = False,
) -> RecallResponse
```

#### `mode="active"` (the default)

Single-pass retrieval. Returns relevant turns + observations from active memory. **Latency: ~1.5–2.5s.** Use this for every interactive call.

#### `mode="deep"`

Two-pass retrieval with iterative re-ranking. Higher recall, surfaces older or less-obvious memory. **Latency: ~3–6s.** Use this when:
- The user explicitly asks "what do you remember about X?"
- You're building a periodic summary or analysis
- Active mode returned `confidence < 0.4`

#### `top_k`

The number of results across all hit types. Sensible values: 3–10 for live chat, 15–30 for analysis tasks. Defaults to 8.

#### `include_timeline=True`

Adds a chronologically-ordered list of relevant timestamps to the response. Useful for "when did the user first mention X?" queries.

#### Response

```python
@dataclass
class RecallResponse:
    hits: RecallHits          # .turns, .observations, .entities — each a list of RecallHit
    timeline: list | None     # only when include_timeline=True
    confidence: float         # 0.0–1.0, calibrated; <0.3 ≈ "weak"
    mode: str                 # echoes the request mode
    usage: Usage              # tokens_in, tokens_out
```

Each hit:

```python
@dataclass
class RecallHit:
    id: str
    text: str
    score: float          # raw relevance, 0.0–1.0
    kind: str             # "turn" | "observation" | "entity"
    timestamp: str | None
```

#### Patterns

**Build a system prompt:**

```python
hits = tex.recall(q=user_message, session_id=sid, top_k=5)
context = "\n".join(f"- {h.text}" for h in hits.hits.turns)
prompt = f"Relevant memory:\n{context}\n\nUser: {user_message}"
```

**Confidence-gated fallback:**

```python
hits = tex.recall(q=q, session_id=sid)
if hits.confidence < 0.3:
    hits = tex.recall(q=q, session_id=sid, mode="deep")
```

### 9.3. Usage

Fast, cached, cheap (does not count against your own quota).

```python
status = tex.usage.today()
# UsageQuotaStatus(
#   tokens_in_used=12_345, tokens_out_used=4_567,
#   tokens_in_limit=1_000_000, tokens_out_limit=5_000_000,
#   period="day_utc",
#   period_start="2026-05-06T00:00:00+00:00",
#   period_end  ="2026-05-07T00:00:00+00:00",
# )

month = tex.usage.summary()                 # current calendar month
march = tex.usage.summary(month="2026-03")  # specific month, UTC
# UsageWindow(period="month", start="…", end="…", tokens_in=…, tokens_out=…)
```

Use `usage.today()` to:
- Show a quota meter in your own UI.
- Pre-emptively switch to a fallback before you hit 429.
- Page on-call when usage spikes unexpectedly.

---

## 10. Error handling

Every error inherits from `tex.TexError`. You almost always want to catch one of:

| Class | Status | When |
| --- | --- | --- |
| `BadRequestError` | 400 | Malformed payload, e.g. missing `text` on a turn |
| `AuthenticationError` | 401 | Bad / expired key, JWT couldn't be refreshed |
| `PermissionDeniedError` | 403 | Key revoked, key lacks scope |
| `NotFoundError` | 404 | Unknown `session_id` on a verb that requires existing context |
| `UnprocessableEntityError` | 422 | Validation error (FastAPI shape) |
| `RateLimitError` | 429 | Daily quota exceeded — until UTC midnight |
| `InternalServerError` | 5xx | Our problem; the SDK already retried |
| `APITimeoutError` | — | Network or server too slow |
| `APIConnectionError` | — | DNS, TLS, connection reset |

```python
from tex import (
    Tex, RateLimitError, AuthenticationError,
    APITimeoutError, BadRequestError,
)

try:
    tex.recall(q=q, session_id=sid)
except RateLimitError:
    return cached_or_fallback()
except AuthenticationError:
    page_oncall("tex auth broken")
    raise
except APITimeoutError:
    return degraded_no_memory_response()
except BadRequestError as e:
    log.warning("bad payload: %s", e.details)
    raise
```

Every error carries:

```python
e.status_code     # int | None
e.message         # human-readable
e.details         # dict — server's full JSON body, may include field-level errors
e.request_id      # X-Correlation-ID — quote this when filing tickets
```

### 10.1. Built-in retries

The SDK retries automatically on:

- `408`, `429`, `500`, `502`, `503`, `504`
- `httpx.TimeoutException` (network)
- `httpx.HTTPError` (network)

Default: 2 retries with exponential backoff (0.5s, 1s). Override with `Tex(max_retries=N)`. The `Retry-After` header is honored.

After exhausting retries, the original error class is re-raised.

---

## 11. Production patterns

### 11.1. Long-lived client per process

```python
# settings.py or your DI container
tex_client = Tex(
    api_key=os.environ["TEX_API_KEY"],
    base_url=os.environ["TEX_BASE_URL"],
    timeout=30,
    max_retries=3,
)
```

One instance per process; share across requests.

### 11.2. Async / high concurrency

The SDK is sync today. For high-RPS services use a thread pool:

```python
from concurrent.futures import ThreadPoolExecutor
pool = ThreadPoolExecutor(max_workers=16)

def background_remember(turns, sid):
    pool.submit(tex.conversations.remember, turns, session_id=sid)
```

A native async client is on the roadmap — open an issue if you need it sooner.

### 11.3. Fire-and-forget remember

`remember` is on your write path; you don't usually want users to wait for it. Push it to a background queue:

```python
# pseudocode
def on_user_turn(text):
    answer = generate(text, context=tex.recall(q=text, session_id=sid))
    queue.enqueue(tex.conversations.remember,
                  session_id=sid,
                  turns=[{"role":"user","text":text,...},
                         {"role":"assistant","text":answer,...}])
    return answer
```

Tex returns `active_fragment_ids` only after the active write finishes, so if you rely on those IDs synchronously, await the call. Otherwise, queue.

### 11.4. Recall on the read path

Always block on `recall` — your prompt depends on it. But:

- Set a wall-clock budget (`timeout=2.0`) and fall back to no-memory generation on timeout.
- Cache by `(session_id, q-hash)` for very short TTLs (5–10s) if you have repeated identical queries.

### 11.5. Quota-aware routing

```python
def smart_recall(q, sid):
    status = tex.usage.today()  # cached for 60s by your side
    if status.tokens_in_used / status.tokens_in_limit > 0.9:
        return None             # skip recall, save tokens
    return tex.recall(q=q, session_id=sid)
```

### 11.6. Observability

Every request carries an `X-Correlation-ID`. The SDK generates one per request. To trace end-to-end, log it on your side:

```python
import logging, httpx
def log_corr_id(response: httpx.Response):
    logging.info("tex_cid=%s status=%s", response.headers.get("X-Correlation-ID"), response.status_code)
# (Wiring this requires accessing the underlying httpx client; reach out if you need a hook.)
```

---

## 12. Integration recipes

### 12.1. Plain Python script

```python
# pip install tex-sdk python-dotenv
from dotenv import load_dotenv; load_dotenv()
from tex import Tex
import os

tex = Tex(api_key=os.environ["TEX_API_KEY"], base_url=os.environ["TEX_BASE_URL"])
tex.conversations.remember(
    session_id="cli-1",
    turns=[{"role":"user","text":"hello world","timestamp":"2026-05-06T10:00:00Z"}],
)
print(tex.recall(q="what was said?", session_id="cli-1").hits.turns[0].text)
```

### 12.2. FastAPI server

```python
# app/deps.py
from functools import lru_cache
from tex import Tex
import os

@lru_cache
def tex_client() -> Tex:
    return Tex(api_key=os.environ["TEX_API_KEY"], base_url=os.environ["TEX_BASE_URL"])

# app/routes.py
from fastapi import APIRouter, Depends
from .deps import tex_client

router = APIRouter()

@router.post("/chat")
def chat(payload: dict, tex = Depends(tex_client)):
    sid = payload["session_id"]
    text = payload["text"]
    hits = tex.recall(q=text, session_id=sid, top_k=5)
    answer = generate(text, context=[h.text for h in hits.hits.turns])
    tex.conversations.remember(
        session_id=sid,
        turns=[
            {"role":"user","text":text,"timestamp":payload["ts"]},
            {"role":"assistant","text":answer,"timestamp":now_iso()},
        ],
    )
    return {"answer": answer, "confidence": hits.confidence}
```

### 12.3. LangChain agent

```python
# pip install tex-sdk langchain langchain-openai
from langchain.tools import tool
from tex import Tex
import os

tex = Tex(api_key=os.environ["TEX_API_KEY"], base_url=os.environ["TEX_BASE_URL"])

@tool
def recall_memory(query: str) -> str:
    """Recall the agent's long-term memory relevant to the query."""
    hits = tex.recall(q=query, session_id="agent-1", top_k=5)
    return "\n".join(f"[{h.score:.2f}] {h.text}" for h in hits.hits.turns)

# After every interaction, push to memory
def remember_turn(role, text):
    tex.conversations.remember(
        session_id="agent-1",
        turns=[{"role": role, "text": text, "timestamp": now_iso()}],
    )

# Then use `recall_memory` like any other tool in your agent.
```

### 12.4. OpenAI / Azure GPT-4o RAG-on-memory

```python
# pip install tex-sdk openai
import os
from openai import AzureOpenAI
from tex import Tex

tex = Tex(api_key=os.environ["TEX_API_KEY"], base_url=os.environ["TEX_BASE_URL"])
gpt = AzureOpenAI(
    api_key=os.environ["AZURE_OPENAI_API_KEY"],
    api_version="2025-04-01-preview",
    azure_endpoint=os.environ["AZURE_OPENAI_ENDPOINT"],
)

def answer(query: str, sid: str) -> str:
    hits = tex.recall(q=query, session_id=sid, top_k=5)
    memory = "\n".join(f"- {h.text}" for h in hits.hits.turns)

    chat = gpt.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role":"system",
             "content": f"You are a helpful assistant. Relevant memory about this user:\n{memory}"},
            {"role":"user","content": query},
        ],
    )
    answer = chat.choices[0].message.content

    tex.conversations.remember(session_id=sid, turns=[
        {"role":"user","text":query,"timestamp": now_iso()},
        {"role":"assistant","text":answer,"timestamp": now_iso()},
    ])
    return answer
```

### 12.5. Slack bot

```python
# pip install tex-sdk slack-bolt
from slack_bolt import App
from tex import Tex
import os

tex = Tex(api_key=os.environ["TEX_API_KEY"], base_url=os.environ["TEX_BASE_URL"])
app = App(token=os.environ["SLACK_BOT_TOKEN"])

@app.message("")
def on_message(message, say):
    sid = f"slack-{message['channel']}"
    hits = tex.recall(q=message["text"], session_id=sid, top_k=3)
    reply = build_reply(message["text"], hits)
    say(reply)
    tex.conversations.remember(session_id=sid, turns=[
        {"role":"user","text":message["text"],
         "timestamp": iso(message["ts"])},
        {"role":"assistant","text":reply,"timestamp": now_iso()},
    ])
```

Use one `session_id` per channel for shared memory; one per `(channel, user)` for private.

### 12.6. Streamlit web app

```python
# pip install tex-sdk streamlit
import streamlit as st
from tex import Tex
import os, datetime

@st.cache_resource
def get_tex():
    return Tex(api_key=os.environ["TEX_API_KEY"], base_url=os.environ["TEX_BASE_URL"])

tex = get_tex()
sid = st.session_state.setdefault("sid", f"web-{st.session_state.get('uid','anon')}")

if prompt := st.chat_input("Ask"):
    hits = tex.recall(q=prompt, session_id=sid, top_k=5)
    st.write(f"Confidence: {hits.confidence:.2f}")
    for h in hits.hits.turns:
        st.caption(f"[{h.score:.2f}] {h.text}")
    answer = generate(prompt, hits)
    st.write(answer)
    tex.conversations.remember(session_id=sid, turns=[
        {"role":"user","text":prompt,"timestamp": datetime.datetime.utcnow().isoformat()+"Z"},
        {"role":"assistant","text":answer,"timestamp": datetime.datetime.utcnow().isoformat()+"Z"},
    ])
```

### 12.7. CLI tool

```python
#!/usr/bin/env python
# pip install tex-sdk click
import click, os, sys, datetime
from tex import Tex
tex = Tex(api_key=os.environ["TEX_API_KEY"], base_url=os.environ["TEX_BASE_URL"])

@click.group()
def cli(): ...

@cli.command()
@click.option("--session", default="cli")
def add(session):
    """Pipe text to remember it."""
    text = sys.stdin.read().strip()
    tex.conversations.remember(session_id=session, turns=[
        {"role":"user","text":text,"timestamp": datetime.datetime.utcnow().isoformat()+"Z"},
    ])

@cli.command()
@click.argument("question")
@click.option("--session", default="cli")
def ask(question, session):
    hits = tex.recall(q=question, session_id=session, top_k=5)
    for h in hits.hits.turns:
        click.echo(f"[{h.score:.2f}] {h.text}")

if __name__ == "__main__":
    cli()
```

### 12.8. Background worker (Celery / RQ)

```python
# tasks.py — Celery
from celery import Celery
from tex import Tex
import os

celery = Celery("tex_worker", broker=os.environ["REDIS_URL"])
tex = Tex(api_key=os.environ["TEX_API_KEY"], base_url=os.environ["TEX_BASE_URL"])

@celery.task(bind=True, max_retries=3)
def remember_turn(self, session_id, turns):
    try:
        tex.conversations.remember(session_id=session_id, turns=turns)
    except Exception as e:
        raise self.retry(exc=e, countdown=2 ** self.request.retries)
```

### 12.9. Multi-tenant SaaS backend

```python
# Each end-user has their own user_id; memory is partitioned per-user.
from fastapi import Header

def user_scoped_tex(end_user_id: str) -> Tex:
    return Tex(
        api_key=os.environ["TEX_API_KEY"],
        base_url=os.environ["TEX_BASE_URL"],
        user_id=f"u_{end_user_id}",
    )

@router.post("/chat")
def chat(body: ChatBody, x_user_id: str = Header(...)):
    tex = user_scoped_tex(x_user_id)
    hits = tex.recall(q=body.text, session_id=body.session_id)
    ...
```

For thousands of end-users, **don't** create one `Tex` per user-request — create a single shared client and pass `scope.user_id` per call. (A scoped helper is on the roadmap; today, the constructor scope is the pattern.)

### 12.10. Notebook / data analysis

```python
# Jupyter — explore your own org's memory
from tex import Tex
import os, pandas as pd

tex = Tex(api_key=os.environ["TEX_API_KEY"], base_url=os.environ["TEX_BASE_URL"])

# Pull the last 6 months of usage as a frame
months = []
for m in ["2026-01","2026-02","2026-03","2026-04","2026-05"]:
    w = tex.usage.summary(month=m)
    months.append({"month": m, "tokens_in": w.tokens_in, "tokens_out": w.tokens_out})
pd.DataFrame(months).set_index("month").plot.bar()
```

---

## 13. Quotas, billing, and metering

### 13.1. The billable unit

**Tokens.** Specifically `tokens_in` (everything you sent us — turns, queries) and `tokens_out` (everything we sent back — recall hits, observations). Counted with `tiktoken` `cl100k_base` to match `text-embedding-3-large`.

### 13.2. The free tier (launch month)

| Metric | Daily limit |
| --- | --- |
| `tokens_in` | 1,000,000 |
| `tokens_out` | 5,000,000 |

Reset 00:00 UTC. Exceed → `429 RateLimitError` until reset.

### 13.3. After launch

Pay-as-you-go. Pricing TBA. Existing daily limits stay as **soft alert** thresholds (we'll email you, not 429 you).

### 13.4. How to monitor

| Surface | What you see |
| --- | --- |
| Dashboard → Usage | Daily bars + 6-month trend |
| `tex.usage.today()` | Programmatic |
| `tex.usage.summary(month=...)` | Programmatic, by month |
| Email alert | At 80% of either daily cap (auto, no setup) |

### 13.5. Cost control

- Cap `top_k` at 8 unless you have a reason — large `top_k` inflates `tokens_out` significantly.
- Use `mode="active"`, not `"deep"`, for interactive paths.
- Don't `remember` system messages or empty assistant pings — pre-filter.

---

## 14. Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| `AuthenticationError: Invalid API key` on first call | Wrong key, key revoked, or wrong `base_url` | Re-mint via dashboard; verify `TEX_BASE_URL` |
| `BadRequestError: 'scope' field required` | You're calling our REST API directly without the SDK | Use the SDK; it builds `scope` for you |
| `recall` returns 0 hits | New session, or memory hasn't finished passive enrichment yet | Wait 1–2s after `remember`; query a broader `q` |
| `recall.confidence` always low | Your `q` doesn't match anything stored | Re-phrase; switch to `mode="deep"` |
| `RateLimitError` mid-day | Hit the daily quota | Wait until 00:00 UTC, or reduce `top_k` |
| Slow `recall` (> 5s) | Likely `mode="deep"` or cold cache | Use `mode="active"`; warm-start the client |
| `httpx.RemoteProtocolError` / HTTP/2 issues | Egress proxy strips h2 | `Tex(..., http2=False)` |
| Long `remember` blocks the user | You're awaiting it on the request path | Push to a background worker (see §11.3) |
| Tests are flaky against Tex | You're hitting the real cluster from CI | Use a dedicated CI `org_id` and a daily-cleanup script |

When opening a ticket, include:
1. The full `e.request_id` from the exception (a UUID).
2. The approximate timestamp (UTC).
3. The verb you called (`recall`, `remember`, …) and the `session_id`.
4. The SDK version (`tex.__version__`).

---

## 15. Migrating an existing chatbot to Tex

Most chatbots have an existing flow like:

```text
[ user msg ] ─▶ [ load history from Redis/Postgres ] ─▶ [ build prompt ] ─▶ [ LLM ] ─▶ [ append to history ] ─▶ [ reply ]
```

The Tex migration replaces *load history* and *append to history*:

```python
# BEFORE
history = redis.lrange(f"hist:{sid}", 0, 50)
prompt = stitch(history, user_msg)
reply = llm(prompt)
redis.rpush(f"hist:{sid}", json.dumps({"u": user_msg, "a": reply}))

# AFTER
hits = tex.recall(q=user_msg, session_id=sid, top_k=8)
prompt = stitch_with_memory([h.text for h in hits.hits.turns], user_msg)
reply = llm(prompt)
tex.conversations.remember(session_id=sid, turns=[
    {"role":"user","text":user_msg,"timestamp": now_iso()},
    {"role":"assistant","text":reply,"timestamp": now_iso()},
])
```

Three things change for the better:

1. **Context size is bounded.** You no longer drag the entire chat into the prompt; you pull the *relevant* slice.
2. **Cross-session memory is free.** Use the same `session_id` family (e.g. `f"chat-{user_id}"`) and you get continuity across days.
3. **You stop maintaining your own retention policy.** No more "keep last 50 messages." Tex's confidence scoring decides.

Backfill plan:

1. For each existing session in your DB, call `remember` with the full historical turn list. Use the original timestamps.
2. Verify recall on a sample.
3. Cut over the read path (`recall` first; fall back to your DB if `confidence < 0.2` for a week).
4. Cut over the write path (`remember` only; stop writing to your DB).
5. Run for a week, then drop the legacy table.

---

**That's the whole guide.** Questions, bugs, or rough edges → `support@getmetacognition.com`.
