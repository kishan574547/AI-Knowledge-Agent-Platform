import json
import logging
import re
from typing import Any, Dict, List
from app.rag.generation.gemini_client import gemini_client
from app.mcp.validators import sanitize_user_input, detect_prompt_injection
from app.research.state import ResearchState, ResearchTask

logger = logging.getLogger("rag_system.research.planner")

MAX_TASKS = 4

PLANNER_SYSTEM_PROMPT = """You are the Research Planner Agent in an AI Knowledge & Agent Platform.
Your job is to break down a complex user research question into 2 to 4 distinct, focused research tasks.

Rules:
1. Generate between 2 and 4 tasks (MAXIMUM 4). Never generate more than 4 tasks.
2. Each task must have:
   - "id": e.g. "task_1", "task_2"
   - "description": clear statement of what information to find
   - "search_query": targeted semantic search keywords to query the user's document vector store
   - "rationale": brief explanation of why this step is needed
3. Focus strictly on retrieving facts, comparisons, specifications, or historical memories from uploaded user documents.
4. Output ONLY valid JSON matching this schema:
{
  "tasks": [
    {
      "id": "task_1",
      "description": "Find documents discussing...",
      "search_query": "specific search terms",
      "rationale": "To establish the baseline..."
    }
  ]
}
Do not include any conversational preamble or markdown code blocks other than the JSON.
"""


def plan_research(state: ResearchState) -> Dict[str, Any]:
    """
    Research Planner Node.
    Analyzes user research query and decomposes it into bounded sub-tasks.
    """
    query = state.get("query", "").strip()
    logger.info(f"Research Planner starting for query: '{query[:80]}...'")

    # Prompt injection check
    is_injection, reason = detect_prompt_injection(query)
    clean_query = sanitize_user_input(query, max_length=1000)

    user_prompt = f"Decompose this research question into 2-4 sub-tasks for document retrieval:\nQuestion: {clean_query}"

    try:
        response_text = gemini_client.generate_response(
            prompt=user_prompt,
            system_instruction=PLANNER_SYSTEM_PROMPT,
            temperature=0.1,
            max_tokens=800,
        )

        # Extract JSON
        json_match = re.search(r"\{[\s\S]*\}", response_text)
        if json_match:
            data = json.loads(json_match.group(0))
            raw_tasks = data.get("tasks", [])
        else:
            raw_tasks = []

        # Validate and cap at MAX_TASKS
        tasks: List[ResearchTask] = []
        for i, t in enumerate(raw_tasks[:MAX_TASKS]):
            task_id = str(t.get("id") or f"task_{i+1}")
            desc = str(t.get("description") or f"Investigate aspect {i+1} of {clean_query}")
            sq = str(t.get("search_query") or clean_query)
            rat = str(t.get("rationale") or "Required for comprehensive analysis")
            tasks.append({
                "id": task_id,
                "description": desc,
                "search_query": sq,
                "rationale": rat
            })

        # Fallback if empty or parsing failed
        if not tasks:
            tasks = [
                {
                    "id": "task_1",
                    "description": f"Retrieve relevant background documents and context for '{clean_query}'",
                    "search_query": clean_query,
                    "rationale": "Primary semantic document search"
                },
                {
                    "id": "task_2",
                    "description": f"Extract key specifications, findings, and technical details for '{clean_query}'",
                    "search_query": f"{clean_query} details specifications findings",
                    "rationale": "Extracting deep attributes and limitations"
                }
            ]

        logger.info(f"Research Planner generated {len(tasks)} tasks.")
        return {
            "tasks": tasks,
            "current_step": "planning_completed"
        }

    except Exception as e:
        logger.error(f"Research Planner error: {str(e)}", exc_info=True)
        # Safe fallback tasks on LLM error
        fallback_tasks: List[ResearchTask] = [
            {
                "id": "task_1",
                "description": f"Search knowledge base for '{clean_query}'",
                "search_query": clean_query,
                "rationale": "Fallback direct semantic search"
            }
        ]
        return {
            "tasks": fallback_tasks,
            "current_step": "planning_completed"
        }
