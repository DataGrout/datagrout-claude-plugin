---
description: Find a tool in DataGrout for a goal and run it
argument-hint: "[goal]"
---

Follow the `datagrout-mcp` skill. The goal is: $ARGUMENTS

If no goal was given: call `discovery_summary`, list the connected integrations
in one line each, and ask what the user wants to do.

If a goal was given:

1. `discovery_discover` with the goal as a short phrase (under 10 words).
2. If the goal needs several tools, `discovery_plan` with `lean: true`, and show
   the plan first.
3. If any tool has `side_effects` of `write` or `destructive`, say what will change
   and wait for a yes.
4. `discovery_perform` with the exact `tool_name` and `args`, after getting any
   account-level id the tool needs.
5. Report the integration, the record identifiers touched, and credits charged.
   Offer related lookups instead of running them.
