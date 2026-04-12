import os
from crewai.tools import tool

@tool("generate_final_report")
def generate_final_report(content: str, course_topic: str) -> str:
    """
    Merges all course materials into a final Markdown report.

    The content must be a clean Markdown string containing the full course:
    syllabus, all 5 module lessons, and all 15 quiz questions. Do NOT pass
    JSON or function-call syntax — only pure Markdown text.

    Args:
        content (str): The full compiled course content in Markdown format.
        course_topic (str): Name of the course for the filename.

    Returns:
        str: Path to the generated report.
    """
    try:
        folder = f"./data/{course_topic.replace(' ', '_').lower()}"
        os.makedirs(folder, exist_ok=True)
        file_name = f"{folder}/final_report.md"
        with open(file_name, 'w', encoding='utf-8') as f:
            f.write(content.strip())
            f.write("\n")
        return f"Final course report generated at: {file_name}"
    except Exception as e:
        return f"Error generating final report: {str(e)}"