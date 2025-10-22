---
name: twin-workflow-eco
description: Economical twin workflow - fast and token-efficient for JavaScript/TypeScript development
trigger: /twin-workflow-eco
parameters:
  - name: task
    type: string
    required: false
    description: Feature to build or bug to fix (not needed when continuing)
  - name: quality
    type: string
    required: false
    description: Quality level (pragmatic, balanced, strict) - default is pragmatic
---

# Twin Workflow Econômico - Modo Rápido

Workflow otimizado para economia de tokens mantendo qualidade essencial.

## Task: $ARGUMENTS
## Quality Level: ${quality:-pragmatic}

## 🔄 Workflow Execution Logic

First, check if `./twin-plan-current.md` exists to determine workflow phase:

```bash
Check for ./twin-plan-current.md
```

### 📋 PHASE 1: If Plan File NOT EXISTS (Create Plan)

Execute planning phase:

```
Quality Level: ${quality:-pragmatic}

IMPORTANT: Keep analysis ultra-concise and laser-focused ONLY on what was requested.

1. Use twin-architect to analyze AND plan in ONE STEP:
   - Quick codebase scan for relevant files
   - Identify what exists vs what needs to change
   - Create direct implementation plan with file list
   - NO verbose analysis, NO project management language
   - Just: current state → changes needed → files to modify

2. Save the plan to ./twin-plan-current.md with this format:

---
# Twin Development Plan (Econômico)
Generated: [timestamp]
Task: $ARGUMENTS
Quality Level: ${quality:-pragmatic}

## Análise Rápida
[2-3 sentences: what exists, what needs to change]

## Plano de Implementação

### Arquivos a Modificar:
- path/to/file.ts - [specific change]
- path/to/other.ts - [specific change]

### Passos:
1. [First step]
2. [Second step]
...

### ⚠️ Riscos:
[Only if critical risks exist]

## Próximo Passo
Digite: ok, continue, ou approve
---

3. Display the plan to user

4. STOP execution and show this message:
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚡ **PLAN CREATED (ECONOMICAL MODE)**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Plan saved to: `./twin-plan-current.md`

Options:
- 📝 **Edit file** to modify plan
- ✅ **Type 'ok'** to proceed
- ❌ **Type 'cancel'** to abort

**Your action?**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### 💻 PHASE 2: If Plan File EXISTS (Execute Plan)

When user types 'ok', 'continue', or runs the command again:

```
1. Read the plan from ./twin-plan-current.md
   - Extract task and quality level
   - Extract implementation steps

2. Show starting message:
   "⚡ Starting economical implementation..."

3. Use twin-coder to implement with inline review:
   - Implement following the plan
   - Apply ${quality:-pragmatic} quality standards:
     * pragmatic: Direct implementation, basic error handling
     * balanced: Thoughtful abstractions, good error handling
     * strict: Full patterns, comprehensive edge cases
   - Self-review code inline during implementation:
     * Check for obvious bugs
     * Verify functional programming principles
     * Ensure no security vulnerabilities
     * Validate error handling
   - Output: Code + inline review notes

4. Quick validation checklist:
   - Files modified match plan
   - Code compiles/builds successfully
   - No obvious runtime errors
   - Basic functionality works

5. Archive and cleanup:
   - Create directory ./twin-plans/ if not exists
   - Move plan to ./twin-plans/[YYYY-MM-DD-HH-MM]-eco-plan.md
   - Delete ./twin-plan-current.md

6. Show completion message:
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ **IMPLEMENTATION COMPLETE (ECO MODE)**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📁 Plan archived to: `./twin-plans/[timestamp]-eco-plan.md`

### Summary:
[Brief overview of what was implemented]

### Quality Check:
✅ Code reviewed inline during implementation
✅ Functional programming principles applied
✅ Basic error handling included

### ⚠️ Recommended Next Steps:
- Test manually: [quick testing suggestion]
- Review changes: `git diff`
- Commit when satisfied

💡 **Note**: This is economical mode - manual testing recommended before deployment.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## 📊 Quality Level Guidelines

### 🎯 **pragmatic** (Default)
- Direct, working solutions
- Minimal abstractions
- Basic error handling
- Focus on functionality

### ⚖️ **balanced**
- Thoughtful abstractions
- Comprehensive error handling
- Moderate patterns usage
- Performance considerations

### 🏆 **strict**
- Full design patterns
- All edge cases handled
- Maximum reusability
- Performance optimized

## 🎮 Usage Examples

### Standard Workflow:
```bash
# Start the workflow
/twin-workflow-eco "implement user authentication"

# [Claude creates plan and saves to file]
# [You review/edit ./twin-plan-current.md if needed]

# Continue in same chat
ok

# [Claude implements with inline review]
```

### With Quality Level:
```bash
/twin-workflow-eco "refactor payment module" --quality=balanced

# Review and continue
continue
```

## 💰 Token Savings

Compared to full workflow:
- **~60% token reduction** by removing twin-tester QA loop
- **~20% reduction** by merging analyst + planner
- **~15% reduction** by inline review vs separate agent

**Total savings: ~70-75% tokens** while maintaining core quality standards.

## ⚡ When to Use

**Use Economical Mode:**
- Small features and bug fixes
- Internal tools and prototypes
- Iterations and refinements
- When you'll test manually anyway

**Use Full Workflow (`/twin-workflow`):**
- Production features
- Complex integrations
- Critical bug fixes
- When comprehensive QA needed

## 📝 Notes

- Plans saved with `-eco-plan.md` suffix for tracking
- Manual testing strongly recommended before deployment
- Developer does inline self-review during coding
- Focus on speed and essential quality checks
- No formal QA loop or session documentation

## 🔑 Key Differences from Full Workflow

| Feature | Full Workflow | Economical |
|---------|---------------|------------|
| Planning | twin-analyst + twin-planner | twin-architect (merged) |
| Development | twin-developer | twin-coder (with inline review) |
| Code Review | twin-reviewer (separate) | Inline during coding |
| QA Testing | twin-tester (manual browser/API) | Manual testing suggestion |
| Documentation | twin-documenter | Summary only |
| Token Usage | 100% | ~25-30% |
| Quality Assurance | Automated QA loop | Developer self-check |

---

**Starting economical workflow...**
