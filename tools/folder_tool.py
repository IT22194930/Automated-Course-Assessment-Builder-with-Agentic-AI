import os
from crewai.tools import tool

@tool("create_course_directory")
def create_course_directory(topic_name: str) -> str:
    """
    Creates a dedicated local directory for the course materials.
    """
    try:
        # Create a clean folder name
        folder_name = topic_name.replace(' ', '_').lower()
        folder_path = os.path.join("./data", folder_name)
        os.makedirs(folder_path, exist_ok=True)
        return f"Directory created at: {folder_path}"
    except Exception as e:
        return f"Failed to create directory: {str(e)}"