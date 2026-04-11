import json
import os

def save_quiz_structured(quiz_text: str, course_topic: str) -> str:
    """
    Saves the generated quiz into a structured JSON file for local storage.
    
    Args:
        quiz_text (str): The raw text of the generated quiz.
        course_topic (str): The topic name used for naming the file.
        
    Returns:
        str: Confirmation of the file path where the quiz was saved.
    """
    try:
        path = f"./data/{course_topic.replace(' ', '_').lower()}/quiz.json"
        data = {"topic": course_topic, "quiz_content": quiz_text}
        with open(path, 'w') as f:
            json.dump(data, f, indent=4)
        return f"Quiz successfully saved to {path}"
    except Exception as e:
        return f"Failed to save quiz JSON: {str(e)}"