from crewai import Agent
from tools.pdf_export_tool import generate_final_report

auditor_agent = Agent(
    role="Quality Assurance Lead",
    goal=(
        "Review all course materials for quality and compile them into ONE final Markdown document. "
        "The document MUST contain: the full syllabus, all 5 module lessons, and all 15 quiz questions. "
        "Output ONLY clean, well-structured Markdown. Do NOT output JSON or function call syntax. "
        "Call the generate_final_report tool with the complete compiled content to save the report."
    ),
    backstory=(
        "You are a meticulous Quality Assurance Lead with an expert eye for formatting, spelling, and factual consistency. "
        "You compile and validate complete educational packages. "
        "You NEVER output raw JSON or function definitions — only clean formatted Markdown. "
        "You always produce a document that includes every section: Syllabus, all module Lessons, and all Quiz questions."
    ),
    tools=[generate_final_report],
    llm="ollama/llama3.1",
    allow_delegation=False,
    max_iter=5,
    verbose=True
)