# LMAP Cursor Plugin

Private Cursor plugin for LMAP code reviews. It bundles coding standards (rules), review examples, and the `lmap-code-review` agent skill so reviews are consistent across Symfony/PHP projects.

Repository: [lesmillsasiapacific/lmap-cursor-plugin](https://github.com/lesmillsasiapacific/lmap-cursor-plugin) (private — GitHub access required).

## What’s included

| Component | Location | Purpose |
|-----------|----------|---------|
| **Skill** | `cursor-plugin/skills/lmap-code-review/` | Drives in-chat code review workflow and output format |
| **Rules** | `cursor-plugin/rules/` | LMAP coding standards (PHP, Symfony, Twig, CSS, JS, PostgreSQL, etc.) |
| **Examples** | `cursor-plugin/examples/` | Paired don't-do / prefer samples referenced in findings |

The installable plugin root is the `cursor-plugin/` directory (it contains `.cursor-plugin/plugin.json`).

## Install locally

Use this to test the plugin on your machine before (or instead of) a team marketplace install.

### Prerequisites

- [Cursor](https://cursor.com) (3.5+ recommended for symlink support)
- Git access to the private repo
- A project workspace open in Cursor (the skill reviews code in the active repo)

### Steps

1. **Clone the repository**

   ```bash
   git clone git@github.com:lesmillsasiapacific/lmap-cursor-plugin.git
   cd lmap-cursor-plugin
   ```

2. **Copy the plugin into Cursor’s local plugins directory**

   ```bash
   mkdir -p ~/.cursor/plugins/local
   cp -r cursor-plugin ~/.cursor/plugins/local/lmap-code-review
   ```

   For faster iteration while developing the plugin, you can symlink instead (Cursor 3.5+):

   ```bash
   ln -s "$(pwd)/cursor-plugin" ~/.cursor/plugins/local/lmap-code-review
   ```

   On Windows, prefer a full copy if symlinks are not recognized.

3. **Reload Cursor**

   Run **Developer: Reload Window** from the command palette, or restart Cursor.

4. **Verify installation**

   Open **Customize** in the sidebar and confirm:

   - Rules from `lmap-cursor-plugin` appear (e.g. coding standards, review checklist)
   - Skill `lmap-code-review` is listed under Agent Decides / skills

   Plugin rules are **agent-requestable** — they load when the agent runs a review, not on every chat message.

### Updating

After pulling new changes from GitHub:

```bash
cd lmap-cursor-plugin
git pull
cp -r cursor-plugin ~/.cursor/plugins/local/lmap-code-review
```

Then reload the window. If you used a symlink, `git pull` in the clone is enough before reloading.

## Run `lmap-code-review`

Open the **project you want reviewed** in Cursor (not necessarily this plugin repo). Start a new Agent chat and invoke the skill explicitly.

The skill has `disable-model-invocation: true`, so it does **not** auto-run — you must ask for a review.

### How to invoke

- Type `/lmap-code-review` in chat, or
- Ask in natural language, for example:
  - “Review my uncommitted changes”
  - “Review this branch against `main`”
  - “Review PR #42”
  - “Review all files in `src/Controller/`”

### What gets reviewed

Tell the agent what scope you want:

| Scope | Example prompt |
|-------|----------------|
| Uncommitted changes | “Review my staged and unstaged changes” |
| Branch vs base | “Review `feature/foo` against `main`” |
| Pull request | “Review PR #123” (uses `gh pr diff` when available) |
| Directory / tree | “Review everything under `backend/src/`” |

The agent gathers the diff (or enumerates files for directory reviews), scopes standards to changed file types, runs the review detection checklist, and reports findings. It does **not** apply fixes unless you ask.

### Related skills

For broader automated scans via subagents, use Cursor’s built-in `review-bugbot` or `review-security` skills. `lmap-code-review` is the standards-based in-chat review.

## Expected output

Every review starts with a one-line verdict:

- **Approve**
- **Approve with nits**
- **Request changes**

Then a summary line:

```text
**N findings** — 🔴 X critical · 🟡 Y suggestions · 🟢 Z nice-to-have
```

Findings are grouped by severity (critical first), each numbered across all sections:

### 🔴 Critical — must fix before merge

#### 1. Missing authorization on delete
- **Location:** `src/Controller/OrderController.php:55`
- **Standard:** _(omitted for pure logic bugs with no standards tie-in)_
- **Issue:** What is wrong, in plain language.
- **Impact:** Runtime, security, or data consequence.
- **Fix:** Concrete remediation tied to the code.

### 🟡 Suggestion — should consider

#### 2. Validation bypassed on create
- **Location:** `src/Controller/OrderController.php:22`
- **Standard:** `symfony-validation`
- **Issue:** …
- **Impact:** …
- **Example:** (`examples/symfony/controllers.php` — short rule title)
  - **Why:** One sentence from the matching rule.
  - **Don't do:** (code snippet from examples)
  - **Prefer:** (code snippet from examples)
- **Fix:** …

### 🟢 Nice to have — optional

Lower-priority style, naming, or minor maintainability items use the same structure. **Example** blocks are required when a **Standard** label is set.

### Positive patterns (when applicable)

```markdown
### ✅ Positive patterns
- Clear separation of concerns in `OrderService`
- Proper CSRF protection on the delete form
```

### Closing sections

For non-trivial reviews, the agent also includes:

- **Files reviewed** — list of paths covered (helpful on large diffs)
- **Checklist traceability** — every Standard label from the skill table, with either `N finding(s)` or `searched, no match` / `manual pass, no match`

If nothing is wrong, you get a short approval and any residual risk (e.g. untested edge cases).

## Team distribution (optional)

For organization-wide installs, LMAP can publish this repo as a **team marketplace** in the Cursor Dashboard (Teams / Enterprise). Developers then install from **Customize** without copying to `~/.cursor/plugins/local/`. Contact your Cursor admin for marketplace access.

## Development

Plugin manifest: `cursor-plugin/.cursor-plugin/plugin.json`  
Skill source of truth: `cursor-plugin/skills/lmap-code-review/SKILL.md`  
Standards index: `cursor-plugin/rules/coding-standards.mdc`
