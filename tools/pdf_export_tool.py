import os
from crewai.tools import tool

@tool("generate_final_report")
def generate_final_report(content: str, course_topic: str) -> str:
    """
    Merges all course materials into a final Markdown report.
    
    Args:
        content (str): The full compiled course content.
        course_topic (str): Name of the course for the filename.
        
    Returns:
        str: Path to the generated report.
    """
    try:
        file_name = f"./data/{course_topic.replace(' ', '_').lower()}/final_report.md"
        with open(file_name, 'w', encoding='utf-8') as f:
            f.write(content)
        return f"Final course report generated at: {file_name}"
    except Exception as e:
        return f"Error generating final report: {str(e)}"