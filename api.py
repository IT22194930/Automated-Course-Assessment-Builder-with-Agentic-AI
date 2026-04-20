"""
FastAPI backend - Automated Course Assessment Builder
Supports:
  • Full pipeline run (POST /api/generate)
  • Step-by-step individual agent runs
      POST /api/step/syllabus
      POST /api/step/lessons
      POST /api/step/quiz
      POST /api/step/report
  • Status & outputs
      GET  /api/status         - full pipeline status
      GET  /api/step/status    - per-step status map
      GET  /api/outputs        - all file contents
"""

import os
import threading
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="Course Assessment Builder API")

# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174",
                   "http://127.0.0.1:5173", "http://127.0.0.1:5174"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Shared state ──────────────────────────────────────────────────────────────
_lock = threading.Lock()

# Stop flag: set to True to request a graceful abort between agent steps
_stop_requested = {"value": False}

# Full-pipeline state (for /api/generate)
pipeline_state = {
    "status": "idle",
    "current_step": 0,
    "current_agent": "",
    "progress": 0,
    "topic": "",
    "error": None,
    "steps": [
        {"id": 0, "name": "Syllabus Architect",      "role": "Curriculum Design",    "status": "waiting"},
        {"id": 1, "name": "Senior Content Developer", "role": "Content Writing",      "status": "waiting"},
        {"id": 2, "name": "Assessment Specialist",   "role": "Quiz Generation",      "status": "waiting"},
        {"id": 3, "name": "Quality Assurance Lead",  "role": "Audit & Final Report", "status": "waiting"},
    ],
}

# Per-step state (for /api/step/*)
step_states = {
    "syllabus": {"status": "idle", "error": None},
    "lessons":  {"status": "idle", "error": None},
    "quiz":     {"status": "idle", "error": None},
    "report":   {"status": "idle", "error": None},
}

current_topic = {"value": ""}


# ── Helpers ───────────────────────────────────────────────────────────────────
def _slug(topic: str) -> str:
    return topic.strip().replace(" ", "_").lower()

def _output_dir(topic: str) -> str:
    return f"./data/{_slug(topic)}"

def _read_file(path: str) -> str:
    p = Path(path)
    return p.read_text(encoding="utf-8") if p.exists() else ""

def _set_step_status(step: str, status: str, error=None):
    with _lock:
        step_states[step]["status"] = status
        step_states[step]["error"] = error

# ── Disk-based state reconstruction ──────────────────────────────────────────
# Rebuilds step_states and current_topic from files on disk so that a
# hot-reload / server restart never loses previously generated content.
_STEP_FILES = {
    "syllabus": "syllabus.md",
    "lessons":  "lessons.md",
    "quiz":     "quiz.md",
    "report":   "final_report.md",
}

def _reconstruct_step_states(topic: str):
    """Given a topic slug-folder, mark each step 'done' if its file exists."""
    base = _output_dir(topic)
    with _lock:
        for step, filename in _STEP_FILES.items():
            # Only update if the step is not actively running
            if step_states[step]["status"] not in ("running",):
                exists = Path(f"{base}/{filename}").exists()
                if exists:
                    step_states[step]["status"] = "done"
                    step_states[step]["error"]  = None
                elif step_states[step]["status"] != "error":
                    step_states[step]["status"] = "idle"

def _all_topics():
    """Return list of all topic slugs that have a data folder."""
    data_dir = Path("./data")
    if not data_dir.exists():
        return []
    return [d.name for d in sorted(data_dir.iterdir()) if d.is_dir()]

def _unslug(slug: str) -> str:
    """Convert folder slug back to a human-readable topic name."""
    return slug.replace("_", " ").title()

# ── On startup: restore state from the most-recently-modified topic folder ────
def _startup_restore():
    topics = _all_topics()
    if not topics:
        return
    # Pick the folder modified most recently as the "current" topic
    data_dir = Path("./data")
    latest = max(topics, key=lambda t: (data_dir / t).stat().st_mtime)
    current_topic["value"] = latest
    _reconstruct_step_states(latest)

_startup_restore()


# ── Step runners ──────────────────────────────────────────────────────────────

def _run_syllabus(topic: str):
    """Run only the Planner agent."""
    _set_step_status("syllabus", "running")
    try:
        from crewai import Crew, Process, Task
        from agents.planner import planner_agent

        out_dir = _output_dir(topic)
        os.makedirs(out_dir, exist_ok=True)

        task = Task(
            description=f"Design a 5-module syllabus for the topic: {topic}. Create the folder first.",
            expected_output="A Markdown list of 5 module titles with 2 learning objectives each.",
            agent=planner_agent,
            output_file=f"{out_dir}/syllabus.md",
        )
        Crew(agents=[planner_agent], tasks=[task],
             process=Process.sequential, verbose=True).kickoff(inputs={"topic": topic})
        _set_step_status("syllabus", "done")
    except Exception as e:
        _set_step_status("syllabus", "error", str(e))


def _run_lessons(topic: str):
    """Run only the Writer agent, injecting the syllabus from file."""
    _set_step_status("lessons", "running")
    try:
        from crewai import Crew, Process, Task
        from agents.writer import writer_agent

        out_dir = _output_dir(topic)
        syllabus = _read_file(f"{out_dir}/syllabus.md")

        task = Task(
            description=(
                f"Here is the 5-module syllabus for '{topic}':\n\n{syllabus}\n\n"
                "Using this syllabus, write a detailed educational lesson for EACH of the 5 modules.\n"
                "Requirements:\n"
                "- EXACTLY 5 lessons, one per module\n"
                "- Each lesson must be at least 300 words\n"
                "- Use ## Module N: Title as heading for each lesson\n"
                "- Do NOT stop after 3 modules. Cover Module 1 through 5.\n"
                "- Do NOT use placeholders; write real educational content."
            ),
            expected_output=(
                "Full lesson text in Markdown with exactly 5 sections (one per module), "
                "each at least 300 words, using '## Module N:' headings."
            ),
            agent=writer_agent,
            output_file=f"{out_dir}/lessons.md",
        )
        Crew(agents=[writer_agent], tasks=[task],
             process=Process.sequential, verbose=True).kickoff(inputs={"topic": topic})
        _set_step_status("lessons", "done")
    except Exception as e:
        _set_step_status("lessons", "error", str(e))


def _extract_module_text(lessons_md: str, module_num: int) -> str:
    """
    Extract the text of a single module from the combined lessons Markdown.
    Looks for '## Module N' headings and slices until the next '## Module' heading.
    """
    lines = lessons_md.splitlines()
    start = None
    end = len(lines)
    for i, line in enumerate(lines):
        # Match '## Module N' (case-insensitive, with or without colon)
        if line.strip().lower().startswith(f"## module {module_num}"):
            start = i
        elif start is not None and i > start:
            # New ## Module heading marks the next section
            if line.strip().lower().startswith("## module ") and not line.strip().lower().startswith(f"## module {module_num}"):
                end = i
                break
    if start is None:
        return ""
    return "\n".join(lines[start:end]).strip()


def _run_quiz(topic: str):
    """
    Run the Examiner agent ONCE PER MODULE (5 times total).
    Each call generates exactly 3 MCQs for one module.
    Results are concatenated into quiz.md.
    """
    _set_step_status("quiz", "running")
    try:
        from crewai import Crew, Process, Task
        from agents.examiner import examiner_agent

        out_dir = _output_dir(topic)
        lessons = _read_file(f"{out_dir}/lessons.md")

        all_quiz_sections: list[str] = []

        for module_num in range(1, 6):   # Modules 1 – 5
            # Extract just this module's lesson content
            module_text = _extract_module_text(lessons, module_num)
            if not module_text:
                # Fallback: pass the full lessons and specify the module number
                module_text = lessons
                context_note = (
                    f"Focus ONLY on Module {module_num} content from the lessons below."
                )
            else:
                context_note = f"The lesson content for Module {module_num} is provided below."

            task = Task(
                description=(
                    f"{context_note}\n\n"
                    f"{module_text}\n\n"
                    f"Using ONLY the Module {module_num} content above, write EXACTLY 3 multiple-choice questions.\n"
                    "Format requirements (follow EXACTLY):\n"
                    f"## Module {module_num} Quiz\n"
                    "\n"
                    "1. [Question text]\n"
                    "   A) [Option A]\n"
                    "   B) [Option B]\n"
                    "   C) [Option C]\n"
                    "   D) [Option D]\n"
                    "\n"
                    "   Correct Answer: [Letter]) [Answer text]\n"
                    "\n"
                    "2. [Question text]\n"
                    "   A) ...\n"
                    "   ... (same pattern)\n"
                    "\n"
                    "3. [Question text]\n"
                    "   A) ...\n"
                    "   ... (same pattern)\n"
                    "\n"
                    "Output ONLY the 3 questions in the format above. No JSON, no code blocks, no extra commentary."
                ),
                expected_output=(
                    f"A '## Module {module_num} Quiz' heading followed by exactly 3 MCQ questions, "
                    "each with options A-D on separate lines and a 'Correct Answer:' line."
                ),
                agent=examiner_agent,
            )

            crew = Crew(
                agents=[examiner_agent],
                tasks=[task],
                process=Process.sequential,
                verbose=True,
            )
            result = crew.kickoff(inputs={"topic": topic})

            # crew.kickoff returns a CrewOutput object; get the raw string
            section_text = str(result).strip()
            # Ensure the heading is present even if the LLM dropped it
            if not section_text.startswith(f"## Module {module_num}"):
                section_text = f"## Module {module_num} Quiz\n\n" + section_text

            all_quiz_sections.append(section_text)

        # Write all 5 modules into one quiz.md
        full_quiz = "\n\n---\n\n".join(all_quiz_sections)
        quiz_path = Path(out_dir) / "quiz.md"
        quiz_path.write_text(full_quiz.strip() + "\n", encoding="utf-8")

        _set_step_status("quiz", "done")
    except Exception as e:
        _set_step_status("quiz", "error", str(e))


def _run_report(topic: str):
    """Run the Auditor agent for QA review, then compile the final report from source files."""
    _set_step_status("report", "running")
    try:
        from crewai import Crew, Process, Task
        from agents.auditor import auditor_agent
        from tools.pdf_export_tool import compile_final_report

        out_dir = _output_dir(topic)
        syllabus = _read_file(f"{out_dir}/syllabus.md")
        lessons  = _read_file(f"{out_dir}/lessons.md")
        quiz     = _read_file(f"{out_dir}/quiz.md")

        # Step 1 - Auditor writes a quality-review summary (no tool call)
        task = Task(
            description=(
                f"Review the following course materials for '{topic}' and write a concise "
                "quality-review summary in Markdown.\n\n"
                f"**SYLLABUS:**\n{syllabus}\n\n"
                f"**LESSONS (first 1000 chars):**\n{lessons[:1000]}\n\n"
                f"**QUIZ (first 800 chars):**\n{quiz[:800]}\n\n"
                "Your QA summary must cover:\n"
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
            output_file=f"{out_dir}/audit_summary.md",
        )
        Crew(agents=[auditor_agent], tasks=[task],
             process=Process.sequential, verbose=True).kickoff(inputs={"topic": topic})

        # Step 2 - Deterministically assemble final_report.md from source files
        result = compile_final_report(topic=topic, out_dir=out_dir)
        if result.startswith("Error"):
            _set_step_status("report", "error", result)
        else:
            _set_step_status("report", "done")
    except Exception as e:
        _set_step_status("report", "error", str(e))


# ── Full-pipeline runner (fixes the status bug by NOT pre-looping steps) ──────
def _run_full_pipeline(topic: str):
    from crewai import Crew, Process, Task
    from agents.planner import planner_agent
    from agents.writer import writer_agent
    from agents.examiner import examiner_agent
    from agents.auditor import auditor_agent

    out_dir = _output_dir(topic)
    os.makedirs(out_dir, exist_ok=True)

    step_runners = [
        ("Syllabus Architect",      _run_syllabus),
        ("Senior Content Developer", _run_lessons),
        ("Assessment Specialist",   _run_quiz),
        ("Quality Assurance Lead",  _run_report),
    ]
    step_keys = ["syllabus", "lessons", "quiz", "report"]

    for i, (agent_name, runner) in enumerate(step_runners):
        # ── Check stop flag BEFORE starting each step ──────────────────────
        with _lock:
            if _stop_requested["value"]:
                pipeline_state["status"] = "stopped"
                pipeline_state["current_agent"] = "Stopped by user"
                pipeline_state["error"] = "Pipeline stopped by user."
                for j in range(i, len(pipeline_state["steps"])):
                    pipeline_state["steps"][j]["status"] = "waiting"
                _stop_requested["value"] = False
                return

        with _lock:
            pipeline_state["current_step"] = i
            pipeline_state["current_agent"] = agent_name
            pipeline_state["progress"] = int((i / 4) * 100)
            for j, s in enumerate(pipeline_state["steps"]):
                s["status"] = "done" if j < i else ("running" if j == i else "waiting")

        runner(topic)  # Run single agent step

        # If a step errored, abort pipeline
        if step_states[step_keys[i]]["status"] == "error":
            err = step_states[step_keys[i]]["error"]
            with _lock:
                pipeline_state["status"] = "error"
                pipeline_state["error"] = err
                pipeline_state["steps"][i]["status"] = "error"
            return

    with _lock:
        for s in pipeline_state["steps"]:
            s["status"] = "done"
        pipeline_state["status"] = "done"
        pipeline_state["progress"] = 100
        pipeline_state["current_agent"] = "Complete"
        _stop_requested["value"] = False


# ── Models ────────────────────────────────────────────────────────────────────
class GenerateRequest(BaseModel):
    topic: str


# ── Full-pipeline routes ──────────────────────────────────────────────────────
@app.post("/api/generate")
def generate(req: GenerateRequest):
    with _lock:
        if pipeline_state["status"] == "running":
            raise HTTPException(status_code=409, detail="Pipeline already running.")
        pipeline_state.update({
            "status": "running", "topic": req.topic, "error": None,
            "progress": 0, "current_step": 0,
            "current_agent": pipeline_state["steps"][0]["name"],
        })
        for s in pipeline_state["steps"]:
            s["status"] = "waiting"
        pipeline_state["steps"][0]["status"] = "running"
        step_states.update({k: {"status": "idle", "error": None} for k in step_states})
        current_topic["value"] = req.topic

    threading.Thread(target=_run_full_pipeline, args=(req.topic,), daemon=True).start()
    return {"message": "Pipeline started", "topic": req.topic}


@app.get("/api/status")
def get_status():
    with _lock:
        return dict(pipeline_state)


@app.post("/api/stop")
def stop_pipeline():
    """Request the full pipeline to abort after the current agent step finishes."""
    with _lock:
        if pipeline_state["status"] != "running":
            raise HTTPException(status_code=400, detail="Pipeline is not running.")
        _stop_requested["value"] = True
        # Reflect stop-pending in status so the UI can show it immediately
        pipeline_state["error"] = "Stop requested - waiting for current agent to finish…"
    return {"message": "Stop requested. Pipeline will halt after the current agent finishes."}


@app.post("/api/step/stop")
def stop_step():
    """
    Mark the currently-running step as 'stopped'.
    Because CrewAI tasks run in a blocking thread we cannot kill them mid-run,
    but we flip the status so the UI unblocks and the step can be re-run.
    """
    with _lock:
        for key, state in step_states.items():
            if state["status"] == "running":
                step_states[key]["status"] = "idle"
                step_states[key]["error"] = "Stopped by user."
        # Also set the stop flag in case the full-pipeline runner is active
        _stop_requested["value"] = True
    return {"message": "Stop requested for running step."}


# ── Step-by-step routes ────────────────────────────────────────────────────────
def _check_not_running(step: str):
    if step_states[step]["status"] == "running":
        raise HTTPException(status_code=409, detail=f"Step '{step}' is already running.")

@app.post("/api/step/syllabus")
def step_syllabus(req: GenerateRequest):
    _check_not_running("syllabus")
    current_topic["value"] = req.topic
    out_dir = _output_dir(req.topic)
    os.makedirs(out_dir, exist_ok=True)
    threading.Thread(target=_run_syllabus, args=(req.topic,), daemon=True).start()
    return {"message": "Syllabus generation started", "topic": req.topic}

@app.post("/api/step/lessons")
def step_lessons(req: GenerateRequest):
    _check_not_running("lessons")
    if step_states["syllabus"]["status"] != "done":
        raise HTTPException(status_code=400, detail="Syllabus must be generated first.")
    threading.Thread(target=_run_lessons, args=(req.topic,), daemon=True).start()
    return {"message": "Lessons generation started"}

@app.post("/api/step/quiz")
def step_quiz(req: GenerateRequest):
    _check_not_running("quiz")
    if step_states["lessons"]["status"] != "done":
        raise HTTPException(status_code=400, detail="Lessons must be generated first.")
    threading.Thread(target=_run_quiz, args=(req.topic,), daemon=True).start()
    return {"message": "Quiz generation started"}

@app.post("/api/step/report")
def step_report(req: GenerateRequest):
    _check_not_running("report")
    if step_states["quiz"]["status"] != "done":
        raise HTTPException(status_code=400, detail="Quiz must be generated first.")
    threading.Thread(target=_run_report, args=(req.topic,), daemon=True).start()
    return {"message": "Report generation started"}

@app.get("/api/step/status")
def get_step_status(topic: str = None):
    # If caller specifies a topic slug, switch context and reconstruct from disk
    if topic:
        current_topic["value"] = topic
        _reconstruct_step_states(topic)
    elif current_topic["value"]:
        _reconstruct_step_states(current_topic["value"])
    with _lock:
        return {
            "topic": current_topic["value"],
            "steps": dict(step_states),
        }

@app.get("/api/topics")
def get_topics():
    """Return all generated topics with per-step completion flags."""
    topics = _all_topics()
    result = []
    for slug in topics:
        base = Path("./data") / slug
        result.append({
            "slug":    slug,
            "label":   _unslug(slug),
            "syllabus": (base / "syllabus.md").exists(),
            "lessons":  (base / "lessons.md").exists(),
            "quiz":     (base / "quiz.md").exists(),
            "report":   (base / "final_report.md").exists(),
        })
    return {"topics": result}

@app.get("/api/outputs/{topic_slug}")
def outputs_by_topic(topic_slug: str):
    """Return file contents for a specific topic slug."""
    base = Path("./data") / topic_slug
    if not base.exists():
        raise HTTPException(status_code=404, detail=f"Topic '{topic_slug}' not found.")
    return {
        "syllabus":      _read_file(str(base / "syllabus.md")),
        "lessons":       _read_file(str(base / "lessons.md")),
        "quiz":          _read_file(str(base / "quiz.md")),
        "final_report":  _read_file(str(base / "final_report.md")),
        "audit_summary": _read_file(str(base / "audit_summary.md")),
    }

# ── Outputs ───────────────────────────────────────────────────────────────────
@app.get("/api/outputs")
def outputs():
    topic = current_topic["value"] or pipeline_state.get("topic", "")
    if not topic:
        return {"syllabus": "", "lessons": "", "quiz": "", "final_report": "", "audit_summary": ""}
    base = _output_dir(topic)
    return {
        "syllabus":      _read_file(f"{base}/syllabus.md"),
        "lessons":       _read_file(f"{base}/lessons.md"),
        "quiz":          _read_file(f"{base}/quiz.md"),
        "final_report":  _read_file(f"{base}/final_report.md"),
        "audit_summary": _read_file(f"{base}/audit_summary.md"),
    }

@app.get("/")
def root():
    return {"message": "Course Assessment Builder API running."}
