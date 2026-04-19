"""
FastAPI backend — Automated Course Assessment Builder
Supports:
  • Full pipeline run (POST /api/generate)
  • Step-by-step individual agent runs
      POST /api/step/syllabus
      POST /api/step/lessons
      POST /api/step/quiz
      POST /api/step/report
  • Status & outputs
      GET  /api/status         — full pipeline status
      GET  /api/step/status    — per-step status map
      GET  /api/outputs        — all file contents
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


def _run_quiz(topic: str):
    """Run only the Examiner agent, injecting lessons from file."""
    _set_step_status("quiz", "running")
    try:
        from crewai import Crew, Process, Task
        from agents.examiner import examiner_agent

        out_dir = _output_dir(topic)
        lessons = _read_file(f"{out_dir}/lessons.md")

        task = Task(
            description=(
                f"Here are the lessons for '{topic}':\n\n{lessons}\n\n"
                "Create a multiple-choice quiz from these lessons.\n"
                "Requirements:\n"
                "- EXACTLY 3 questions for EACH of the 5 modules = 15 questions total\n"
                "- Group questions by module with a '## Module N Quiz' heading\n"
                "- Every question must have options A, B, C, D and one clearly marked Correct Answer\n"
                "- Do NOT stop after 3 questions. You must produce 15 questions across all 5 modules."
            ),
            expected_output=(
                "A Markdown document with 15 MCQ questions (3 per module) grouped by module. "
                "Each question has 4 options (A-D) and a Correct Answer line."
            ),
            agent=examiner_agent,
            output_file=f"{out_dir}/quiz.md",
        )
        Crew(agents=[examiner_agent], tasks=[task],
             process=Process.sequential, verbose=True).kickoff(inputs={"topic": topic})
        _set_step_status("quiz", "done")
    except Exception as e:
        _set_step_status("quiz", "error", str(e))


def _run_report(topic: str):
    """Run only the Auditor agent, injecting all previous files."""
    _set_step_status("report", "running")
    try:
        from crewai import Crew, Process, Task
        from agents.auditor import auditor_agent

        out_dir = _output_dir(topic)
        syllabus = _read_file(f"{out_dir}/syllabus.md")
        lessons  = _read_file(f"{out_dir}/lessons.md")
        quiz     = _read_file(f"{out_dir}/quiz.md")

        task = Task(
            description=(
                f"Review the following course materials for '{topic}' and compile them into "
                "a single comprehensive Markdown document.\n\n"
                f"**SYLLABUS:**\n{syllabus}\n\n"
                f"**LESSONS:**\n{lessons}\n\n"
                f"**QUIZ:**\n{quiz}\n\n"
                "The final document must include:\n"
                "1. A '# Course Title' heading\n"
                "2. A '## Syllabus' section listing all 5 modules\n"
                "3. A '## Lessons' section with all 5 detailed lessons\n"
                "4. A '## Assessment' section with all 15 MCQ questions grouped by module\n"
                "Output ONLY clean Markdown — no JSON, no function call syntax, no code blocks.\n"
                f"Then call the generate_final_report tool with this compiled content and course_topic='{topic}' to save it."
            ),
            expected_output=(
                "A single well-structured Markdown document containing the complete course: "
                "syllabus, 5 lessons, and 15 quiz questions — all in clean Markdown format."
            ),
            agent=auditor_agent,
            output_file=f"{out_dir}/final_report.md",
        )
        Crew(agents=[auditor_agent], tasks=[task],
             process=Process.sequential, verbose=True).kickoff(inputs={"topic": topic})
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

    for i, (agent_name, runner) in enumerate(step_runners):
        with _lock:
            pipeline_state["current_step"] = i
            pipeline_state["current_agent"] = agent_name
            pipeline_state["progress"] = int((i / 4) * 100)
            for j, s in enumerate(pipeline_state["steps"]):
                s["status"] = "done" if j < i else ("running" if j == i else "waiting")

        runner(topic)  # Run single agent step

        # If a step errored, abort pipeline
        if step_states[["syllabus","lessons","quiz","report"][i]]["status"] == "error":
            err = step_states[["syllabus","lessons","quiz","report"][i]]["error"]
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
        "syllabus":     _read_file(str(base / "syllabus.md")),
        "lessons":      _read_file(str(base / "lessons.md")),
        "quiz":         _read_file(str(base / "quiz.md")),
        "final_report": _read_file(str(base / "final_report.md")),
    }

# ── Outputs ───────────────────────────────────────────────────────────────────
@app.get("/api/outputs")
def outputs():
    topic = current_topic["value"] or pipeline_state.get("topic", "")
    if not topic:
        return {"syllabus": "", "lessons": "", "quiz": "", "final_report": ""}
    base = _output_dir(topic)
    return {
        "syllabus":     _read_file(f"{base}/syllabus.md"),
        "lessons":      _read_file(f"{base}/lessons.md"),
        "quiz":         _read_file(f"{base}/quiz.md"),
        "final_report": _read_file(f"{base}/final_report.md"),
    }

@app.get("/")
def root():
    return {"message": "Course Assessment Builder API running."}
