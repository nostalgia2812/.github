from typing import Any, Dict, List


DEVELOPER_WORKFLOWS: List[Dict[str, str]] = [
    {
        "name": "Google ADK + Gemini CLI",
        "focus": "agent-prototyping",
        "value": "Shorter llms-full.txt context and conversational iteration help teams move from idea to working internal agent faster.",
    },
    {
        "name": "KitOps",
        "focus": "model-packaging",
        "value": "Package and distribute model artifacts consistently across local, CI/CD, and Kubernetes workflows.",
    },
    {
        "name": "GitHub Issue Labeling Pattern",
        "focus": "automation-design",
        "value": "Use agent plans, tool abstractions, and iterative CLI refinement to automate repetitive issue triage safely.",
    },
]

POWERSHELL_COMMANDS: List[Dict[str, str]] = [
    {"command": "gemini", "description": "Start interactive REPL", "example": "gemini"},
    {"command": "gemini -p \"query\"", "description": "Query non-interactively", "example": "gemini -p \"summarize README.md\""},
    {"command": "gemini \"query\"", "description": "Query and continue interactively", "example": "gemini \"explain this project\""},
    {"command": "Get-Content logs.txt | gemini", "description": "Process piped content in PowerShell", "example": "Get-Content logs.txt | gemini"},
    {"command": "gemini -i \"query\"", "description": "Execute prompt and continue interactively", "example": "gemini -i \"What is the purpose of this project?\""},
    {"command": "gemini -r \"latest\"", "description": "Resume the latest session", "example": "gemini -r \"latest\""},
    {"command": "gemini update", "description": "Update CLI", "example": "gemini update"},
    {"command": "gemini extensions list", "description": "List installed extensions", "example": "gemini extensions list"},
    {"command": "gemini mcp list", "description": "List configured MCP servers", "example": "gemini mcp list"},
    {"command": "kit version", "description": "Verify KitOps installation", "example": "kit version"},
]


def developer_toolkit_context() -> Dict[str, Any]:
    return {
        "summary": "Developer tooling is integrated as workflow guidance for safe agent prototyping, packaging, and CLI-driven iteration.",
        "llms_full_txt_advantage": [
            "Saves context window space for longer working sessions.",
            "Improves ADK code generation accuracy with less boilerplate prompting.",
            "Speeds up prototyping and iteration loops for internal agents.",
        ],
        "workflow_steps": [
            "Download llms-full.txt into the project workspace.",
            "Use Gemini CLI to brainstorm and plan the agent.",
            "Generate ADK-based code and tool wrappers.",
            "Test and refine iteratively in conversation.",
            "Package and distribute artifacts with KitOps where needed.",
        ],
        "developer_workflows": DEVELOPER_WORKFLOWS,
        "powershell_commands": POWERSHELL_COMMANDS,
        "safety_note": "These references are provided for defensive/internal developer productivity workflows, not offensive capability development.",
    }
