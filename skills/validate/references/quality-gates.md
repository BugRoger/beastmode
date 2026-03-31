# Quality Gates

## Why Gates Matter

Quality gates prevent broken code from reaching release. Each gate is a checkpoint that must pass.

## Default Gates

1. **Tests** (required) - All tests must pass
2. **Lint** (optional) - Code style compliance
3. **Types** (optional) - Type checking passes

## Custom Gates

Add custom gates in `.beastmode/context/VALIDATE.md`:

```markdown
## Custom Gates

- [ ] Performance benchmarks pass
- [ ] Security scan clean
- [ ] Coverage > 80%
```
