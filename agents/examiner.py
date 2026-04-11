from crewai import Agent
from langchain_ollama import OllamaLLM
from tools.quiz_format_tool import save_quiz_structured

examiner_agent = Agent(
    role="Assessment Specialist",
    goal="Design challenging Multiple Choice Questions (MCQs) for each lesson.",
    backstory="You specialize in psychometrics and educational evaluation to ensure student understanding.",
    tools=[save_quiz_structured],
    llm=OllamaLLM(model="llama3"),
    verbose=True
)