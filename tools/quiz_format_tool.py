import json
import os
from crewai.tools import tool

@tool("save_quiz_structured")
def save_quiz_structured(quiz_text: str, course_topic: str) -> str:
    """
    Saves the generated quiz as both a Markdown file (quiz.md) and a JSON sidecar
    for local storage.

    The quiz_text must be a Markdown-formatted string containing 3 MCQ questions
    for EACH of the 5 modules (15 questions total), grouped by module with
    '## Module N Quiz' headings. Each question must have options A-D and a
    'Correct Answer:' line.

    Args:
        quiz_text (str): The quiz formatted in Markdown (15 questions across 5 modules).
        course_topic (str): The topic name used for naming the output files.

    Returns:
        str: Confirmation of the file paths where the quiz was saved.
    """
    try:
        folder = f"./data/{course_topic.replace(' ', '_').lower()}"
        os.makedirs(folder, exist_ok=True)

        # Save as Markdown (primary output expected by the pipeline)
        md_path = f"{folder}/quiz.md"
        with open(md_path, 'w', encoding='utf-8') as f:
            f.write(f"# {course_topic} — Quiz\n\n")
            f.write(quiz_text.strip())
            f.write("\n")

        # Save as JSON sidecar for machine readability
        json_path = f"{folder}/quiz.json"
        data = {"topic": course_topic, "quiz_content": quiz_text}
        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=4)

        return f"Quiz saved to {md_path} (and {json_path})"
    except Exception as e:
        return f"Failed to save quiz: {str(e)}"