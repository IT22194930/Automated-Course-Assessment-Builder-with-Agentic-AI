from crewai import Agent
from tools.folder_tool import create_course_directory

planner_agent = Agent(
    role="Syllabus Architect",
    goal="Create a logically sequenced 5-module curriculum for {topic}.",
    backstory="You are an expert in instructional design with a focus on logical knowledge progression.",
    tools=[create_course_directory],
    llm="ollama/llama3.1",
    verbose=True
)