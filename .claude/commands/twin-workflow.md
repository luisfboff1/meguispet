---
name: twin-workflow
description: Interactive twin agents workflow with checkpoint for JavaScript/TypeScript development
trigger: /twin-workflow
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

# Twin Development Workflow - Interactive Mode

Complete development workflow using specialized twin agents with approval checkpoint.

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

IMPORTANT: Keep analysis and planning concise, direct, and focused ONLY on what was requested.

IMPORTANT: Execute agents SEQUENTIALLY - DO NOT run in parallel.

1. FIRST: Use twin-analyst to analyze the task: [$ARGUMENTS]
   - Examine current codebase related to the request
   - Understand what exists and what needs to change
   - Identify real technical constraints
   - NO story points, timelines, or success metrics
   - Focus ONLY on the specific request - do not add scope

2. THEN: Use twin-planner to create implementation plan
   - WAIT for twin-analyst results before starting
   - USE the analysis results to inform the plan
   - List files to modify and specific changes needed
   - Determine logical order of implementation
   - Identify genuine technical risks (not theoretical ones)
   - NO sprints, phases, or project management language
   - You're implementing this yourself - no estimates needed
   - Keep it simple and actionable

3. Save the plan to ./twin-plan-current.md with this format:

---
# Twin Development Plan
Generated: [timestamp]
Task: $ARGUMENTS
Quality Level: ${quality:-pragmatic}

## Análise Técnica
[Concise analysis from twin-analyst: current state, what needs to change, constraints]

## Plano de Implementação
[Direct plan from twin-planner: files to modify, changes needed, order of implementation]

### Arquivos a Modificar:
- path/to/file.ts - [specific changes needed]
- path/to/other.ts - [specific changes needed]

### Ordem de Implementação:
1. [First step with brief justification]
2. [Second step]
...

### Riscos Técnicos:
[Only real technical risks with mitigation - if any]

## Próximo Passo
Para implementar este plano, digite: ok, continue, ou approve
Para cancelar, digite: cancel ou inicie uma nova tarefa
---

4. Display the plan to user

5. STOP execution and show this message:
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 **PLAN CREATED AND SAVED**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Plan saved to: `./twin-plan-current.md`

You can:
- 📝 **Edit the file** if you want to modify the plan
- ✅ **Type 'ok' or 'continue'** to proceed with implementation
- ❌ **Type 'cancel'** or start a new task to cancel

**Your next action?**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### 💻 PHASE 2: If Plan File EXISTS (Execute Plan)

When user types 'ok', 'continue', or runs the command again:

```
1. Read the plan from ./twin-plan-current.md
   - Extract task description
   - Extract quality level
   - Extract implementation steps

2. Show starting message:
   "🚀 Found approved plan. Starting implementation..."

3. Start Development-Review-Test Loop:

   Loop until QA validation passes:

   a. Use twin-developer to implement/fix the solution
      - Follow the plan from the file
      - Apply ${quality:-pragmatic} quality standards:
        * pragmatic: Direct implementation, no over-engineering
        * balanced: Abstractions where valuable
        * strict: Full patterns and edge cases
      - If this is a retry: address specific issues from QA bug report

   b. Use twin-reviewer to review the code
      - Review against ${quality:-pragmatic} standards
      - Focus on quality level requirements
      - Avoid over-engineering suggestions for pragmatic
      - Verify fixes address QA validation issues (if retry)

   c. Use twin-tester for QA validation (Manual Testing)

      First, detect project type:
      - Check package.json for "next" dependency = Frontend
      - Check for src/app, src/pages, or src/components = Frontend
      - Check for components.json = Frontend with shadcn/ui
      - Otherwise = Backend/API

      For FRONTEND projects:
      - Use Playwright MCP to launch browser
      - Navigate to localhost:3000 (or appropriate dev URL)
      - Test feature visually and interactively:
        * Click buttons, fill forms, navigate
        * Test happy path scenarios
        * Test edge cases (empty inputs, invalid data)
        * Verify error messages and validation
        * Check responsive design
        * Test accessibility (keyboard navigation)
      - Capture screenshots of any bugs found

      For BACKEND projects:
      - Use curl to test API endpoints
      - Execute Node.js scripts to test functions
      - Validate responses and status codes
      - Test edge cases and error handling
      - Verify authentication/authorization
      - Check data validation rules

      Generate QA Validation Report:

      IF BUGS ENCONTRADOS:
      - Create detailed bug report:
        * Bug description and severity
        * Steps to reproduce (exact steps)
        * Expected vs actual behavior
        * Screenshots/logs/curl outputs
        * Specific files that likely need fixes
        * Recommendations for developer
      - Loop back to step 3a (twin-developer) with bug report
      - Developer fixes bugs based on report
      - Cycle continues (dev → review → qa) until bugs fixed

      IF QA VALIDATION PASSES:
      - Generate QA validation success report:
        * Features tested and validated
        * Scenarios covered (happy path, edge cases, errors)
        * Total scenarios tested
        * Any minor observations
      - Exit loop and proceed to documentation

4. Use twin-documenter to document the session
   - Document all changes made
   - Note any deviations from plan
   - Record decisions and tradeoffs
   - Include test results and iterations if any

5. Archive and cleanup:
   - Create directory ./twin-plans/ if not exists
   - Move plan to ./twin-plans/[YYYY-MM-DD-HH-MM]-plan.md
   - Delete ./twin-plan-current.md

6. Show completion message:
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ **IMPLEMENTATION COMPLETE**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📁 Plan archived to: `./twin-plans/[timestamp]-plan.md`
📝 Documentation created in: `./docs/sessions/`

### Summary:
[Brief overview of what was implemented]

### QA Validation Results:
✅ All features validated and working correctly
[Number of QA iterations if any: "Completed in X iteration(s)"]
[Bug fixes applied if any: "Fixed X bug(s) during development"]

### Next Steps:
- Review changes: `git diff`
- Commit when ready
- Deploy if needed

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

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
/twin-workflow "implement user authentication"

# [Claude creates plan and saves to file]
# [You review/edit ./twin-plan-current.md if needed]

# Continue in same chat
ok

# [Claude implements the approved plan]
```

### With Quality Level:
```bash
# Create plan with specific quality
/twin-workflow "refactor payment module" --quality=balanced

# Review and continue
continue
```

### Cancel and Start New:
```bash
# If you want to cancel current plan
/twin-workflow "different task"
# This will overwrite the previous plan
```

## 📁 File Structure

```
./
├── twin-plan-current.md      # Active plan (temporary)
├── twin-plans/                # Archived plans
│   ├── 2025-01-19-14-30-plan.md
│   └── 2025-01-19-16-45-plan.md
└── docs/sessions/             # Session documentation
    └── [session docs]
```

## 🔑 Key Features

- **Single Command**: Everything happens with `/twin-workflow`
- **Natural Pause**: Stops after planning for your review
- **Editable Plans**: Modify the .md file before approving
- **Same Chat**: Continue in the same conversation
- **Plan History**: All plans archived with timestamps
- **Smart Detection**: Knows whether to plan or implement

## 📝 Notes

- Plans are saved as markdown for easy editing
- Quality level affects both planning and implementation
- Archived plans can be reused as templates
- The workflow adapts to feature vs bug context
- No need for separate commands or complex workflows

## ⚠️ Important Reminders for Agents

When executing this workflow, agents must:
- **Stay focused**: Only analyze and plan what was explicitly requested
- **Be concise**: Technical plans, not project documentation
- **No estimates**: You're implementing it yourself - no points, sprints, or timelines
- **No over-engineering**: Direct solutions over complex architectures
- **Use project language**: If codebase is in Portuguese, plan in Portuguese
- **Real risks only**: Actual technical concerns, not theoretical project risks
- **Simple structure**: Clear file list + changes + order - that's it

### 🔄 Loop Execution Logic

The workflow includes an automatic quality loop with QA validation:
- **twin-developer** → implements/fixes code
- **twin-reviewer** → validates quality and standards
- **twin-tester** → performs manual QA validation

QA Validation Process:
1. **Detect project type** (frontend vs backend)
2. **Frontend**: Use Playwright MCP to test visually in browser
3. **Backend**: Use curl/scripts to test API/functions
4. **Test scenarios**: happy path, edge cases, error handling
5. **Generate report**: ✅ pass or ❌ bugs found

If bugs found:
1. twin-tester generates detailed bug report with reproduction steps
2. Loop returns to twin-developer with specific bugs to fix
3. Developer fixes issues based on QA report
4. Reviewer validates fixes meet quality standards
5. Tester validates fixes (regression testing)
6. Repeat until all features work correctly

Maximum iterations: 3 (if still failing after 3 loops, escalate to user with all bug reports)

Frontend projects: QA tests using real browser interaction via Playwright MCP
Backend projects: QA tests using curl, Node.js scripts, and API calls

---

**Starting workflow analysis...**