# Dependency Graph

```text
P01 fixture contract
 ├─ P02 auth ─────┬─ P05 create ─┐
 ├─ P03 store ───┼─ P06 reads ──┼─ P10 HTTP/UI ─ P11 QA ─ P12 release
 └─ P04 time ────┘              │
                 P07 decisions ─┤
                 P08 delivery ──┼─ P09 approval routing ┘
```

Merge order follows the graph. Conflicts at a join are owned by the integrator, not solved opportunistically in parallel branches. A failed contract test blocks its downstream lane.
