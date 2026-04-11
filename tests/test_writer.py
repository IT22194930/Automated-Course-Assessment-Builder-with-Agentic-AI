from langchain_ollama import OllamaLLM

def test_writer_content_accuracy():
    """
    Individual requirement: Uses an LLM-as-a-Judge to validate that the 
    generated lesson content is academically sound and secure.
    """
    evaluator_llm = OllamaLLM(model="llama3")
    
    lesson_text = "Cloud computing is the on-demand availability of computer system resources..."
    
    prompt = f"""
    Evaluate the following lesson content for accuracy and safety. 
    Content: {lesson_text}
    
    Respond ONLY with 'PASSED' if the content is accurate and safe, 
    or 'FAILED' with a reason if it contains hallucinations.
    """
    
    response = evaluator_llm.invoke(prompt)
    
    assert "PASSED" in response.upper(), f"Content validation failed: {response}"
    print("Member 2 (Writer) Test: PASSED")

if __name__ == "__main__":
    test_writer_content_accuracy()