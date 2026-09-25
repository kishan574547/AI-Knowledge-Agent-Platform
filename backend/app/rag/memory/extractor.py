import re
import logging
from typing import List, Dict, Optional, Any
from pydantic import BaseModel
from app.schemas.memory import MemoryType

logger = logging.getLogger("memory.extractor")

# Regex filters to immediately reject sensitive or noisy content
SENSITIVE_PATTERNS = [
    re.compile(r"\b(api[_-]?key|client[_-]?secret|access[_-]?token|refresh[_-]?token|auth[_-]?token|token|secret)\s*[:=]\s*\S+", re.IGNORECASE),
    re.compile(r"\b(password|passwd|pwd)\s*[:=]\s*\S+", re.IGNORECASE),
    re.compile(r"\b(my\s+password\s+is|password\s+is)\b", re.IGNORECASE),
    re.compile(r"bearer\s+[a-zA-Z0-9\.\-_]{15,}", re.IGNORECASE),
    re.compile(r"(sk-[a-zA-Z0-9\-_]{15,}|ghp_[a-zA-Z0-9]{20,}|eyJ[a-zA-Z0-9_-]{20,}|AIzaSy[a-zA-Z0-9_-]{20,})"),
    re.compile(r"\b(aws_secret_access_key|aws_access_key_id)\s*[:=]\s*\S+", re.IGNORECASE),
    re.compile(r"(credit[_-]?card|\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b)"),
    re.compile(r"(ignore\s+(all\s+)?previous\s+instructions|system\s+prompt|reveal\s+secrets)", re.IGNORECASE),
]

# Patterns indicating transient questions rather than durable memory
TRANSIENT_PATTERNS = [
    re.compile(r"^(what|why|how|when|where|who|is|are|can|could|would|summarize|explain|tell me)\b", re.IGNORECASE),
    re.compile(r"^(hi|hello|hey|thanks|thank you|ok|okay|bye|good morning|good evening)[\s!.]*$", re.IGNORECASE),
]

# Heuristic patterns for direct fact / preference / goal identification
MEMORY_INDICATORS = [
    (re.compile(r"\b(i\s+prefer|i\s+like|my\s+preference\s+is|i\s+usually\s+use|i\s+favor)\b", re.IGNORECASE), MemoryType.PREFERENCE, 1.2),
    (re.compile(r"\b(i\s+am\s+preparing\s+for|my\s+goal\s+is|i\s+want\s+to\s+become|i\s+aim\s+to|i\s+plan\s+to)\b", re.IGNORECASE), MemoryType.GOAL, 1.5),
    (re.compile(r"\b(i\s+work\s+as|i\s+am\s+a|my\s+role\s+is|i\s+specialize\s+in|i\s+know|i\s+am\s+skilled\s+in)\b", re.IGNORECASE), MemoryType.SKILL, 1.2),
    (re.compile(r"\b(i\s+am\s+building|my\s+project\s+is|we\s+are\s+developing|i\s+am\s+working\s+on)\b", re.IGNORECASE), MemoryType.PROJECT, 1.3),
    (re.compile(r"\b(remember\s+that|keep\s+in\s+mind\s+that|always\s+format|always\s+respond\s+with)\b", re.IGNORECASE), MemoryType.INSTRUCTION, 1.4),
    (re.compile(r"\b(my\s+name\s+is|i\s+live\s+in|i\s+am\s+based\s+in|my\s+company\s+is|my\s+team\s+is)\b", re.IGNORECASE), MemoryType.PERSONAL_CONTEXT, 1.1),
]


class MemoryCandidate(BaseModel):
    content: str
    memory_type: str
    importance: float = 1.0


def is_sensitive_text(text: str) -> bool:
    for pattern in SENSITIVE_PATTERNS:
        if pattern.search(text):
            return True
    return False


class MemoryExtractor:
    """
    Conservative memory extraction engine.
    Identifies durable, persistent user preferences, goals, and facts
    while strictly filtering out noise, transient queries, secrets, and prompt injections.
    """

    def is_safe_content(self, text: str) -> bool:
        if is_sensitive_text(text):
            logger.warning("Rejected memory content due to sensitive/injection pattern match.")
            return False
        return True

    def is_transient_question(self, text: str) -> bool:
        clean = text.strip()
        for pattern in TRANSIENT_PATTERNS:
            if pattern.search(clean):
                return True
        return False

    def extract(self, text: str) -> List[MemoryCandidate]:
        """
        Extracts candidate memories from a user statement using heuristic matching.
        """
        clean_text = text.strip()
        if len(clean_text) < 10 or len(clean_text) > 1500:
            return []

        if not self.is_safe_content(clean_text):
            return []

        # Split into sentences
        sentences = [s.strip() for s in re.split(r"[.!?\n]+", clean_text) if len(s.strip()) >= 10]
        extracted: List[MemoryCandidate] = []

        for sentence in sentences:
            if self.is_transient_question(sentence):
                continue
            if not self.is_safe_content(sentence):
                continue

            for pattern, mem_type, importance in MEMORY_INDICATORS:
                if pattern.search(sentence):
                    formatted_content = sentence[0].upper() + sentence[1:] if sentence else sentence
                    extracted.append(
                        MemoryCandidate(
                            content=formatted_content,
                            memory_type=mem_type.value,
                            importance=importance,
                        )
                    )
                    break  # Matched one indicator for this sentence

        return extracted

    def extract_from_text(self, text: str) -> List[Dict[str, Any]]:
        """
        Backward-compatible dictionary extraction.
        """
        candidates = self.extract(text)
        return [
            {"content": c.content, "memory_type": c.memory_type, "importance": c.importance}
            for c in candidates
        ]


memory_extractor = MemoryExtractor()
