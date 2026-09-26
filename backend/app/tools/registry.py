"""
Tool Registry — singleton that holds all registered MCP tools.
"""
from __future__ import annotations
from typing import Dict, Optional
from app.tools.base import BaseTool


class ToolRegistry:
    _instance: Optional["ToolRegistry"] = None

    def __init__(self) -> None:
        self._tools: Dict[str, BaseTool] = {}

    @classmethod
    def get(cls) -> "ToolRegistry":
        if cls._instance is None:
            cls._instance = cls()
            cls._instance._register_all()
        return cls._instance

    def _register_all(self) -> None:
        from app.tools.document_search import DocumentSearchTool
        from app.tools.memory_search import MemorySearchTool
        from app.tools.memory_create import MemoryCreateTool
        from app.tools.memory_delete import MemoryDeleteTool
        from app.tools.task_create import TaskCreateTool
        from app.tools.task_list import TaskListTool
        from app.tools.task_complete import TaskCompleteTool

        for tool in [
            DocumentSearchTool(),
            MemorySearchTool(),
            MemoryCreateTool(),
            MemoryDeleteTool(),
            TaskCreateTool(),
            TaskListTool(),
            TaskCompleteTool(),
        ]:
            self._tools[tool.name] = tool

    def get_tool(self, name: str) -> Optional[BaseTool]:
        return self._tools.get(name)

    def all_tools(self) -> Dict[str, BaseTool]:
        return dict(self._tools)

    def tool_descriptions_for_prompt(self) -> str:
        """Returns a structured tool-list string to inject into the LLM system prompt."""
        lines = []
        for tool in self._tools.values():
            lines.append(
                f"TOOL: {tool.schema.name} [{tool.schema.permission_level.value.upper()}]\n"
                f"  Description: {tool.schema.description}\n"
                f"  Input: {tool.schema.input_schema}"
            )
        return "\n\n".join(lines)
