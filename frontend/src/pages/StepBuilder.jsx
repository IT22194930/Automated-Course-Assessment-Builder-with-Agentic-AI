import { useState, useEffect, useRef, useCallback } from "react";
import MarkdownViewer from "../components/MarkdownViewer";
import {
  BookOpen,
  FileText,
  ClipboardList,
  Award,
  ChevronRight,
  Sparkles,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Download,
  ArrowRight,
  Loader2,
  Search,
  Bot,
  Square,
} from "lucide-react";

// ── Step definitions ──────────────────────────────────────────────────────────
const STEPS = [
  {
    key: "syllabus",
    label: "Syllabus",
    index: 1,
    icon: <FileText size={18} />,
    Icon: FileText,
    gradient: "linear-gradient(135deg, #6366f1, #818cf8)",
    glow: "rgba(99,102,241,0.4)",
    title: "Design Syllabus",
    subtitle: "Planner Agent creates a 5-module syllabus for your topic.",
    actionLabel: "Generate Syllabus",
    outputKey: "syllabus",
    outputLabel: "syllabus.md",
    prereq: null,
    prereqLabel: null,
  },
  {
    key: "lessons",
    label: "Lessons",
    index: 2,
    icon: <BookOpen size={18} />,
    Icon: BookOpen,
    gradient: "linear-gradient(135deg, #8b5cf6, #a78bfa)",
    glow: "rgba(139,92,246,0.4)",
    title: "Write Lessons",
    subtitle:
      "Content Developer writes 300+ word lessons for each of the 5 modules.",
    actionLabel: "Generate Lessons",
    outputKey: "lessons",
    outputLabel: "lessons.md",
    prereq: "syllabus",
    prereqLabel: "Generate Syllabus first",
  },
  {
    key: "quiz",
    label: "Quiz",
    index: 3,
    icon: <ClipboardList size={18} />,
    Icon: ClipboardList,
    gradient: "linear-gradient(135deg, #ec4899, #f472b6)",
    glow: "rgba(236,72,153,0.4)",
    title: "Generate Quiz",
    subtitle: "Assessment Specialist creates 3 MCQs per module - 15 total.",
    actionLabel: "Generate Quiz",
    outputKey: "quiz",
    outputLabel: "quiz.md",
    prereq: "lessons",
    prereqLabel: "Generate Lessons first",
  },
  {
    key: "report",
    label: "Final Report",
    index: 4,
    icon: <Award size={18} />,
    Icon: Award,
    gradient: "linear-gradient(135deg, #10b981, #34d399)",
    glow: "rgba(16,185,129,0.4)",
    title: "Compile Report",
    subtitle:
      "QA Lead audits everything and compiles the final course document.",
    actionLabel: "Generate Report",
    outputKey: "final_report",
    outputLabel: "final_report.md",
    prereq: "quiz",
    prereqLabel: "Generate Quiz first",
  },
];

// ── Main component ─────────────────────────────────────────────────────────────
export default function StepBuilder() {
  const [topic, setTopic] = useState("");
  const [activeStep, setActiveStep] = useState(0);
  // Flat string map: { syllabus: 'idle'|'running'|'done'|'error', ... }
  const [stepStatuses, setStepStatuses] = useState({
    syllabus: "idle",
    lessons: "idle",
    quiz: "idle",
    report: "idle",
  });
  // Error messages per step
  const [stepErrors, setStepErrors] = useState({
    syllabus: null,
    lessons: null,
    quiz: null,
    report: null,
  });
  const [outputs, setOutputs] = useState({
    syllabus: "",
    lessons: "",
    quiz: "",
    final_report: "",
  });
  const [knownTopics, setKnownTopics] = useState([]);
  const pollRef = useRef(null);

  // Poll when any step is running
  const anyRunning = Object.values(stepStatuses).includes("running");

  const fetchAll = useCallback(async () => {
    try {
      const [statRes, outRes] = await Promise.all([
        fetch("/api/step/status"),
        fetch("/api/outputs"),
      ]);
      const statData = await statRes.json();
      const outData = await outRes.json();

      // ── Normalize: backend returns {syllabus:{status,error}, ...}
      //    Extract flat { syllabus: 'done', ... } and { syllabus: null, ... }
      const rawSteps = statData.steps || {};
      const normalizedStatuses = {};
      const normalizedErrors = {};
      for (const [key, val] of Object.entries(rawSteps)) {
        if (typeof val === "object" && val !== null) {
          normalizedStatuses[key] = val.status || "idle";
          normalizedErrors[key] = val.error || null;
        } else {
          normalizedStatuses[key] = val;
          normalizedErrors[key] = null;
        }
      }

      setStepStatuses((prev) => ({ ...prev, ...normalizedStatuses }));
      setStepErrors((prev) => ({ ...prev, ...normalizedErrors }));
      setOutputs(outData);
      if (statData.topic && !topic) setTopic(statData.topic);
    } catch (err) {
      console.error("Poll error:", err);
    }
  }, [topic]);

  // Fetch by a specific topic slug (used when user picks a known topic)
  const fetchBySlug = useCallback(async (slug) => {
    try {
      const [statRes, outRes] = await Promise.all([
        fetch(`/api/step/status?topic=${encodeURIComponent(slug)}`),
        fetch(`/api/outputs/${slug}`),
      ]);
      const statData = await statRes.json();
      const outData = await outRes.json();

      const rawSteps = statData.steps || {};
      const normalizedStatuses = {};
      const normalizedErrors = {};
      for (const [key, val] of Object.entries(rawSteps)) {
        if (typeof val === "object" && val !== null) {
          normalizedStatuses[key] = val.status || "idle";
          normalizedErrors[key] = val.error || null;
        } else {
          normalizedStatuses[key] = val;
          normalizedErrors[key] = null;
        }
      }
      setStepStatuses((prev) => ({ ...prev, ...normalizedStatuses }));
      setStepErrors((prev) => ({ ...prev, ...normalizedErrors }));
      setOutputs(outData);
    } catch (err) {
      console.error("fetchBySlug error:", err);
    }
  }, []);

  // Polling
  useEffect(() => {
    // Also load the topic list for the quick-select
    fetch("/api/topics")
      .then((r) => r.json())
      .then((d) => setKnownTopics(d.topics || []))
      .catch(() => {});

    fetchAll();
    pollRef.current = setInterval(fetchAll, 2000);
    return () => clearInterval(pollRef.current);
  }, [fetchAll]);

  async function runStep(stepKey) {
    if (!topic.trim()) return;
    // Optimistically show running state immediately (don't wait for poll)
    setStepStatuses((prev) => ({ ...prev, [stepKey]: "running" }));
    try {
      const res = await fetch(`/api/step/${stepKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: topic.trim() }),
      });
      if (!res.ok) {
        const err = await res.json();
        // Revert optimistic update and show error
        setStepStatuses((prev) => ({ ...prev, [stepKey]: "error" }));
        setStepErrors((prev) => ({
          ...prev,
          [stepKey]: err.detail || "Error starting step",
        }));
        return;
      }
      // Sync with server
      await fetchAll();
    } catch (e) {
      setStepStatuses((prev) => ({ ...prev, [stepKey]: "error" }));
      setStepErrors((prev) => ({
        ...prev,
        [stepKey]: "Could not connect to backend. Is uvicorn running?",
      }));
    }
  }

  async function stopRunningStep() {
    try {
      await fetch("/api/step/stop", { method: "POST" });
      await fetchAll();
    } catch (e) {
      console.error("Stop step error:", e);
    }
  }

  function handleDownload(key, filename) {
    const content =
      key === "final_report" ? outputs.final_report : outputs[key];
    if (!content) return;
    const blob = new Blob([content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  const step = STEPS[activeStep];
  const stepStatus = stepStatuses[step.key] || "idle";
  const prereqDone = !step.prereq || stepStatuses[step.prereq] === "done";
  const isRunning = stepStatus === "running";
  const isDone = stepStatus === "done";
  const isError = stepStatus === "error";
  const stepError = stepErrors[step.key];

  return (
    <div style={{ position: "relative", minHeight: "100vh", paddingTop: 80 }}>
      <div className="bg-mesh" />
      <div className="bg-grid" />

      <div
        style={{
          position: "relative",
          zIndex: 1,
          maxWidth: 960,
          margin: "0 auto",
          padding: "40px 24px 80px",
        }}
      >
        {/* Page title */}
        <div className="fade-in-up" style={{ marginBottom: 32 }}>
          <h1
            style={{
              fontWeight: 900,
              fontSize: "1.8rem",
              letterSpacing: "-0.02em",
              color: "#f1f5f9",
              marginBottom: 6,
            }}
          >
            Step-by-Step <span className="gradient-text">Builder</span>
          </h1>
          <p style={{ color: "#64748b", fontSize: "0.9rem" }}>
            Control each agent independently - review outputs at every stage
            before proceeding.
          </p>
        </div>

        {/* Topic input (shared) */}
        <div
          className="glass-card fade-in-up delay-100"
          style={{ padding: "20px 24px", marginBottom: 28 }}
        >
          <div
            style={{
              display: "flex",
              gap: 12,
              flexWrap: "wrap",
              alignItems: "flex-end",
            }}
          >
            <div style={{ flex: 1, minWidth: 240 }}>
              <label
                style={{
                  display: "block",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  color: "#64748b",
                  marginBottom: 6,
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                }}
              >
                Course Topic
              </label>
              <input
                id="step-topic-input"
                className="input-glow"
                type="text"
                placeholder="e.g. Cloud Computing Fundamentals"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                disabled={anyRunning}
                style={{
                  width: "100%",
                  padding: "11px 16px",
                  fontSize: "0.9rem",
                }}
              />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button
                onClick={fetchAll}
                style={{
                  padding: "11px 14px",
                  borderRadius: 10,
                  cursor: "pointer",
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  color: "#64748b",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: "0.82rem",
                }}
              >
                <RefreshCw size={14} />
                Refresh
              </button>
            </div>
          </div>

          {/* Previously generated topic quick-select */}
          {knownTopics.length > 0 && (
            <div style={{ marginTop: 14 }}>
              <p
                style={{
                  fontSize: "0.7rem",
                  fontWeight: 600,
                  color: "#334155",
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                  marginBottom: 8,
                }}
              >
                Previously Generated
              </p>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {knownTopics.map((t) => {
                  const doneCount = [
                    "syllabus",
                    "lessons",
                    "quiz",
                    "report",
                  ].filter((k) => t[k]).length;
                  const isSelected =
                    topic.trim().toLowerCase().replace(/ /g, "_") === t.slug;
                  return (
                    <button
                      key={t.slug}
                      onClick={async () => {
                        // Immediately display the label in the input
                        setTopic(t.label);
                        // Reset all step state so stale UI clears
                        setStepStatuses({
                          syllabus: "idle",
                          lessons: "idle",
                          quiz: "idle",
                          report: "idle",
                        });
                        setStepErrors({
                          syllabus: null,
                          lessons: null,
                          quiz: null,
                          report: null,
                        });
                        setOutputs({
                          syllabus: "",
                          lessons: "",
                          quiz: "",
                          final_report: "",
                        });
                        // Fetch status + outputs directly from the known slug
                        await fetchBySlug(t.slug);
                      }}
                      disabled={anyRunning}
                      style={{
                        padding: "5px 12px",
                        borderRadius: 99,
                        cursor: "pointer",
                        background: isSelected
                          ? "rgba(99,102,241,0.18)"
                          : "rgba(255,255,255,0.04)",
                        border: `1px solid ${isSelected ? "rgba(99,102,241,0.4)" : "rgba(255,255,255,0.08)"}`,
                        color: isSelected ? "#a78bfa" : "#64748b",
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 5,
                        transition: "all 0.15s",
                      }}
                    >
                      <span
                        style={{
                          display: "inline-block",
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          background:
                            doneCount === 4
                              ? "#34d399"
                              : doneCount > 0
                                ? "#f59e0b"
                                : "#475569",
                        }}
                      />
                      {t.label}
                      <span style={{ opacity: 0.5 }}>({doneCount}/4)</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div
          style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 20 }}
        >
          {/* Left: Step nav */}
          <div className="fade-in-up delay-200">
            <StepNav
              steps={STEPS}
              activeStep={activeStep}
              stepStatuses={stepStatuses}
              onSelect={setActiveStep}
            />
          </div>

          {/* Right: Step content */}
          <div className="fade-in-up delay-300">
            <div className="glass-card" style={{ overflow: "hidden" }}>
              {/* Step header */}
              <div
                style={{
                  padding: "20px 24px",
                  borderBottom: "1px solid rgba(255,255,255,0.06)",
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    flexShrink: 0,
                    background: isDone
                      ? "linear-gradient(135deg,#10b981,#34d399)"
                      : step.gradient,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: `0 4px 20px ${isDone ? "rgba(16,185,129,0.4)" : step.glow}`,
                    transition: "all 0.3s ease",
                  }}
                >
                  {isDone ? (
                    <CheckCircle size={20} color="white" />
                  ) : isRunning ? (
                    <div
                      className="spinner"
                      style={{ width: 22, height: 22 }}
                    />
                  ) : (
                    <step.Icon size={20} color="white" />
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 10 }}
                  >
                    <h2
                      style={{
                        fontWeight: 700,
                        fontSize: "1rem",
                        color: "#f1f5f9",
                      }}
                    >
                      {step.title}
                    </h2>
                    <StepBadge status={stepStatus} />
                  </div>
                  <p
                    style={{
                      fontSize: "0.78rem",
                      color: "#475569",
                      marginTop: 2,
                    }}
                  >
                    {step.subtitle}
                  </p>
                </div>
              </div>

              {/* Step body */}
              <div style={{ padding: 24 }}>
                {/* Prereq warning */}
                {!prereqDone && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "12px 16px",
                      borderRadius: 10,
                      marginBottom: 20,
                      background: "rgba(251,191,36,0.08)",
                      border: "1px solid rgba(251,191,36,0.2)",
                      color: "#fbbf24",
                      fontSize: "0.84rem",
                    }}
                  >
                    <AlertTriangle size={16} />
                    {step.prereqLabel}
                  </div>
                )}

                {/* Error box */}
                {isError && (
                  <div
                    style={{
                      padding: "12px 16px",
                      borderRadius: 10,
                      marginBottom: 20,
                      background: "rgba(239,68,68,0.08)",
                      border: "1px solid rgba(239,68,68,0.2)",
                      color: "#f87171",
                      fontSize: "0.82rem",
                    }}
                  >
                    <div
                      style={{
                        fontWeight: 700,
                        marginBottom: stepError ? 6 : 0,
                      }}
                    >
                      ✗ Step failed
                    </div>
                    {stepError && (
                      <div
                        style={{
                          fontFamily: "JetBrains Mono, monospace",
                          fontSize: "0.76rem",
                          opacity: 0.85,
                          wordBreak: "break-word",
                        }}
                      >
                        {stepError}
                      </div>
                    )}
                  </div>
                )}

                {/* Action button row */}
                <div
                  style={{
                    display: "flex",
                    gap: 10,
                    marginBottom: 24,
                    flexWrap: "wrap",
                    alignItems: "center",
                  }}
                >
                  <button
                    id={`action-btn-${step.key}`}
                    className="btn-gradient"
                    onClick={() => runStep(step.key)}
                    disabled={!topic.trim() || !prereqDone || isRunning}
                    style={{
                      padding: "12px 22px",
                      fontSize: "0.9rem",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    {isRunning ? (
                      <>
                        <div
                          className="spinner"
                          style={{ width: 16, height: 16 }}
                        />{" "}
                        Running...
                      </>
                    ) : isDone ? (
                      <>
                        <RefreshCw size={15} /> Regenerate
                      </>
                    ) : (
                      <>
                        <Sparkles size={15} /> {step.actionLabel}{" "}
                        <ArrowRight size={13} />
                      </>
                    )}
                  </button>

                  {/* Stop button - only when this step is running */}
                  {isRunning && (
                    <button
                      id={`stop-step-btn-${step.key}`}
                      onClick={stopRunningStep}
                      style={{
                        padding: "12px 18px",
                        borderRadius: 10,
                        cursor: "pointer",
                        background: "rgba(239,68,68,0.12)",
                        border: "1px solid rgba(239,68,68,0.3)",
                        color: "#f87171",
                        fontSize: "0.82rem",
                        fontWeight: 600,
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        transition: "all 0.2s ease",
                      }}
                    >
                      <Square size={14} fill="#f87171" />
                      Stop
                    </button>
                  )}

                  {isDone && (
                    <button
                      onClick={() =>
                        handleDownload(step.outputKey, step.outputLabel)
                      }
                      style={{
                        padding: "12px 18px",
                        borderRadius: 10,
                        cursor: "pointer",
                        background: "rgba(16,185,129,0.1)",
                        border: "1px solid rgba(16,185,129,0.25)",
                        color: "#34d399",
                        fontSize: "0.82rem",
                        fontWeight: 500,
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <Download size={14} />
                      Download
                    </button>
                  )}

                  {/* Navigate to next step */}
                  {isDone && activeStep < STEPS.length - 1 && (
                    <button
                      id={`next-step-btn-${step.key}`}
                      onClick={() => setActiveStep((prev) => prev + 1)}
                      style={{
                        padding: "12px 18px",
                        borderRadius: 10,
                        cursor: "pointer",
                        background: "rgba(99,102,241,0.12)",
                        border: "1px solid rgba(99,102,241,0.25)",
                        color: "#818cf8",
                        fontSize: "0.82rem",
                        fontWeight: 600,
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      Next Step <ChevronRight size={14} />
                    </button>
                  )}
                </div>

                {/* Output viewer */}
                <div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: 12,
                    }}
                  >
                    <span
                      style={{
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        color: "#334155",
                        letterSpacing: "0.05em",
                        textTransform: "uppercase",
                      }}
                    >
                      Output - {step.outputLabel}
                    </span>
                    {isDone && (
                      <span
                        style={{
                          fontSize: "0.72rem",
                          color: "#34d399",
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        <CheckCircle size={12} /> Generated
                      </span>
                    )}
                  </div>
                  <div
                    style={{
                      background: "rgba(0,0,0,0.25)",
                      border: "1px solid rgba(255,255,255,0.06)",
                      borderRadius: 12,
                      padding: "20px 22px",
                      maxHeight: 440,
                      overflowY: "auto",
                      minHeight: 120,
                    }}
                  >
                    {isRunning ? (
                      <RunningPlaceholder />
                    ) : (
                      <MarkdownViewer
                        content={
                          step.outputKey === "final_report"
                            ? outputs.final_report
                            : outputs[step.outputKey]
                        }
                        emptyLabel={`${step.title} output will appear here after generation.`}
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function StepNav({ steps, activeStep, stepStatuses, onSelect }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <p
        style={{
          fontSize: "0.7rem",
          fontWeight: 700,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "#334155",
          marginBottom: 8,
          paddingLeft: 4,
        }}
      >
        Pipeline Steps
      </p>
      {steps.map((step, i) => {
        const status = stepStatuses[step.key];
        const isActive = i === activeStep;
        const isDone = status === "done";
        const isRunning = status === "running";
        const isError = status === "error";

        return (
          <button
            key={step.key}
            id={`nav-${step.key}`}
            onClick={() => onSelect(i)}
            style={{
              width: "100%",
              padding: "12px 14px",
              borderRadius: 12,
              cursor: "pointer",
              textAlign: "left",
              background: isActive
                ? "rgba(99,102,241,0.12)"
                : "rgba(255,255,255,0.02)",
              border: `1px solid ${isActive ? "rgba(99,102,241,0.3)" : "rgba(255,255,255,0.05)"}`,
              display: "flex",
              alignItems: "center",
              gap: 10,
              transition: "all 0.2s ease",
            }}
          >
            {/* Status icon */}
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                flexShrink: 0,
                background: isDone
                  ? "linear-gradient(135deg,#10b981,#34d399)"
                  : isRunning
                    ? step.gradient
                    : isError
                      ? "rgba(239,68,68,0.2)"
                      : "rgba(255,255,255,0.06)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "0.8rem",
                boxShadow:
                  isDone || isRunning
                    ? `0 2px 10px ${isDone ? "rgba(16,185,129,0.3)" : step.glow}`
                    : "none",
              }}
            >
              {isDone ? (
                <CheckCircle size={14} color="white" />
              ) : isRunning ? (
                <div className="spinner" style={{ width: 14, height: 14 }} />
              ) : isError ? (
                <AlertTriangle size={14} color="#f87171" />
              ) : (
                <step.Icon size={14} color="rgba(255,255,255,0.45)" />
              )}
            </div>

            {/* Text */}
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: "0.82rem",
                  fontWeight: 600,
                  color: isActive ? "#a78bfa" : isDone ? "#34d399" : "#64748b",
                  transition: "color 0.2s",
                }}
              >
                {step.index}. {step.label}
              </div>
              {isRunning && (
                <div
                  style={{
                    fontSize: "0.68rem",
                    color: "#818cf8",
                    marginTop: 2,
                  }}
                >
                  Running…
                </div>
              )}
              {isDone && (
                <div
                  style={{
                    fontSize: "0.68rem",
                    color: "#34d399",
                    marginTop: 2,
                  }}
                >
                  Complete
                </div>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}

function StepBadge({ status }) {
  const map = {
    idle: { label: "Idle", cls: "badge-waiting" },
    running: { label: "Running", cls: "badge-running" },
    done: { label: "Done", cls: "badge-done" },
    error: { label: "Error", cls: "badge-error" },
  };
  const { label, cls } = map[status] || map.idle;
  return (
    <span
      className={cls}
      style={{
        fontSize: "0.68rem",
        fontWeight: 700,
        padding: "2px 8px",
        borderRadius: 99,
        letterSpacing: "0.04em",
        textTransform: "uppercase",
      }}
    >
      {status === "running" && (
        <span
          style={{
            display: "inline-block",
            width: 5,
            height: 5,
            borderRadius: "50%",
            background: "#818cf8",
            marginRight: 4,
            verticalAlign: "middle",
            animation: "pulse-anim 1.2s ease-in-out infinite",
          }}
        />
      )}
      {label}
    </span>
  );
}

function RunningPlaceholder() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 20px",
        gap: 14,
      }}
    >
      <div
        style={{
          width: 52,
          height: 52,
          borderRadius: 14,
          background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 4px 24px rgba(99,102,241,0.35)",
          animation: "pulse-anim 1.5s ease-in-out infinite",
        }}
      >
        <Bot size={26} color="white" />
      </div>
      <p style={{ color: "#6366f1", fontWeight: 600, fontSize: "0.9rem" }}>
        Agent is working…
      </p>
      <p
        style={{
          color: "#334155",
          fontSize: "0.78rem",
          textAlign: "center",
          maxWidth: 300,
        }}
      >
        The AI agent is generating content. This may take a minute. Output will
        appear here automatically.
      </p>
    </div>
  );
}
