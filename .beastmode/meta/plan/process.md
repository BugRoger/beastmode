# Plan Process

## Design-to-Plan Mapping (9 observations, HIGH)
- ALWAYS produce detailed design documents with component breakdowns — enables direct 1:1 mapping to plan tasks
- ALWAYS accept research artifacts as design doc substitutes when they contain comprehensive analysis and concrete recommendations — substance matters more than document type
- ALWAYS use design locked decisions as cross-cutting constraints applied uniformly across all plan tasks — they function as the standardization layer
- ALWAYS derive wave ordering from the component dependency graph — foundation before consumers before integration

## Wave-Based Parallelism
- ALWAYS group independent tasks into waves for parallel execution — throughput
- ALWAYS order waves by dependency: foundation (Wave 1) -> consumers (Wave 2) -> integration (Wave 3)
- NEVER put tasks with shared file targets in the same wave — conflict avoidance

## Verification as Plan Task
- ALWAYS include a final verification task that checks the full output tree — catches drift between plan and execution
- ALWAYS specify verification as a separate task, not a step within other tasks — clean separation

## Manifest-Based Feature Decomposition (4 observations, HIGH)
- ALWAYS decompose multi-feature epics into a manifest JSON plus N independent feature plans — each feature plan is self-contained with user stories, what-to-build, and acceptance criteria
- ALWAYS use the manifest as the coordination artifact linking features, tracking status, and recording GitHub issue numbers
