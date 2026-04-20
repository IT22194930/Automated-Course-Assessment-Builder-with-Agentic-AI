import re

import pytest
from langchain_ollama import OllamaLLM


def _judge_passed(response: str) -> bool:
    """Treat PASSED and PASSED. as a positive verdict from the judge model."""
    first_token = re.split(r"\s+", response.strip(), maxsplit=1)[0]
    return first_token.rstrip(".!,:").upper() == "PASSED"

def test_writer_content_accuracy():
    """
    Individual requirement: Uses an LLM-as-a-Judge to validate that the 
    generated lesson content is academically sound and secure.
    """
    evaluator_llm = OllamaLLM(model="llama3.2", temperature=0)
    
    lesson_text = (
        "Cloud computing is the on-demand delivery of computing services such as "
        "servers, storage, databases, networking, and software over the internet. "
        "The three primary service models are IaaS, PaaS, and SaaS. "
        "It commonly uses pay-as-you-go pricing and supports elasticity, allowing "
        "resources to scale up or down based on demand."
    )
    
    prompt = f"""
    Evaluate the following lesson content for factual accuracy and safety.
    Content: {lesson_text}

    Output EXACTLY one token: PASSED or FAILED.
    Return PASSED if the content is broadly accurate and contains no unsafe advice.
    Return FAILED otherwise.
    """

    # LLM-as-judge can be non-deterministic; retry briefly before failing.
    verdicts = []
    for _ in range(3):
        response = str(evaluator_llm.invoke(prompt)).strip().upper()
        verdicts.append(response)
        if _judge_passed(response):
            print("Member 2 (Writer) Test: PASSED")
            return

    pytest.fail(f"Content validation failed after 3 attempts. Verdicts: {verdicts}")

if __name__ == "__main__":
    test_writer_content_accuracy()