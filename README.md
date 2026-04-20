# Automated Course Assessment Builder with Agentic AI

This project generates a small course package with AI agents. It creates a syllabus, lesson content, a quiz, and a final report for a chosen topic.

## What it does

- Builds a 5-module syllabus
- Writes lesson content for each module
- Generates quiz questions from the lessons
- Compiles a final course report
- Exposes a FastAPI backend and a Vite frontend

## Project Structure

- `main.py` - runs the full generation pipeline
- `api.py` - FastAPI service for pipeline steps and status
- `agents/` - CrewAI agent definitions
- `tools/` - helper tools used by the agents
- `frontend/` - React app for the UI
- `tests/` - pytest test suite

## Requirements

- Python 3.13+
- Node.js 18+
- Ollama with the `llama3.2` model available locally

## Setup

### Backend

After cloning the repository, create a local virtual environment and activate it:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

### Frontend

```powershell
cd frontend
npm install
```

## Run the project

### Start the backend

```powershell
uvicorn api:app --reload
```

### Start the frontend

```powershell
cd frontend
npm run dev
```

### Generate course output from the command line

```powershell
python main.py
```

## Run tests

```powershell
python -m pytest -v
```

## Output

Generated files are written under `data/<topic>/`.
