---
name: datagrout-mcp
description: Find and run tools in the user's connected business systems (CRM, ticketing, chat, docs, email, calendar, finance, support, ERP and any other integration they connected in DataGrout) through the DataGrout MCP server. Use when the user asks for data or an action in a system outside the conversation, such as a ticket, CRM record, customer, deal, order, invoice, chat channel, doc, dashboard, email or calendar event, and before saying you lack access to it.
---

# DataGrout MCP

DataGrout is one MCP server that fronts every integration the user connected. Its
five tools are `discovery_discover`, `discovery_perform`, `discovery_plan`,
`discovery_summary` and `discovery_guide`. Integration tools are not listed
directly: find them with `discovery_discover`, run them with `discovery_perform`.
Never guess a tool name and never ask for API keys; DataGrout is already
authenticated.

## When to use

- Reach for DataGrout before saying you lack access to an external system. Which
  integrations exist is not fixed; `discovery_summary` shows what this user has
  connected.
- Do not write local scripts, `curl` calls or SDK code to reach those systems when
  the request is to look something up or act on it now.
- If the integration is not connected, say so and point the user to DataGrout to
  connect it; do not guess the data.
- If the DataGrout tools are not available in this conversation, the connector is
  not connected yet: tell the user how to connect it (see "When a call fails") and
  stop.

## Workflow

1. **Discover**: `discovery_discover` with the goal as a short phrase, under 10
   words, such as `"get issue by key"` or `"post channel message"`. Take the top
   result whose signature fits and read its parameters from the signature.
2. **Account-level ids**: if the tool needs an id you do not have (cloud, site,
   workspace or org id), run the integration's tool that lists them once and reuse
   the id for the rest of the conversation.
3. **Plan** only when the goal needs several tools in sequence: `discovery_plan`
   with `lean: true`, show the plan, then run it with `discovery_perform` and the
   returned `skill_handle`. If `needed` lists inputs, get them from the user or an
   earlier result.
4. **Perform**: `discovery_perform` with the exact `tool_name`
   (`integration@1/tool@1`) and `args`.
5. **Detached runs**: a long call returns `status: "detached"` with a `task_ref`;
   collect it with `discovery_perform`, `tool_name: "data-grout@1/tasks.wait@1"`,
   `args: {"task_ref": "<ref>"}`.

Reuse tool names and ids found earlier in the conversation instead of discovering
them again.

## Shaping results

- Fetch a single record once, raw, and pick the fields yourself. Never fetch the
  same record twice.
- For long lists pass `head: true` (shape, preview and a `cache_ref`), or
  `refract: "<fields you need>"` to get only a summary back.
- Independent calls can go in one `discovery_perform` request as a list of
  `{tool_name, args}`.
- `schedule: "every weekday at 9am"` creates a scheduled run instead of running
  now; say so to the user.

## When a call fails

- "Structured content does not match the tool's output schema": the tool returned
  a list and the MCP client rejected it. Repeat the same call once with `refract`
  naming the fields you need; do not switch to `discovery_plan`.
- An argument error: fix the arguments from the message and retry once, then ask.
- `loop_detected: true`: do not repeat the call; use the previous result.
- An authorization error: tell the user to reconnect DataGrout. In Claude Code, run
  `/mcp`, select `datagrout` and authenticate. On claude.ai or in Cowork, open the
  DataGrout plugin's **Connectors** tab and select **Connect**. Do not retry in a
  loop.
- "Insufficient credits": tell the user to top up in DataGrout and stop.

## Rules

- Answer what was asked. Offer related lookups (sub-tasks, comments, history,
  linked records) instead of running them.
- Ask before any tool whose `side_effects` is `write` or `destructive`, and say
  what will change. Reads need no confirmation.
- Prefer a read-only tool when a read and a write could both satisfy the request.
- Report the integration and the record identifiers or URL so the user can check
  the source system.
- Use `discovery_summary` only when the user asks what is connected, or when
  discover finds nothing relevant.
- Leave `demux` and `coverage_gaps` unset unless the user asks for them.
- Do not reach these systems with environment-variable tokens.
