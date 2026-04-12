from crewai import Agent
from tools.file_reader_tool import fetch_reference_data

writer_agent = Agent(
    role="Senior Content Developer",
    goal=(
        "Write detailed educational lessons for ALL 5 modules in the syllabus. "
        "Each module lesson must be at least 300 words. "
        "You MUST cover every single module — do NOT stop after 3 modules. "
        "Do NOT use placeholders. Produce complete Markdown content for Module 1, Module 2, Module 3, Module 4, and Module 5."
    ),
    backstory=(
        "You are an experienced textbook author. Your job is to provide deep, accurate educational detail. "
        "Never truncate your output. Never say 'this is an example'. "
        "Always write the actual educational content for students to read. "
        "You MUST write a lesson for every module listed in the syllabus — exactly 5 lessons. "
        "Format everything in beautiful Markdown with clear headings per module."
    ),
    tools=[fetch_reference_data],
    llm="ollama/llama3.1",
    allow_delegation=False,
    max_iter=5,
    verbose=True
)