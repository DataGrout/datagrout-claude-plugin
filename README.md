# DataGrout plugins for Claude

The packaging for [DataGrout](https://datagrout.ai) in
[Anthropic's plugin directory](https://claude.com/docs/directory/publish). It contains
one Claude plugin, `datagrout`, which connects Claude (chat, Cowork and Claude Code)
to DataGrout MCP at `https://gateway.datagrout.ai/connect` over OAuth 2.1 with
automatic Dynamic Client Registration (DCR), so users set up no client ID, API key or
server ID.

This repository is packaging only: JSON manifests, Markdown, and a logo. DataGrout MCP
and its tools run on DataGrout's servers; nothing here executes. Changes to tools or
auth happen in DataGrout, and this repo changes only when the endpoint, metadata,
skill text or logo changes.

User documentation lives in [`plugins/datagrout/README.md`](plugins/datagrout/README.md),
which the directory shows as the listing's description.

## Layout

```text
.claude-plugin/marketplace.json        marketplace "datagrout-plugins", lists plugins/datagrout
plugins/datagrout/                     the plugin folder submitted to the directory
  .claude-plugin/plugin.json           plugin manifest and directory listing fields
  .mcp.json                            remote MCP server entry (type http + url)
  skills/datagrout-mcp/SKILL.md        when to use DataGrout; discover → plan → perform
  commands/datagrout.md                /datagrout:datagrout command
  assets/logo.png                      listing icon (256×256, same as the Cursor and Zapier listings)
  README.md                            listing description: install, connect, tools, privacy, support
  CHANGELOG.md                         release notes per version
  LICENSE                              MIT
scripts/
  check-plugin.mjs                     directory checks that `claude plugin validate` does not run
```

The plugin manifest names no component paths, so Claude discovers `skills/`,
`commands/` and `.mcp.json` by folder. Keep it that way, and keep everything the
plugin needs inside `plugins/datagrout`: people who install it get only that folder.

## Develop

Requires Node 18+ and [Claude Code](https://code.claude.com/docs/en/setup) 2.1.281 or
later.

```bash
npm run validate   # claude plugin validate --strict (plugin + marketplace) + DataGrout checks; CI runs the same
npm run dev        # start Claude Code with the plugin loaded from this working copy
npm run zip        # build datagrout.zip for Customize → Plugins → Add → Upload plugin on claude.ai
```

In the `npm run dev` session, check:

1. `/mcp` lists `datagrout`; select it and authenticate.
2. Typing `/datagrout` offers `/datagrout:datagrout` and `/datagrout:datagrout-mcp`.
3. "What's connected in DataGrout?" calls `discovery_summary`.

To test with a team, add this repository as a marketplace:
`/plugin marketplace add DataGrout/datagrout-claude-plugin`, then
`/plugin install datagrout@datagrout-plugins`.

## Release

1. Bump `version` in both `plugins/datagrout/.claude-plugin/plugin.json` and
   `.claude-plugin/marketplace.json` (`npm run validate` fails if they differ), and add
   a `CHANGELOG.md` entry.
2. `npm run validate`, merge to `main`, then tag the commit (`v1.0.1`, …).
3. The directory picks up new commits on the tracked branch, scans them and publishes
   them according to the listing's publish setting. Check the plugin's **Versions**
   tab at [claude.ai/directory/manage](https://claude.ai/directory/manage).

Never rename the plugin `name`, the server key `datagrout`, or DataGrout's tool names:
installs, tool permissions and allowlists depend on them.

## Security

Report security or stability issues to [support@datagrout.ai](mailto:support@datagrout.ai).

## License

[MIT](LICENSE)
