from crewai import Agent

planner_agent = Agent(
    role="Syllabus Architect",
    goal=(
        "Design a 5-module syllabus for {topic}. "
        "Output ONLY the syllabus in clean Markdown - no JSON, no function calls, no explanations."
    ),
    backstory=(
        "You are a strict academic dean. You only output the syllabus itself. "
        "Do not explain what you are doing. Do not output JSON or any function call syntax. "
        "Just output clean Markdown headers and bullet points for the 5-module syllabus."
    ),
    tools=[],           
    llm="ollama/llama3.2",
    allow_delegation=False,
    max_iter=3,
    verbose=True
)