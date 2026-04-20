import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import PipelineProgress from "../components/PipelineProgress";
import {
  Sparkles,
  ArrowRight,
  BookOpen,
  ClipboardList,
  Award,
  FileText,
  Zap,
  Square,
} from "lucide-react";

// Icon components replacing emojis
const FEATURES = [
  {
    Icon: FileText,
    gradient: "linear-gradient(135deg, #6366f1, #818cf8)",
    glow: "rgba(99,102,241,0.3)",
    title: "Syllabus Architect",
    desc: "Designs a complete 5-module syllabus tailored to your topic.",
  },
  {
    Icon: BookOpen,
    gradient: "linear-gradient(135deg, #8b5cf6, #a78bfa)",
    glow: "rgba(139,92,246,0.3)",
    title: "Content Developer",
    desc: "Writes detailed, 300+ word educational lessons for every module.",
  },
  {
    Icon: ClipboardList,
    gradient: "linear-gradient(135deg, #ec4899, #f472b6)",
    glow: "rgba(236,72,153,0.3)",
    title: "Assessment Specialist",
    desc: "Generates 3 multiple-choice questions per module - 15 total.",
  },
  {
    Icon: Award,
    gradient: "linear-gradient(135deg, #10b981, #34d399)",
    glow: "rgba(16,185,129,0.3)",
    title: "QA Lead",
    desc: "Audits quality and compiles everything into a final report.",
  },
];

const DEFAULT_STATE = {
  status: "idle",
  steps: [
    {
      id: 0,
      name: "Syllabus Architect",
      role: "Curriculum Design",
      status: "waiting",
    },
    {
      id: 1,
      name: "Senior Content Developer",
      role: "Content Writing",
      status: "waiting",
    },
    {
      id: 2,
      name: "Assessment Specialist",
      role: "Quiz Generation",
      status: "waiting",
    },
    {
      id: 3,
      name: "Quality Assurance Lead",
      role: "Audit & Final Report",
      status: "waiting",
    },
  ],
  progress: 0,
  current_agent: "",
  error: null,
  topic: "",
};

export default function Home() {
  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [pipelineState, setPipelineState] = useState(DEFAULT_STATE);
  const pollRef = useRef(null);
  const navigate = useNavigate();

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const startPolling = useCallback(() => {
    stopPolling();
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch("/api/status");
        const data = await res.json();
        setPipelineState(data);
        if (
          data.status === "done" ||
          data.status === "error" ||
          data.status === "stopped"
        ) {
          stopPolling();
          setLoading(false);
          setStopping(false);
          if (data.status === "done") {
            setTimeout(() => navigate("/results"), 1200);
          }
        }
      } catch (err) {
        console.error("Polling error:", err);
      }
    }, 2000);
  }, [stopPolling, navigate]);

  // ── On mount: restore state from the server so switching tabs never resets UI ──
  useEffect(() => {
    fetch("/api/status")
      .then((r) => r.json())
      .then((data) => {
        setPipelineState(data);
        if (data.topic) setTopic(data.topic);
        // If pipeline was already running when we navigated back, resume polling
        if (data.status === "running") {
          setLoading(true);
          startPolling();
        }
      })
      .catch(() => {});

    return () => stopPolling();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleGenerate(e) {
    e.preventDefault();
    if (!topic.trim() || loading) return;

    setLoading(true);
    setStopping(false);
    setPipelineState({ ...DEFAULT_STATE, status: "running", topic });

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: topic.trim() }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Failed to start pipeline");
      }

      startPolling();
    } catch (err) {
      setLoading(false);
      setPipelineState((prev) => ({
        ...prev,
        status: "error",
        error: err.message,
      }));
    }
  }

  async function handleStop() {
    if (stopping) return;
    setStopping(true);
    try {
      await fetch("/api/stop", { method: "POST" });
    } catch {
      setStopping(false);
    }
  }

  const isRunning = pipelineState.status === "running";
  const showProgress = ["running", "done", "error", "stopped"].includes(
    pipelineState.status,
  );

  return (
    <div style={{ position: "relative", minHeight: "100vh", paddingTop: 80 }}>
      <div className="bg-mesh" />
      <div className="bg-grid" />
      <div className="orb orb-1" />
      <div className="orb orb-2" />

      <div
        style={{
          position: "relative",
          zIndex: 1,
          maxWidth: 900,
          margin: "0 auto",
          padding: "48px 24px 80px",
        }}
      >
        {/* Hero */}
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          {/* Headline */}
          <h1
            className="fade-in-up delay-100"
            style={{
              fontSize: "clamp(2.2rem, 5vw, 3.5rem)",
              fontWeight: 900,
              lineHeight: 1.1,
              letterSpacing: "-0.03em",
              color: "#f1f5f9",
              marginBottom: 20,
            }}
          >
            Build Complete Courses
            <br />
            <span className="gradient-text">with Agentic AI</span>
          </h1>

          <p
            className="fade-in-up delay-200"
            style={{
              fontSize: "1.05rem",
              color: "#64748b",
              maxWidth: 520,
              margin: "0 auto 40px",
              lineHeight: 1.7,
            }}
          >
            Enter any topic. Our multi-agent pipeline designs the syllabus,
            writes the lessons, generates quizzes, and compiles the final report
            - automatically.
          </p>

          {/* Input form */}
          <form
            id="generate-form"
            className="fade-in-up delay-300"
            onSubmit={handleGenerate}
            style={{
              display: "flex",
              gap: 12,
              maxWidth: 580,
              margin: "0 auto",
              flexWrap: "wrap",
            }}
          >
            <input
              id="topic-input"
              className="input-glow"
              type="text"
              placeholder="e.g. Cloud Computing Fundamentals"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              disabled={isRunning}
              style={{
                flex: 1,
                minWidth: 260,
                padding: "14px 18px",
                fontSize: "0.95rem",
              }}
            />
            <button
              id="generate-btn"
              type="submit"
              className="btn-gradient"
              disabled={!topic.trim() || isRunning}
              style={{
                padding: "14px 24px",
                fontSize: "0.95rem",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              {isRunning ? (
                <>
                  <div className="spinner" style={{ width: 18, height: 18 }} />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles size={17} />
                  Generate
                  <ArrowRight size={15} />
                </>
              )}
            </button>

            {/* Stop button - visible while running */}
            {isRunning && (
              <button
                id="stop-btn"
                type="button"
                onClick={handleStop}
                disabled={stopping}
                style={{
                  padding: "14px 20px",
                  borderRadius: 12,
                  cursor: stopping ? "not-allowed" : "pointer",
                  background: stopping
                    ? "rgba(239,68,68,0.06)"
                    : "rgba(239,68,68,0.12)",
                  border: "1px solid rgba(239,68,68,0.3)",
                  color: "#f87171",
                  fontSize: "0.95rem",
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  transition: "all 0.2s ease",
                }}
              >
                <Square size={15} fill="#f87171" />
                {stopping ? "Stopping…" : "Stop"}
              </button>
            )}
          </form>

          {isRunning && (
            <p
              className="fade-in-up"
              style={{
                marginTop: 16,
                fontSize: "0.82rem",
                color: "#6366f1",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
              }}
            >
              <Zap size={13} />
              Pipeline running - this may take several minutes for large topics.
            </p>
          )}
        </div>

        {/* Pipeline progress - persists even after tab switch */}
        {showProgress && <PipelineProgress pipelineState={pipelineState} />}

        {/* Feature cards */}
        {pipelineState.status === "idle" && (
          <div>
            <p
              className="fade-in-up delay-400"
              style={{
                textAlign: "center",
                fontSize: "0.82rem",
                fontWeight: 600,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "#334155",
                marginBottom: 24,
              }}
            >
              4 Specialized AI Agents
            </p>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
                gap: 16,
              }}
            >
              {FEATURES.map((f, i) => (
                <FeatureCard key={i} feature={f} delay={i * 100 + 400} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function FeatureCard({ feature, delay }) {
  const { Icon } = feature;
  return (
    <div
      className="glass-card fade-in-up"
      style={{ padding: "20px", animationDelay: `${delay}ms`, opacity: 0 }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          marginBottom: 14,
          background: feature.gradient,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: `0 4px 20px ${feature.glow}`,
        }}
      >
        <Icon size={20} color="white" />
      </div>
      <h3
        style={{
          fontWeight: 700,
          fontSize: "0.9rem",
          color: "#e2e8f0",
          marginBottom: 6,
        }}
      >
        {feature.title}
      </h3>
      <p style={{ fontSize: "0.78rem", color: "#475569", lineHeight: 1.6 }}>
        {feature.desc}
      </p>
    </div>
  );
}
