# ideas

Surface and reconcile deferred ideas from design docs.

## Steps

### 1. Walk Design Docs

Read all files in `.beastmode/artifacts/design/*.md`.

For each file, extract the `## Deferred Ideas` section.

### 2. Filter Entries

Skip entries that are:
- "None", "None.", or "- None"
- Strikethrough (`~~text~~`) — already reconciled

Collect all remaining entries as pending ideas with:
- Idea text (the bullet content)
- Source feature (extracted from filename)
- Source date (extracted from filename)

### 3. Reconcile Against Skill Files

For each pending idea:

1. Read the idea description and its surrounding design context
2. Identify which skill files likely relate to the idea
3. Read those skill files and check if the functionality described in the idea exists
4. Verdict: **implemented** (the idea's functionality exists in a skill file) or **pending** (not yet implemented)

Use semantic judgment — ideas are free-text descriptions, not exact code references. Match on intent, not keywords.

### 4. Mark Implemented Ideas

For each idea marked as implemented:

In the originating design doc, replace:
```
- <idea text>
```
with:
```
- ~~<idea text>~~ (implemented: YYYY-MM-DD)
```

Use today's date.

### 5. Display Results

```
## Deferred Ideas (N pending)

- <idea> (from: <feature>, <date>)
- <idea> (from: <feature>, <date>)

Reconciled: M ideas marked as implemented.
```

If no pending ideas: "No pending deferred ideas."
