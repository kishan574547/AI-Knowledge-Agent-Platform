import json
import logging
import re
from typing import Any, Dict, List
from app.rag.generation.gemini_client import gemini_client
from app.research.state import ResearchState, FinalReport

logger = logging.getLogger("rag_system.research.writer")

WRITER_SYSTEM_PROMPT = """You are the Report Writer Agent in an AI Knowledge & Agent Platform.
Your job is to synthesize verified findings, analysis, and retrieved source material into an authoritative, beautifully structured research report.

Report Structure Requirements:
1. "title": A clear, informative title for the research brief.
2. "executive_summary": High-level synthesis answering the core question in 2-3 concise paragraphs.
3. "key_findings": Array of key takeaways with verified factual grounding.
4. "detailed_analysis": Comprehensive analysis comparing points, explaining mechanisms, and highlighting verified evidence.
5. "limitations": Explicit list of data gaps, unaddressed questions, or unsupported claims identified by the Verification Agent.
6. "markdown_content": Complete, formatted Markdown document combining all sections with headers, tables, bullet points, and source citations.

Rules:
- Sources must come ONLY from actual provided documents.
- If certain information was marked UNSUPPORTED or INSUFFICIENT, document it clearly in the Limitations section.

Output ONLY valid JSON matching this schema:
{
  "title": "Comprehensive Analysis of...",
  "executive_summary": "Summary text...",
  "key_findings": [
    {"finding": "Point 1...", "status": "VERIFIED", "source": "filename.pdf"}
  ],
  "detailed_analysis": "Multi-paragraph detailed analysis...",
  "limitations": [
    "Limitation 1: No metrics provided for..."
  ],
  "markdown_content": "# Comprehensive Analysis of...\n\n## Executive Summary\n..."
}
Do not include any text outside the JSON.
"""


def write_research_report(state: ResearchState) -> Dict[str, Any]:
    """
    Report Writer Node.
    Compiles verified claims, analysis facts, and retrieved evidence into the final structured report.
    """
    query = state.get("query", "")
    sources = state.get("sources", [])
    facts = state.get("facts", [])
    inferences = state.get("inferences", [])
    insufficient = state.get("insufficient_info", [])
    verified_claims = state.get("verified_claims", [])

    logger.info(f"Report Writer generating final report for query '{query[:60]}...'")

    # Format evidence summary
    sources_catalog = []
    for s in sources:
        fn = s.get("filename", "Unknown")
        doc_id = s.get("doc_id", "unknown")
        sim = s.get("similarity", 0.0)
        sources_catalog.append({
            "doc_id": doc_id,
            "filename": fn,
            "relevance_score": sim,
            "source_type": s.get("source_type", "document")
        })

    facts_summary = "\n".join([f"- [FACT] {f.get('statement')} (Source: {f.get('source_citation')})" for f in facts])
    inferences_summary = "\n".join([f"- [INFERENCE] {inf.get('deduction')}" for inf in inferences])
    verification_summary = "\n".join([f"- [{vc.get('status')}] {vc.get('claim')} ({vc.get('notes')})" for vc in verified_claims])
    gaps_summary = "\n".join([f"- [GAP] {gap}" for gap in insufficient])

    user_prompt = f"""Research Question: {query}

Verified Findings & Claims:
{verification_summary or 'No specific verification claims available.'}

Extracted Facts:
{facts_summary or 'No direct facts extracted.'}

Inferences:
{inferences_summary or 'None.'}

Identified Data Gaps / Limitations:
{gaps_summary or 'None identified.'}

Available Real Sources:
{json.dumps(sources_catalog, indent=2)}

Synthesize this research into the required JSON report structure:"""

    try:
        response_text = gemini_client.generate_response(
            prompt=user_prompt,
            system_instruction=WRITER_SYSTEM_PROMPT,
            temperature=0.2,
            max_tokens=2500,
        )

        json_match = re.search(r"\{[\s\S]*\}", response_text)
        if json_match:
            data = json.loads(json_match.group(0))
            title = data.get("title") or f"Research Report: {query}"
            exec_summary = data.get("executive_summary") or "Research completed based on available documents."
            key_findings = data.get("key_findings") or []
            detailed = data.get("detailed_analysis") or ""
            limits = data.get("limitations") or insufficient
            md_content = data.get("markdown_content") or ""
        else:
            title = f"Research Report: {query}"
            exec_summary = "Research completed based on available documents."
            key_findings = [{"finding": f.get("statement", ""), "status": "VERIFIED", "source": f.get("source_citation", "")} for f in facts[:5]]
            detailed = "\n\n".join([f.get("statement", "") for f in facts])
            limits = insufficient
            md_content = f"# {title}\n\n## Executive Summary\n{exec_summary}\n\n## Key Findings\n" + "\n".join([f"- {f.get('statement')}" for f in facts])

        final_report: FinalReport = {
            "title": title,
            "research_question": query,
            "executive_summary": exec_summary,
            "key_findings": key_findings,
            "detailed_analysis": detailed,
            "verified_sources": sources_catalog,
            "limitations": limits,
            "markdown_content": md_content,
        }

        logger.info(f"Report Writer generated report '{title}' with {len(key_findings)} findings.")
        return {
            "final_report": final_report,
            "current_step": "writing_completed"
        }

    except Exception as e:
        logger.error(f"Report Writer error: {str(e)}", exc_info=True)
        fallback_report: FinalReport = {
            "title": f"Research Report: {query}",
            "research_question": query,
            "executive_summary": f"Research completed with partial fallback due to error: {str(e)}",
            "key_findings": [],
            "detailed_analysis": "",
            "verified_sources": sources_catalog,
            "limitations": [f"Error occurred during report compilation: {str(e)}"],
            "markdown_content": f"# Research Report: {query}\n\nAnalysis completed with {len(sources)} sources retrieved.",
        }
        return {
            "final_report": fallback_report,
            "current_step": "writing_completed"
        }
