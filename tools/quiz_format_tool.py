import json
import os
import re
from crewai.tools import tool


def _ensure_options_on_newlines(text: str) -> str:
    """
    Normalises quiz option formatting so the saved file matches:

        Q1. Question text here?

        A. Option one
        B. Option two
        C. Option three
        D. Option four

        Correct Answer: A

    Rules applied:
      1. Any line that has 2+ option markers (A)/A. etc.) on it gets split so
         each option occupies its own line.
      2. All option markers are normalised to "A." period style (A. B. C. D.).
      3. A blank line is inserted before every "Correct Answer:" line.
      4. A blank line is inserted before every question line that starts with
         a number + dot/paren (e.g. "1." or "Q1.") for visual breathing room.
      5. Trailing whitespace is removed from every line.
      6. No more than two consecutive blank lines are allowed.
    """
    processed: list[str] = []

    for raw_line in text.splitlines():
        stripped = raw_line.strip()

        # ── Split lines that contain multiple options ──────────────────────
        markers = re.findall(r'\b([A-D])[).]', stripped)
        if len(markers) >= 2:
            parts = re.split(r'(?=\b[A-D][).])', stripped)
            for part in parts:
                p = part.strip()
                if p:
                    # Normalise A) → A.
                    p = re.sub(r'^([A-D])\)', r'\1.', p)
                    processed.append(p)
        else:
            # Normalise single-option lines  A) → A.
            normalised = re.sub(r'^([A-D])\)', r'\1.', stripped)
            processed.append(normalised)

    rejoined = '\n'.join(processed)

    # ── Ensure blank line BEFORE "Correct Answer:" ─────────────────────────
    rejoined = re.sub(r'\n+(Correct Answer:)', r'\n\n\1', rejoined)

    # ── Ensure blank line BEFORE numbered question lines (1. / Q1. / **1.) ─
    rejoined = re.sub(r'\n+(\*{0,2}(?:Q?\d+)[.)]\s)', r'\n\n\1', rejoined)

    # ── Collapse 3+ blank lines → exactly 2 ───────────────────────────────
    rejoined = re.sub(r'\n{3,}', '\n\n', rejoined)

    return rejoined.strip()


@tool("save_quiz_structured")
def save_quiz_structured(quiz_text: str, course_topic: str) -> str:
    """
    Saves the generated quiz as both a Markdown file (quiz.md) and a JSON sidecar.

    Expected input format (15 questions, 3 per module):

        ## Module 1 Quiz

        1. Question text?

        A. Option one
        B. Option two
        C. Option three
        D. Option four

        Correct Answer: A

    Args:
        quiz_text (str): The quiz in Markdown - 15 MCQs across 5 modules.
        course_topic (str): Used to name the output folder and files.

    Returns:
        str: Paths where the quiz files were saved.
    """
    try:
        folder = f"./data/{course_topic.replace(' ', '_').lower()}"
        os.makedirs(folder, exist_ok=True)

        # Apply formatting normalisation
        formatted = _ensure_options_on_newlines(quiz_text.strip())

        # ── Markdown ──────────────────────────────────────────────────────
        md_path = f"{folder}/quiz.md"
        with open(md_path, "w", encoding="utf-8") as f:
            f.write(f"# {course_topic} - Quiz\n\n")
            f.write(formatted)
            f.write("\n")

        # ── JSON sidecar ──────────────────────────────────────────────────
        json_path = f"{folder}/quiz.json"
        with open(json_path, "w", encoding="utf-8") as f:
            json.dump({"topic": course_topic, "quiz_content": formatted}, f, indent=4)

        return f"Quiz saved to {md_path} (and {json_path})"
    except Exception as e:
        return f"Failed to save quiz: {str(e)}"