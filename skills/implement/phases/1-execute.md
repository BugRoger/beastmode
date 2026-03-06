# 1. Execute

## 1. Execute Tasks

For each task in the plan:

1. Read task details
2. Execute each step
3. Mark task complete in TodoWrite
4. Update tasks.json status

## 2. Task Execution Pattern

```
For each task:
  Read files listed
  Execute steps in order
  Run verification command
  Mark complete
```

## 3. Error Handling

If a step fails:
- Stop and report the error
- Do NOT proceed to next task
- Suggest fix or ask for guidance
