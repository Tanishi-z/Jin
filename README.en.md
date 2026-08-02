# Jin

[日本語](README.md) | [English](README.en.md)

**A fully local CLI for learning and experimenting with agentic development concepts found in tools such as Claude Code**

[Website](https://tanishi-z.github.io/Jin/en.html) · [Installation](#installation) · [Relationship to Claude Code](#relationship-to-claude-code)

```text
     ██╗██╗███╗   ██╗
     ██║██║████╗  ██║
     ██║██║██╔██╗ ██║
██   ██║██║██║╚██╗██║
╚█████╔╝██║██║ ╚████║
 ╚════╝ ╚═╝╚═╝  ╚═══╝

Your next move, backed by a formation
```

---

## Overview

Jin is an interactive, spec-driven development CLI that turns rough natural-language requests into specifications, experience designs, and implementation plans through a team of specialized agents modeled after shogi pieces.

It independently reconstructs selected concepts found in Claude Code as of July 2026—including agents, skills, hooks, project context, planning, and review loops—for learning and experimentation in a fully local environment.

> [!IMPORTANT]
> Jin is not a fully compatible implementation or replacement for Claude Code, and it is not an official Anthropic or Claude Code project. See [Relationship to Claude Code](#relationship-to-claude-code) for the supported scope.

**Local LLMs only** — Jin runs with open-source models through Ollama. No API key is required, and requests are not sent to a cloud LLM service.

## Features

- **Shogi-inspired formations** — Kin, Gin, Hisha, Kaku, Keima, Kyosha, and Fu each cover a specialized domain.
- **Dynamic orchestration by Kin** — Kin selects a formation based on the request.
- **Review loops** — Kin reviews each piece's output and can request revisions or summon additional pieces.
- **Promoted pieces for implementation** — Pieces move from analysis into implementation and generate code or documentation.
- **Custom agents (`.agent.md`)** — Customize behavior and model assignments per project.
- **Skills (`.skill.md`)** — Invoke reusable prompt templates with `/trigger`.
- **Hooks (`hooks.json`)** — Automate shell commands around analysis, implementation, and apply events.
- **Per-role model assignment** — Use different Ollama models for different pieces.
- **Japanese and Global modes** — Choose the interface and interaction language on first launch.

## Relationship to Claude Code

Jin does not reproduce Claude Code's interface or full feature set. It independently implements selected ideas for educational use.

| Concept | Jin implementation |
|---|---|
| Specialized agents | Shogi-inspired roles and dynamically selected formations |
| Skills | `.skill.md` prompt templates invoked through `/trigger` |
| Hooks | Shell commands tied to lifecycle events |
| Project context | Accumulated information in `.jin/context.md` |
| Planning and review | Specification, role-based analysis, and Kin review loops |
| Implementation | Generated changes are reviewed before being applied |

Jin does not provide equivalent support for MCP integrations, web search, general terminal operations, Git/GitHub operations, session resume, non-interactive mode, or detailed permission controls. Refer to the official Claude Code documentation for its current capabilities.

## Pieces and roles

| Piece | Analysis phase | Implementation phase |
|---|---|---|
| **Kin** | Requirements, formation selection, synthesis | — |
| **Gin** | UI/UX and user experience | Promoted Gin: frontend implementation |
| **Hisha** | Engineering and architecture | Ryuo: backend implementation |
| **Kaku** | Quality, risk, and test design | Ryuma: test implementation |
| **Keima** | Data models, APIs, and metrics | Promoted Keima: schemas and migrations |
| **Kyosha** | Security, authorization, and permissions | Promoted Kyosha: authentication middleware |
| **Fu** | Documentation and task organization | Tokin: documentation generation |

## Installation

```bash
npm install -g @tanishi-zukka/jin
```

You can also run it without installing it using `npx @tanishi-zukka/jin`.

Requirements:

- Node.js 24.0.0 or later
- [Ollama](https://ollama.com)

## Quick start

Install Ollama:

```bash
# macOS
brew install ollama

# Linux
curl -fsSL https://ollama.com/install.sh | sh
```

Launch Jin:

```bash
jin
```

On first launch, choose **Japanese** or **Global mode**. Jin then opens the local Ollama setup, filters models based on available RAM, lets you download multiple candidates, and recommends assignments for each role. Configuration is saved in `~/.jin/config.json`.

To try the interface without configuring Ollama:

```bash
jin --demo
```

## Workflow

```text
Launch
 └─ Select language (Japanese / Global)
      └─ Configure local LLMs (first launch only)
           └─ Home
                ├─ Start a new project
                ├─ Add a feature
                ├─ Improve an existing feature
                ├─ Implement a task
                ├─ Manage agents
                └─ Change Jin settings
```

## Dashboard

Running `jin` starts a browser dashboard at [http://localhost:3050](http://localhost:3050). It visualizes what each piece received, how it acted, and where it sent its output.

| View | Description |
|---|---|
| Formation board | Shogi-board graph with active pieces, animated communication paths, and session replay |
| Conversation view | Dialogue between Kin and the other pieces, including approvals and revision requests |
| Detail toggle | Full prompts, selected model, response, and elapsed time |

Complete session logs are stored under `.jin/logs/<session-id>.json`. Because the dashboard can display requests and LLM prompts, it binds only to `127.0.0.1`. Review logs for sensitive information before sharing or committing them.

Change the dashboard port with:

```bash
JIN_DASHBOARD_PORT=3199 jin
```

## Local model configuration

Jin combines detected hardware information with Ollama model metadata and recommends the largest suitable models by strength: coding, reasoning, lightweight/fast, balanced, and large/high-quality. When offline, it falls back to a bundled recommendation list.

Use the settings menu to assign models per piece. Coding-focused models are useful for Hisha, while reasoning or quality-focused models can improve Kaku's reviews.

## Custom agents (`.agent.md`)

Generate samples for all seven pieces:

```bash
jin agent init
```

Example:

```markdown
---
id: security-reviewer
name: Security Reviewer
phase: analysis
roleId: kaku
model: qwen3:8b
temperature: 0.2
enabled: true
---

You are a security reviewer. Analyze threats using the OWASP Top 10
and always check authentication, authorization, input validation, and logging.
```

Project agents in `.jin/agents/` take precedence over global agents in `~/.jin/agents/`. Enable an agent from **Manage agents** in the Jin menu.

## Skills (`.skill.md`)

Skills are reusable prompt templates invoked with `/trigger`. Generate samples with:

```bash
jin skill init
```

Example:

```markdown
---
trigger: security-audit
name: Security Audit
description: Analyze risks using the OWASP Top 10
enabled: true
---

Perform a security audit of the following feature:

{{input}}
```

Invoke a skill from the request screen:

```text
> /security-audit the complete authentication flow
> /api-design user management REST API
> /refactor src/screens/inReview.ts
```

Bundled templates include `/security-audit`, `/api-design`, `/refactor`, `/onboarding`, and `/test-plan`. Project skills in `.jin/skills/` take precedence over global skills in `~/.jin/skills/`.

## Hooks (`hooks.json`)

Hooks run shell commands around Jin lifecycle events. Generate a template with:

```bash
jin hook init
```

```json
{
  "hooks": {
    "pre-analysis": ["git diff --stat HEAD"],
    "post-apply": ["git add .jin/ && git commit -m 'jin: update spec'"]
  }
}
```

Supported events are `pre-analysis`, `post-analysis`, `pre-impl`, `post-impl`, `pre-apply`, and `post-apply`. Project hooks in `.jin/hooks.json` take precedence over global hooks in `~/.jin/hooks.json`.

## Configuration

Global settings are stored in `~/.jin/config.json`:

```json
{
  "mode": "global",
  "localModel": "qwen2.5:7b",
  "roleModels": {
    "hisha": "qwen2.5-coder:14b",
    "kaku": "qwen3:8b"
  },
  "activeAgents": {
    "kaku": "security-reviewer"
  }
}
```

The `mode` field accepts `"ja"` or `"global"`.

## CLI reference

```bash
jin                    # Launch Jin
jin --demo             # Demo mode
jin agent init         # Generate custom-agent samples
jin skill init         # Generate skill samples
jin hook init          # Generate a hooks.json template
```

## Project files

```text
.jin/
  agents/              # Custom agent definitions
  skills/              # Skill definitions
  hooks.json           # Hook configuration
  specs/               # Generated specifications
  tasks/backlog.md     # Task list
  decisions/           # Decision records
  activity.json        # Dashboard activity data
  context.md           # Automatically updated project context
```

## Development

```bash
npm run dev             # Development mode
npm run build           # Build
npm run dev -- --demo   # Demo mode during development
```

## License

[MIT License](LICENSE)
