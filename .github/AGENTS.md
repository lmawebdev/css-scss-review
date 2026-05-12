# Available Agents

This document describes the custom agents configured for this CSS/SCSS Unused Detector extension project.

## Senior Frontend Expert

**File**: `.github/agents/senior-frontend-expert.agent.md`

**Purpose**: Expert-level frontend guidance from a 20-year veteran engineer.

**When to use**:
- Code reviews of JavaScript/TypeScript files
- Architecture and design decisions
- Framework selection and comparison
- Performance optimization advice
- Debugging complex frontend issues
- Learning frontend concepts and best practices
- Migration strategies and dependency management

**Expertise areas**:
- JavaScript & TypeScript (advanced patterns, generics, utility types)
- All major frameworks: React, Vue, Angular, Svelte, Next.js, Nuxt, Astro
- Web standards, accessibility (a11y), security
- Performance optimization and profiling
- Testing strategies (unit, integration, E2E)
- Component architecture and state management
- Bundling, tree-shaking, and dependency management

**Key trait**: Always asks clarifying or confirmatory questions before concluding—never provides one-way solutions without validation.

**Invoke with**: Open Copilot Chat, click the agent selector (top-left), or type a message and select this agent from the picker.

---

## How to Use Multiple Agents

1. **Open Copilot Chat**: `Ctrl+Shift+Alt+Enter` (or via VS Code sidebar)
2. **Switch agents**: Click the agent name/icon at the top-left of the chat
3. **Select agent**: Choose "Senior Frontend Expert" from the list
4. **Ask your question**: Describe your frontend task or code review need

## Creating Additional Agents

To add more custom agents:

1. Create a new file: `.github/agents/my-agent-name.agent.md`
2. Follow the YAML frontmatter structure from `senior-frontend-expert.agent.md`
3. Add description, tools, and persona in the body
4. Update this AGENTS.md file with the new agent's info
5. Agents are automatically discovered and available

---

## Reference

- Template: See `.github/agents/senior-frontend-expert.agent.md`
- Docs: `c:\Users\Alex\.vscode\extensions\github.copilot-chat-0.42.3\assets\prompts\skills\agent-customization\references\agents.md`
- Agent skill guide: Agent customization skill documentation

