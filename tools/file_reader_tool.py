import os
from crewai.tools import tool

@tool("fetch_reference_data")
def fetch_reference_data(file_path: str) -> str:
    """
    Reads local reference files. If file doesn't exist, returns a 
    general educational prompt to help the agent generate content.
    """
    if os.path.exists(file_path):
        with open(file_path, 'r', encoding='utf-8') as f:
            return f.read()
    return "Reference file not found. Please use your internal knowledge to write accurate content."