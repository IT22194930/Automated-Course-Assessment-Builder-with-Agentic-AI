from crewai import Agent
from langchain_ollama import OllamaLLM
from tools.file_reader_tool import fetch_reference_data

writer_agent = Agent(
    role="Senior Content Developer",
    goal="Write comprehensive lesson notes for each module provided by the architect.",
    backstory="You are a professional writer specialized in creating clear, engaging educational Markdown content.",
    tools=[fetch_reference_data],
    llm=OllamaLLM(model="llama3"),
    verbose=True
)