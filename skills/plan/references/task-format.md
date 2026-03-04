# Task Format Reference

## Bite-Sized Granularity

Each step is one action (2-5 minutes):
- "Write the failing test" - step
- "Run it to make sure it fails" - step
- "Implement the minimal code to make the test pass" - step
- "Run the tests and make sure they pass" - step

## Task Structure

```markdown
### Task N: [Component Name]

**Wave:** [integer, default 1]
**Depends on:** [Task references, or `-` if none]

**Files:**
- Create: `exact/path/to/file.py`
- Modify: `exact/path/to/existing.py:123-145`
- Test: `tests/exact/path/to/test.py`

**Step 1: Write the failing test**

\`\`\`python
def test_specific_behavior():
    result = function(input)
    assert result == expected
\`\`\`

**Step 2: Run test to verify it fails**

Run: `pytest tests/path/test.py::test_name -v`
Expected: FAIL with "function not defined"

**Step 3: Write minimal implementation**

\`\`\`python
def function(input):
    return expected
\`\`\`

**Step 4: Run test to verify it passes**

Run: `pytest tests/path/test.py::test_name -v`
Expected: PASS

**Step 5: Verify**

Run all related tests to confirm nothing broke.
No commit needed — unified commit at /release.
```

## Wave Rules

- **Wave 1** runs before **Wave 2**, etc.
- Tasks in the same wave with no `Depends on` can run in parallel
- `Depends on` creates ordering within a wave
- Default wave is 1 if omitted

## Remember

- Exact file paths always
- Complete code in plan (not "add validation")
- Exact commands with expected output
- Reference relevant docs/designs with links
- DRY, YAGNI, TDD (commits at /release only)
