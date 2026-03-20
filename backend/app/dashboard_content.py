from typing import Any, Dict, List


LATEST_CONTENT: List[Dict[str, str]] = [
    {
        "date": "Feb 26, 2026",
        "title": "ClawdBot: The AI Agent Transforming Digital Productivity—But at What Cost?",
        "category": "ai-risk",
    },
    {
        "date": "Feb 26, 2026",
        "title": "OAuth Consent Attacks Target Entra ID and the ChatGPT Connection",
        "category": "identity",
    },
    {
        "date": "Feb 26, 2026",
        "title": "How Perplexity Computer Is Shaping the Future of AI Work",
        "category": "ai-operations",
    },
    {
        "date": "Feb 24, 2026",
        "title": "How Machine Learning Is Revolutionizing the Search for Advanced Material Structures",
        "category": "research",
    },
    {
        "date": "Feb 20, 2026",
        "title": "Superset: The Terminal Built for Running Parallel Coding Agents",
        "category": "developer-tools",
    },
    {
        "date": "Feb 16, 2026",
        "title": "Cloudflare's Markdown for Agents: Shaping the Future of Web Content for AI",
        "category": "agent-content",
    },
]

WORKFLOW_TOOLS: List[Dict[str, str]] = [
    {
        "name": "Prompt Maker Image Generator",
        "role": "creative-ops",
        "benefit": "Generate clearer prompts and concept images for analyst communication and reporting.",
    },
    {
        "name": "Fluid Integration",
        "role": "automation",
        "benefit": "Export risk findings into downstream reporting and orchestration pipelines.",
    },
    {
        "name": "Provider Catalog",
        "role": "intel-enrichment",
        "benefit": "Route investigations to supported defensive intelligence providers faster.",
    },
    {
        "name": "Threat Model Export",
        "role": "engineering",
        "benefit": "Reuse the OpenClaw defensive model in automation, demos, and internal tooling.",
    },
]


def dashboard_context() -> Dict[str, Any]:
    return {
        "latest_content": LATEST_CONTENT,
        "tools": WORKFLOW_TOOLS,
        "insight": "Use recent AI-security content and integrated workflow tools to prioritize analyst triage, threat enrichment, and reporting efficiency.",
    }
