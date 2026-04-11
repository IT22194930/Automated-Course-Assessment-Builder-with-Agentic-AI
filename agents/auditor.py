from crewai import Agent
from tools.pdf_export_tool import generate_final_report

auditor_agent = Agent(
    role="Quality Assurance Lead",
    goal="Verify the accuracy of all course materials and compile the final package.",
    backstory="You have a meticulous eye for formatting, spelling, and factual consistency.",
    tools=[generate_final_report],
    llm="ollama/llama3.1",
    verbose=True
)