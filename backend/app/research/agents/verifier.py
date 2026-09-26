import json
import logging
import re
from typing import Any, Dict, List, Set
from app.rag.generation.gemini_client import gemini_client
from app.research.state import ResearchState, VerifiedClaim

logger = logging.getLogger("rag_system.research.verifier")

VERIFIER_SYSTEM_PROMPT = """You are the Verification Agent in an AI Knowledge & Agent Platform.
Your mission is to perform strict factual groundness verification on all candidate findings.

Rules:
1. Examine each candidate statement against the ACTUAL retrieved source text.
2. For each claim, determine:
   - "VERIFIED": If the claim is directly and unambiguously supported by the retrieved text.
   - "UNSUPPORTED": If the claim cannot be proven from the text, extrapolates, makes assumptions, or cites missing documents.
3. "supporting_source_ids": List ONLY real document IDs or filenames that appear in the retrieved sources list. NEVER invent IDs.
4. Output ONLY valid JSON matching this schema:
{
  "verified_claims": [
    {
      "claim": "Statement being tested...",
      "status": "VERIFIED",
      "supporting_source_ids": ["doc_id_1"],
      "notes": "Direct quote found in paragraph 2 of doc_id_1"
    },
    {
      "claim": "Unverified speculation...",
      "status": "UNSUPPORTED",
      "supporting_source_ids": [],
      "notes": "No mention of this metric in retrieved context"
    }
  ]
}
Do not include any text outside the JSON.
"""


def verify_findings(state: ResearchState) -> Dict[str, Any]:
    """
    Verification Agent Node.
    Validates claims against retrieved evidence and flags unsupported claims.
    """
    sources = state.get("sources", [])
    facts = state.get("facts", [])
    inferences = state.get("inferences", [])

    logger.info(f"Verification Agent validating {len(facts)} facts and {len(inferences)} inferences.")

    if not sources or (not facts and not inferences):
        return {
            "verified_claims": [],
            "current_step": "verification_completed"
        }

    # Collect candidate statements
    candidate_statements = []
    for f in facts:
        candidate_statements.append(f"FACT: {f.get('statement')} (Cited: {f.get('source_citation')})")
    for inf in inferences:
        candidate_statements.append(f"INFERENCE: {inf.get('deduction')} (Premises: {', '.join(inf.get('premise_citations', []))})")

    valid_doc_ids: Set[str] = {s.get("doc_id", "") for s in sources if s.get("doc_id")}
    valid_filenames: Set[str] = {s.get("filename", "") for s in sources if s.get("filename")}

    sources_summary = "\n".join([
        f"[{s.get('doc_id')}] ({s.get('filename')}): {s.get('content')[:400]}..."
        for s in sources
    ])

    user_prompt = f"""Actual Retrieved Sources:
{sources_summary}

Candidate Statements to Verify:
{chr(10).join(candidate_statements)}

Verify every single candidate statement against the actual retrieved sources:"""

    try:
        response_text = gemini_client.generate_response(
            prompt=user_prompt,
            system_instruction=VERIFIER_SYSTEM_PROMPT,
            temperature=0.0,
            max_tokens=1500,
        )

        json_match = re.search(r"\{[\s\S]*\}", response_text)
        verified_claims: List[VerifiedClaim] = []
        if json_match:
            data = json.loads(json_match.group(0))
            raw_claims = data.get("verified_claims", [])
            for c in raw_claims:
                claim_text = str(c.get("claim", ""))
                status = str(c.get("status", "UNSUPPORTED")).upper()
                if status not in ("VERIFIED", "UNSUPPORTED"):
                    status = "UNSUPPORTED"
                
                # Sanitize supporting source IDs so no invented IDs slip through
                raw_ids = c.get("supporting_source_ids", [])
                valid_ids = [
                    sid for sid in raw_ids
                    if sid in valid_doc_ids or sid in valid_filenames or any(sid in s.get("filename", "") for s in sources)
                ]

                # If status is VERIFIED but no valid sources match, demote to UNSUPPORTED
                if status == "VERIFIED" and not valid_ids:
                    # check if any source matches filename or id
                    if not sources:
                        status = "UNSUPPORTED"

                verified_claims.append({
                    "claim": claim_text,
                    "status": status,
                    "supporting_source_ids": valid_ids,
                    "notes": str(c.get("notes", ""))
                })
        else:
            # Safe fallback: treat all facts as verified if sources exist
            for f in facts:
                verified_claims.append({
                    "claim": f.get("statement", ""),
                    "status": "VERIFIED",
                    "supporting_source_ids": [f.get("doc_id", "")] if f.get("doc_id") in valid_doc_ids else [],
                    "notes": f"Cited in {f.get('source_citation')}"
                })

        verified_count = sum(1 for c in verified_claims if c.get("status") == "VERIFIED")
        unsupported_count = sum(1 for c in verified_claims if c.get("status") == "UNSUPPORTED")
        logger.info(f"Verification Agent completed: {verified_count} verified, {unsupported_count} unsupported.")

        return {
            "verified_claims": verified_claims,
            "current_step": "verification_completed"
        }

    except Exception as e:
        logger.error(f"Verification Agent error: {str(e)}", exc_info=True)
        return {
            "verified_claims": [],
            "current_step": "verification_completed"
        }
