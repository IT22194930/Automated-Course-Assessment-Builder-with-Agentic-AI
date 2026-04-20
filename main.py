import os
from pathlib import Path
from crewai import Crew, Process, Task
from agents.planner import planner_agent
from agents.writer import writer_agent
from agents.examiner import examiner_agent
from agents.auditor import auditor_agent
from tools.pdf_export_tool import compile_final_report

# Pre-create the output directory so file writes never fail
OUTPUT_DIR = "./data/cloud_computing_fundamentals"
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Task 1: Curriculum Design [cite: 17]
task_planner = Task(
    description="Design a 5-module syllabus for the topic: {topic}. Create the folder first.",
    expected_output="A Markdown list of 5 module titles with 2 learning objectives each.",
    agent=planner_agent,
    output_file=f"{OUTPUT_DIR}/syllabus.md"
)

# Task 2: Content Writing [cite: 20]
task_writer = Task(
    description=(
        "Using the 5-module syllabus provided by the planner, write a detailed educational lesson "
        "for EACH of the 5 modules. "
        "Requirements:\n"
        "- EXACTLY 5 lessons, one per module\n"
        "- Each lesson must be at least 300 words\n"
        "- Use ## Module N: Title as heading for each lesson\n"
        "- Do NOT stop after 3 modules. Cover Module 1, Module 2, Module 3, Module 4, and Module 5.\n"
        "- Do NOT use placeholders; write real educational content."
    ),
    expected_output=(
        "Full lesson text in Markdown format with exactly 5 sections (one per module), "
        "each at least 300 words, using '## Module N:' headings."
    ),
    agent=writer_agent,
    context=[task_planner],  # Preserving context from Agent 1
    output_file=f"{OUTPUT_DIR}/lessons.md"
)

# Task 3: Assessment Generation
task_examiner = Task(
    description=(
        "Using the lessons produced by the writer, create a multiple-choice quiz. "
        "Requirements:\n"
        "- EXACTLY 3 questions for EACH of the 5 modules = 15 questions total\n"
        "- Group questions by module with a '## Module N Quiz' heading\n"
        "- Every question must have options A, B, C, D and one clearly marked Correct Answer\n"
        "- Do NOT stop after 3 questions total. You must produce 15 questions across all 5 modules."
    ),
    expected_output=(
        "A Markdown document containing 15 MCQ questions (3 per module) grouped by module. "
        "Each question has 4 options (A-D) and a Correct Answer line."
    ),
    agent=examiner_agent,
    context=[task_writer],
    output_file=f"{OUTPUT_DIR}/quiz.md"
)

# Task 4: QA Review (auditor writes summary; report is compiled by code)
task_auditor = Task(
    description=(
        "Review the course materials and write a concise quality-review summary in Markdown. "
        "Your summary must cover:\n"
        "1. Overall course structure assessment\n"
        "2. Lesson quality observations\n"
        "3. Quiz coverage and correctness notes\n"
        "Output ONLY clean Markdown prose - no JSON, no function calls, no code blocks."
    ),
    expected_output=(
        "A concise Markdown quality-review summary covering course structure, "
        "lesson quality, and quiz coverage."
    ),
    agent=auditor_agent,
    context=[task_planner, task_writer, task_examiner],
    output_file=f"{OUTPUT_DIR}/audit_summary.md"
)

# Orchestration
course_crew = Crew(
    agents=[planner_agent, writer_agent, examiner_agent, auditor_agent],
    tasks=[task_planner, task_writer, task_examiner, task_auditor],
    process=Process.sequential,  # Pipeline model [cite: 17]
    verbose=True  # Observability [cite: 21]
)

if __name__ == "__main__":
    result = course_crew.kickoff(inputs={'topic': 'Cloud Computing Fundamentals'})

    # Deterministically compile the final report from source files
    report_path = compile_final_report(
        topic="Cloud Computing Fundamentals",
        out_dir=OUTPUT_DIR
    )
    print("\n\n########################")
    print("## FINAL SYSTEM OUTPUT ##")
    print("########################\n")
    print(f"Final report saved at: {report_path}")
    print(result)
