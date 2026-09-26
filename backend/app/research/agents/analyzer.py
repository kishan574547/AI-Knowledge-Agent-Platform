import json
import logging
import re
from typing import Any, Dict, List
from app.rag.generation.gemini_client import gemini_client
from app.research.state import ResearchState, AnalysisFact, AnalysisInference

logger = logging.getLogger("rag_system.research.analyzer")

ANALYZER_SYSTEM_PROMPT = """You are the Analysis Agent in an AI Knowledge & Agent Platform.
Your job is to rigorously examine retrieved evidence and categorize findings into three distinct categories:

1. FACTS: Direct factual claims explicitly stated in the retrieved text.
   - Each fact MUST cite the exact source filename or document ID.
2. INFERENCES: Logical conclusions or comparisons reasonably derived from the facts.
   - Each inference MUST list the supporting premise citations.
3. INSUFFICIENT_INFORMATION: Specific questions or aspects where the retrieved evidence does not provide enough data.
   - Never invent or assume facts when data is missing.

Output ONLY valid JSON matching this schema:
{
  "facts": [
    {
      "statement": "Clear factual statement...",
      "source_citation": "filename.pdf [chunk 1]",
      "doc_id": "doc_id_here",
      "confidence": 0.95
    }
  ],
  "inferences": [
    {
      "deduction": "Derived logical conclusion...",
      "premise_citations": ["filename.pdf [chunk 1]", "other.pdf [chunk 2]"],
      "confidence": 0.85
    }
  ],
  "insufficient_info": [
    "Evidence does not specify the deployment latency for system X",
    "Missing benchmarks for comparison Y"
  ]
}
Do not include any text outside the JSON.
"""


def analyze_evidence(state: ResearchState) -> Dict[str, Any]:
    """
    Analysis Agent Node.
    Analyzes retrieved chunks and classifies evidence into FACT, INFERENCE, and INSUFFICIENT_INFORMATION.
    """
    query = state.get("query", "")
    sources = state.get("sources", [])
    tasks = state.get("tasks", [])

    logger.info(f"Analysis Agent processing {len(sources)} sources for query '{query[:60]}...'")

    if not sources:
        return {
            "facts": [],
            "inferences": [],
            "insufficient_info": [f"No relevant documents or memories found in the knowledge base for '{query}'."],
            "current_step": "analysis_completed"
        }

    # Format retrieved sources into structured context
    sources_text = ""
    for idx, s in enumerate(sources, 1):
        fn = s.get("filename", "Unknown")
        doc_id = s.get("doc_id", f"doc_{idx}")
        content = s.get("content", "").strip()
        sim = s.get("similarity", 0.0)
        sources_text += f"\n--- SOURCE {idx}: {fn} (Doc ID: {doc_id}, Similarity: {sim}) ---\n{content}\n"

    tasks_summary = "\n".join([f"- {t.get('description')}" for t in tasks])

    user_prompt = f"""Research Question: {query}

Research Goals:
{tasks_summary}

Retrieved Evidence:
{sources_text}

Analyze the evidence strictly according to the facts present. Do not extrapolate beyond what is stated. Distinguish FACTS, INFERENCES, and INSUFFICIENT INFORMATION:"""

    try:
        response_text = gemini_client.generate_response(
            prompt=user_prompt,
            system_instruction=ANALYZER_SYSTEM_PROMPT,
            temperature=0.1,
            max_tokens=1500,
        )

        json_match = re.search(r"\{[\s\S]*\}", response_text)
        if json_match:
            data = json.loads(json_match.group(0))
            facts: List[AnalysisFact] = data.get("facts", [])
            inferences: List[AnalysisInference] = data.get("inferences", [])
            insufficient_info: List[str] = data.get("insufficient_info", [])
        else:
            facts = []
            inferences = []
            insufficient_info = ["Unable to parse structured evidence categories from LLM."]

        logger.info(f"Analysis Agent categorized {len(facts)} facts, {len(inferences)} inferences, {len(insufficient_info)} gaps.")
        return {
            "facts": facts,
            "inferences": inferences,
            "insufficient_info": insufficient_info,
            "current_step": "analysis_completed"
        }

    except Exception as e:
        logger.error(f"Analysis Agent error: {str(e)}", exc_info=True)
        return {
            "facts": [],
            "inferences": [],
            "insufficient_info": [f"Analysis pipeline error: {str(e)}"],
            "current_step": "analysis_completed"
        }
