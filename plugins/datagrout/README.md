# DataGrout for Claude

DataGrout MCP puts every integration you connect in DataGrout (CRM, ticketing, docs,
chat, data and other SaaS tools) behind one OAuth-secured endpoint. This plugin
connects Claude to DataGrout MCP and teaches it to discover the right tool, plan
multi-step work, and confirm before it changes anything. It works in Claude chat,
Cowork and Claude Code.

The plugin adds:

| Component | Name | Purpose |
| --- | --- | --- |
| MCP connector | `datagrout` | `https://gateway.datagrout.ai/connect` over Streamable HTTP |
| Skill | `datagrout-mcp` | The discover → plan → perform workflow, and when to reach for DataGrout |
| Command | `datagrout` | Find a tool for a goal and run it |

## Install

- **claude.ai and Cowork:** open **Customize → Plugins**, find **DataGrout** in the
  directory and select **Add**. On Team and Enterprise plans, an Owner can make it
  available to the organization.
- **Claude Code:** a plugin added on your claude.ai account appears in Claude Code at
  the next session start. To install from this repository instead, run
  `/plugin marketplace add DataGrout/datagrout-claude-plugin`, then
  `/plugin install datagrout@datagrout-plugins`.

## Connect

You need a DataGrout account with at least one integration connected. Sign up at
[datagrout.ai](https://datagrout.ai).

- **claude.ai and Cowork:** open the DataGrout plugin's **Connectors** tab and select
  **Connect**. On Team and Enterprise plans, an Owner adds the connector for the
  organization first, and each member then connects with their own account.
- **Claude Code:** run `/mcp`, select `datagrout` and choose to authenticate.

Your browser opens the DataGrout sign-in and consent page (OAuth 2.1 with automatic
client registration and PKCE). Approve it, and the DataGrout tools become available.
No API key or server ID is needed; DataGrout identifies your account from the OAuth
token.

The plugin's MCP configuration:

```json
{
  "mcpServers": {
    "datagrout": {
      "type": "http",
      "url": "https://gateway.datagrout.ai/connect"
    }
  }
}
```

## Use it

Ask for something that lives in a connected system, for example "what's the latest
message in our #support Slack channel?" or "list my open Jira issues". Claude finds
the matching DataGrout tool and runs it. In Claude Code you can also type
`/datagrout:datagrout list my open Jira issues`; with no goal, the command lists
what you have connected.

DataGrout MCP exposes five tools. Every other integration tool is reached through
them, so the list stays the same no matter how many integrations you connect.

| Tool | What it does | Returns |
| --- | --- | --- |
| `discovery_discover` | Semantic search for tools that fit a goal | Ranked tool names with input schemas and side-effect flags |
| `discovery_perform` | Runs a tool (or a planned `skill_handle`); `head: true` previews large lists, `refract` summarises | The tool's result plus execution ID and credits used |
| `discovery_plan` | Plans a goal that needs several tools | Ranked plans, required inputs, and a `skill_handle` to run the plan |
| `discovery_summary` | Overview of what is connected | Integrations with tool counts; `focus` drills into one |
| `discovery_guide` | Step-by-step decision tree when the goal is unclear | Options to choose from at each step |

## Data access and privacy

- The plugin contains only configuration and Markdown. No code runs on your machine,
  and the plugin makes no network requests of its own.
- Claude talks to one service, DataGrout, at `https://gateway.datagrout.ai/connect`.
  It sends the goals and arguments it puts in each tool call and receives the
  results. Nothing else from your conversation, files or codebase is sent unless
  Claude includes it in a tool argument.
- DataGrout can reach only the integrations you connected, with the permissions you
  granted each one. Disconnect an integration in DataGrout and it is gone from
  Claude too.
- Read and write tools are both available. The skill tells Claude to ask you before
  any tool that creates, updates, sends or deletes, and Claude asks you to approve
  tool calls according to your permission settings.
- Tool calls use DataGrout credits from your account; each result reports the
  credits charged.
- [Privacy policy](https://datagrout.ai/legal#privacy) and
  [terms of use](https://datagrout.ai/legal#terms).

## Troubleshooting

- **Claude says it has no DataGrout tools:** the connector isn't connected yet.
  Follow [Connect](#connect).
- **"Authentication required" or tools stop working:** connect again from the
  **Connectors** tab, or from `/mcp` in Claude Code.
- **Connected but no tools:** check that your DataGrout account has at least one
  integration connected.
- **Two sets of DataGrout tools:** you also added DataGrout as a custom connector
  with a different URL. Remove one of them.
- **Revoke access:** disconnect DataGrout from the **Connectors** tab (or `/mcp` in
  Claude Code), then revoke Claude's authorization in your DataGrout account at
  [app.datagrout.ai](https://app.datagrout.ai).

## Support

Email [support@datagrout.ai](mailto:support@datagrout.ai). Documentation:
[library.datagrout.ai](https://library.datagrout.ai/).

## License

MIT. See [LICENSE](https://github.com/DataGrout/datagrout-claude-plugin/blob/main/LICENSE).
