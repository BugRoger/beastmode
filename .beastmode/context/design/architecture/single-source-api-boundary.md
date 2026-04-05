# Single-Source API Boundary: Filter at Consumer, Not at Source

**Context:** logging-cleanup (2026-04-05). The previous Logger implementations each independently reimplemented verbosity gating. The new architecture moves gating to the sink layer — Logger passes all entries to the injected sink, each sink filters according to its own policy (StdioSink: info/debug toggle; DashboardSink: independent info/debug cycle; TreeSink: pass-through).

**Decision:** When a data source has multiple consumers with divergent filtering needs, verbosity/filtering logic belongs at the consumer boundary (sink, subscriber, adapter), not at the producer. The producer's API is pass-all; consumers own their display policy.

**Rationale:** Gating at the source forces the source to know about downstream filtering requirements and propagates a change across all call sites when any consumer's policy changes. Gating at the consumer is a single-module change when policy changes. It also enables consumers to independently have different thresholds.

**Source:** .beastmode/artifacts/design/2026-04-05-logging-cleanup.md
