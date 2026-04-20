"""
pdf_export_tool.py
──────────────────
Provides:

1. compile_final_report(topic, out_dir)   ← deterministic Python function
   Called directly from api.py after the auditor task finishes.
   Reads syllabus.md, lessons.md, quiz.md, sanitises them, and stitches
   them into a proper final_report.md - no LLM involvement.

2. generate_final_report (CrewAI @tool)
   Kept as a fallback so an agent can call it if needed.
"""

import os
import re
from pathlib import Path
from datetime import datetime
from crewai.tools import tool


# ── Content sanitiser ─────────────────────────────────────────────────────────

def _sanitise(text: str) -> str:
    """
    Remove LLM artefacts that should never appear in a Markdown report:

    • Fenced code blocks that contain JSON-like content (``json … ``)
    • Bare JSON objects that look like tool calls  { "name": "...", ... }
    • Standalone lines that are only JSON punctuation  {  }  [  ]
    • Any line starting with  {"name":  or  {"tool":
    • Any remaining lines that are pure JSON schema noise
    """
    lines = text.splitlines()
    cleaned: list[str] = []
    skip_until_fence = False   # True while inside a ```…``` block to strip

    # Patterns that mark "this line is JSON/tool-call noise"
    json_line_pat = re.compile(
        r'^\s*(\{|\}|\[|\]|"name"\s*:|"parameters"\s*:|"type"\s*:|"properties"\s*:)'
    )
    tool_call_start = re.compile(r'^\s*\{\s*"name"\s*:\s*"')

    i = 0
    while i < len(lines):
        line = lines[i]

        # Detect opening of a fenced code block
        if re.match(r'^\s*```', line):
            # Peek ahead: if the block contains JSON, skip the whole block
            j = i + 1
            block_lines = []
            while j < len(lines) and not re.match(r'^\s*```', lines[j]):
                block_lines.append(lines[j])
                j += 1
            block_text = '\n'.join(block_lines)
            # If the block is JSON-ish, skip it entirely
            if re.search(r'"name"\s*:|"parameters"\s*:|"type"\s*:', block_text):
                i = j + 1   # skip past closing ```
                continue
            else:
                # Keep the block as-is
                cleaned.append(line)
                i += 1
                continue

        # Drop bare JSON / tool-call lines
        if json_line_pat.match(line) or tool_call_start.match(line):
            i += 1
            continue

        cleaned.append(line)
        i += 1

    result = '\n'.join(cleaned)

    # Collapse 3+ blank lines → 2
    result = re.sub(r'\n{3,}', '\n\n', result)
    return result.strip()


# ── Deterministic assembler (called from api.py) ──────────────────────────────

def compile_final_report(topic: str, out_dir: str) -> str:
    """
    Read syllabus.md, lessons.md, and quiz.md from out_dir, sanitise them,
    and compile into a properly structured final_report.md.

    Returns the path of the written file, or an error string.
    """
    try:
        base = Path(out_dir)

        def _read(name: str) -> str:
            p = base / name
            raw = p.read_text(encoding="utf-8").strip() if p.exists() else ""
            return _sanitise(raw)

        syllabus = _read("syllabus.md")
        lessons  = _read("lessons.md")
        quiz     = _read("quiz.md")

        now = datetime.now().strftime("%Y-%m-%d %H:%M")
        topic_title = topic.replace("_", " ").title()

        report = f"""# {topic_title} - Complete Course Report

> Generated on {now}

---

## Syllabus

{syllabus}

---

## Lessons

{lessons}

---

## Assessment (Quiz)

{quiz}

---

*End of Report*
"""
        out_file = base / "final_report.md"
        out_file.write_text(report.strip() + "\n", encoding="utf-8")
        return str(out_file)

    except Exception as e:
        return f"Error compiling final report: {e}"


# ── CrewAI tool wrapper (fallback / kept for agent compatibility) ──────────────

@tool("generate_final_report")
def generate_final_report(content: str, course_topic: str) -> str:
    """
    Saves a pre-compiled Markdown string as the final course report.

    Use this ONLY when you already have the full compiled Markdown content.
    Pass the complete Markdown text as 'content' and the course name as
    'course_topic'. Do NOT pass JSON or function-call syntax.

    Args:
        content (str): The full compiled course content in Markdown format.
        course_topic (str): Name of the course (used for the folder name).

    Returns:
        str: Path to the generated report file.
    """
    try:
        slug   = course_topic.strip().replace(" ", "_").lower()
        folder = Path(f"./data/{slug}")
        folder.mkdir(parents=True, exist_ok=True)
        out    = folder / "final_report.md"
        clean  = _sanitise(content)
        out.write_text(clean.strip() + "\n", encoding="utf-8")
        return f"Final course report saved at: {out}"
    except Exception as e:
        return f"Error generating final report: {e}"