from crewai import Crew, Process, Task
from agents.planner import planner_agent
from agents.writer import writer_agent
from agents.examiner import examiner_agent
from agents.auditor import auditor_agent

# Task 1: Curriculum Design [cite: 17]
task_planner = Task(
    description="Design a 5-module syllabus for the topic: {topic}. Create the folder first.",
    expected_output="A Markdown list of 5 module titles with 2 learning objectives each.",
    agent=planner_agent
)

# Task 2: Content Writing [cite: 20]
task_writer = Task(
    description="Write detailed lessons (300+ words each) for the syllabus modules.",
    expected_output="Full lesson text in Markdown format.",
    agent=writer_agent,
    context=[task_planner] # Preserving context from Agent 1
)

# Task 3: Assessment Generation
task_examiner = Task(
    description="Create a 3-question MCQ quiz for every lesson module.",
    expected_output="A structured list of questions with 4 options and 1 correct answer each.",
    agent=examiner_agent,
    context=[task_writer]
)

# Task 4: Final Audit and Saving
task_auditor = Task(
    description="Review all content for quality and export the final document.",
    expected_output="A final status message confirming the location of the exported file.",
    agent=auditor_agent,
    context=[task_planner, task_writer, task_examiner]
)

# Orchestration 
course_crew = Crew(
    agents=[planner_agent, writer_agent, examiner_agent, auditor_agent],
    tasks=[task_planner, task_writer, task_examiner, task_auditor],
    process=Process.sequential, # Pipeline model [cite: 17]
    verbose=True # Observability [cite: 21]
)

if __name__ == "__main__":
    result = course_crew.kickoff(inputs={'topic': 'Cloud Computing Fundamentals'})
    print("\n\n########################")
    print("## FINAL SYSTEM OUTPUT ##")
    print("########################\n")
    print(result)