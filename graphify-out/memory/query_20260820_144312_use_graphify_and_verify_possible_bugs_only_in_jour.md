---
type: "query"
date: "2026-08-20T14:43:12.515784+00:00"
question: "use graphify and verify possible bugs only in journey mode"
contributor: "graphify"
outcome: "useful"
source_nodes: ["executePersistedJourney", "JourneyDetailPage", "matchJourneyPath"]
---

# Q: use graphify and verify possible bugs only in journey mode

## Answer

Expanded from graph vocabulary: [journey, journeys, scenario, workflow, state, transition, transitions, stateful]. Verified findings: Journey execution reads and later overwrites the one runtime row without row locking, so concurrent successful requests can compute from the same snapshot and lose one state/field update. The dashboard always creates Actions with bodyType json even after treating non-JSON response text as valid, so plain-text responses are serialized as JSON strings. matchJourneyPath directly calls decodeURIComponent for captured route parameters and throws URIError on malformed percent-encoding. Focused Journey unit tests pass but do not cover these cases.

## Outcome

- Signal: useful

## Source Nodes

- executePersistedJourney
- JourneyDetailPage
- matchJourneyPath