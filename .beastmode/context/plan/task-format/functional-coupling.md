# Functional Coupling

## Context
File isolation analysis catches shared file targets across parallel features. It does not catch features that are functionally coupled at the acceptance-criteria level — where implementing feature A satisfies feature B's criteria as a side effect, even when they target different files.

## Decision
Features are functionally coupled when the acceptance criteria of one cannot be satisfied without implementing the other's scope. Canonical signal: a module and its sole registration/wiring point are in separate features. Implementing the module requires adding the router/registry case; implementing the router case requires importing the module. Both features touch different files, pass file isolation analysis, yet the implementer completes both while implementing one. The other feature produces zero net code since all changes were already made by the first feature.

Merge functionally coupled features at decomposition time. The test: "Can feature B's acceptance criteria be satisfied without writing any of feature A's code?" If no, they are one feature.

## Rationale
Separated coupled features produce: an empty feature with zero net commits, an orphaned Write Plan with 7+ tasks that produce no net code, and a stub implementation left in the router that must be manually removed at checkpoint. The cost is not a conflict — it is invisible waste and post-rebase cleanup.

## Source
session-start-hook epic (2026-04-11): hook-implementation and cli-integration were planned as parallel wave-1 features. hook-implementation absorbed cli-integration entirely. cli-integration produced zero net code since hook-implementation had already implemented everything. Dead inline stub (runSessionStart in hooks.ts) required manual cleanup at checkpoint.
