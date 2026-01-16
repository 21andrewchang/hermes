# Testing Set (Actions + Logging)

## Stage Model Recap

- No “detected” stage. Creating the issue immediately puts it in `clarification`.
- During `clarification`, Hermes only asks questions.
- Gate: Hermes must ask the user if it should surface the issue.
- If user says yes, stage → `surface` and Hermes sends a neutral `checkin`.
- If user says no, stay in `clarification` and offer reflection/self-improvement prompts.

## Test 1: New Issue → Create + Clarification (no checkin)

**Chat input (Andrew):**

> I’m frustrated that Nico goes silent for hours when we’re in the middle of a decision.

**Expected log actions**

```
[
  {
    type: create_issue,
    issue_id: null,
    title: Nico silent during decisions,
    context: Nico becomes unresponsive for hours during decision-making.,
    severity: med,
    stage: clarification,
    set_active: true
  }
]
```

**Expected action summary**

```
created issue + response
```

## Test 2: More detail → Update + Clarification (still no checkin)

**Chat input (Andrew):**

> It happened today — we have a big sales call and he just shut down and went to his room.

**Expected log actions**

```
[
  {
    type: update_issue,
    issue_id: <active_issue_id>,
    title: Nico silent during urgent decisions,
    context: Recurring shutdowns during high‑stakes decisions like sales call prep.,
    stage: clarification,
    set_active: true
  }
]
```

**Expected action summary**

```
update issue + response
```

## Test 3: Gate question (clarification → user asked)

**Hermes prompt (not logged as action):**

> Do you want me to gently bring this up to Nico, or keep this between us for now?

## Test 4: User says YES → stage change + checkin

**Chat input (Andrew):**

> Yeah, you can bring it up gently.

**Expected log actions**

```
[
  {
    type: stage_change,
    issue_id: <active_issue_id>,
    from: clarification,
    to: surface,
    reason: User approved gentle surfacing.
  },
  {
    type: notify_other,
    issue_id: <active_issue_id>,
    target_user_id: <nico_id>,
    channel: checkin,
    reason: User approved surfacing; severity >= med.,
    payload: Quick check‑in: how are you feeling about the current pace this week?
  }
]
```

**Expected action summary**

```
stage: clarification → surface | checkin sent
```

## Test 5: User says NO → remain in clarification

**Chat input (Andrew):**

> I don’t want you to bring it up yet.

**Expected log actions**

```
[
  {
    type: update_issue,
    issue_id: <active_issue_id>,
    context: User asked to keep this private for now.,
    stage: clarification,
    set_active: true
  }
]
```

**Expected action summary**

```
update issue + response
```
