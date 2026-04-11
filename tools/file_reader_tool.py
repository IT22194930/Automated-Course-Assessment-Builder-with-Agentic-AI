import os
from crewai.tools import tool

@tool("fetch_reference_data")
def fetch_reference_data(file_path: str) -> str:
    """
    Reads local educational reference materials to ground the agent's content generation.
    
    Args:
        file_path (str): The local path to the reference text file.
        
    Returns:
        str: The content of the file or a descriptive error message.
    """
    if not os.path.isfile(file_path):
        return f"Error: Reference file '{file_path}' not found locally."
    
    try:
        with open(file_path, 'r', encoding='utf-8') as file:
            return file.read()
    except Exception as e:
        return f"An error occurred while reading the file: {str(e)}"