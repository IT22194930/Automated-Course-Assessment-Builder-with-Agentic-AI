from crewai import Agent
from tools.folder_tool import create_course_directory

planner_agent = Agent(
    role="Syllabus Architect",
    goal="Design a 5-module syllabus for {topic}. Use the tool to create the folder first.",
    backstory="""You are a strict academic dean. You only output the syllabus itself. 
    Do not explain what you are doing. Do not output JSON. Just output Markdown headers and bullets.""",
    tools=[create_course_directory],
    llm="ollama/llama3.1",
    allow_delegation=False,
    max_iter=5,
    verbose=True
)