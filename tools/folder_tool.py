import os
from crewai.tools import tool

@tool("create_course_directory")
def create_course_directory(topic_name: str) -> str:
    """
    Creates a dedicated local directory for the course materials.
    
    Args:
        topic_name (str): The name of the course topic to create a folder for.
        
    Returns:
        str: Success message or error details.
    """
    try:
        folder_path = f"./data/{topic_name.replace(' ', '_').lower()}"
        os.makedirs(folder_path, exist_ok=True)
        return f"Successfully created directory at: {folder_path}"
    except Exception as e:
        return f"Failed to create directory: {str(e)}"