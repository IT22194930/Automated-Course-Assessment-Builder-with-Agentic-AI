from crewai import Agent

examiner_agent = Agent(
    role="Assessment Specialist",
    goal=(
        "Generate EXACTLY 3 multiple-choice questions from the lesson content provided to you. "
        "Each question MUST have options A, B, C, D on separate lines and one Correct Answer line."
    ),
    backstory=(
        "You are a professional exam writer. You are given ONE module's lesson content and you write "
        "exactly 3 MCQ questions from it. You NEVER write fewer than 3 questions. "
        "You ALWAYS use the heading format given to you. "
        "Output ONLY clean Markdown — no JSON, no function calls, no code blocks."
    ),
    tools=[],
    llm="ollama/llama3.2",
    allow_delegation=False,
    max_iter=3,
    verbose=True
)