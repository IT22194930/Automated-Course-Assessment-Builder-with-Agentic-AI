import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import OutputTabs from '../components/OutputTabs';
import {
  ArrowLeft, RefreshCw, BookOpen, CheckCircle, Clock,
  ChevronRight, FolderOpen, Layers, Bot
} from 'lucide-react';

// ── Helpers ────────────────────────────────────────────────────────────────────
function StepDot({ done, label }) {
  return (
    <span title={label} style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      fontSize: '0.7rem', fontWeight: 600,
      color: done ? '#34d399' : '#334155',
    }}>
      {done
        ? <CheckCircle size={11} />
        : <Clock size={11} style={{ opacity: 0.4 }} />}
      {label}
    </span>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────────
export default function Results() {
  const [topics, setTopics]         = useState([]);
  const [selectedSlug, setSelected] = useState(null);
  const [outputs, setOutputs]       = useState(null);
  const [loadingList, setLoadingList]   = useState(true);
  const [loadingOutputs, setLoadingOut] = useState(false);
  const navigate = useNavigate();

  // ── Fetch topic list ──────────────────────────────────────────────────────
  async function fetchTopics() {
    setLoadingList(true);
    try {
      const res  = await fetch('/api/topics');
      const data = await res.json();
      const list = data.topics || [];
      setTopics(list);
      // Auto-select: prefer what was open, else pick the last topic
      setSelected(prev => {
        if (prev && list.find(t => t.slug === prev)) return prev;
        return list.length ? list[list.length - 1].slug : null;
      });
    } catch (err) {
      console.error('Failed to fetch topics:', err);
    } finally {
      setLoadingList(false);
    }
  }

  // ── Fetch outputs for selected topic ─────────────────────────────────────
  async function fetchOutputs(slug) {
    if (!slug) { setOutputs(null); return; }
    setLoadingOut(true);
    try {
      const res  = await fetch(`/api/outputs/${slug}`);
      const data = await res.json();
      setOutputs(data);
    } catch (err) {
      console.error('Failed to fetch outputs:', err);
      setOutputs(null);
    } finally {
      setLoadingOut(false);
    }
  }

  useEffect(() => { fetchTopics(); }, []);
  useEffect(() => { fetchOutputs(selectedSlug); }, [selectedSlug]);

  const selectedTopic = topics.find(t => t.slug === selectedSlug);
  const hasContent    = outputs && Object.values(outputs).some(v => v && v.trim());

  // ── Step completion summary ───────────────────────────────────────────────
  function TopicProgress({ topic }) {
    const steps = [
      { key: 'syllabus', label: 'Syllabus' },
      { key: 'lessons',  label: 'Lessons'  },
      { key: 'quiz',     label: 'Quiz'      },
      { key: 'report',   label: 'Report'   },
    ];
    const doneCount = steps.filter(s => topic[s.key]).length;
    return (
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
        {steps.map(s => <StepDot key={s.key} done={topic[s.key]} label={s.label} />)}
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', minHeight: '100vh', paddingTop: 80 }}>
      <div className="bg-mesh" />
      <div className="bg-grid" />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 1100, margin: '0 auto', padding: '44px 24px 80px' }}>

        {/* ── Page header ─────────────────────────────────────────────────── */}
        <div className="fade-in-up" style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 32, flexWrap: 'wrap', gap: 16,
        }}>
          <div>
            <button
              id="back-btn"
              onClick={() => navigate('/')}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: 'transparent', border: 'none', cursor: 'pointer',
                color: '#64748b', fontSize: '0.85rem', marginBottom: 12,
                transition: 'color 0.2s',
              }}
              onMouseOver={e => e.currentTarget.style.color = '#a78bfa'}
              onMouseOut={e => e.currentTarget.style.color = '#64748b'}
            >
              <ArrowLeft size={14} />
              Back to Generator
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10,
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 20px rgba(139,92,246,0.35)',
              }}>
                <BookOpen size={18} color="white" />
              </div>
              <div>
                <h1 style={{ fontWeight: 800, fontSize: '1.4rem', color: '#f1f5f9', letterSpacing: '-0.02em' }}>
                  Generated Courses
                </h1>
                <p style={{ fontSize: '0.8rem', color: '#475569', marginTop: 2 }}>
                  {topics.length} topic{topics.length !== 1 ? 's' : ''} found on disk
                </p>
              </div>
            </div>
          </div>

          <button
            id="refresh-btn"
            onClick={() => { fetchTopics(); if (selectedSlug) fetchOutputs(selectedSlug); }}
            disabled={loadingList}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 14px', borderRadius: 10,
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: '#64748b', fontSize: '0.82rem', cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            <RefreshCw size={14} style={{ animation: loadingList ? 'spin 1s linear infinite' : 'none' }} />
            Refresh
          </button>
        </div>

        {/* ── No topics CTA ───────────────────────────────────────────────── */}
        {!loadingList && topics.length === 0 && (
          <div className="glass-card fade-in-up delay-100" style={{ padding: 48, textAlign: 'center' }}>
            <div style={{
              width: 64, height: 64, borderRadius: 18, margin: '0 auto 20px',
              background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 8px 32px rgba(99,102,241,0.3)',
            }}>
              <Bot size={30} color="white" />
            </div>
            <h2 style={{ fontWeight: 700, fontSize: '1.2rem', color: '#e2e8f0', marginBottom: 10 }}>
              No Courses Generated Yet
            </h2>
            <p style={{ color: '#475569', fontSize: '0.9rem', marginBottom: 24 }}>
              Head to the generator or the Step Builder, enter a topic, and let the AI agents build your course.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button className="btn-gradient" onClick={() => navigate('/')}
                style={{ padding: '12px 24px', fontSize: '0.9rem', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <ArrowLeft size={15} /> Auto Pipeline
              </button>
              <button onClick={() => navigate('/builder')}
                style={{
                  padding: '12px 24px', fontSize: '0.9rem', display: 'inline-flex', alignItems: 'center', gap: 8,
                  background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.3)',
                  color: '#818cf8', borderRadius: 12, cursor: 'pointer',
                }}>
                <Layers size={15} /> Step Builder
              </button>
            </div>
          </div>
        )}

        {/* ── Main layout: sidebar + content ──────────────────────────────── */}
        {topics.length > 0 && (
          <div className="fade-in-up delay-100" style={{
            display: 'grid',
            gridTemplateColumns: '260px 1fr',
            gap: 20,
            alignItems: 'start',
          }}>

            {/* ── Topic sidebar ─────────────────────────────────────────────── */}
            <div>
              <p style={{
                fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.08em',
                textTransform: 'uppercase', color: '#334155', marginBottom: 10, paddingLeft: 4,
              }}>
                Generated Topics
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {topics.map(topic => {
                  const isActive   = topic.slug === selectedSlug;
                  const doneCount  = ['syllabus','lessons','quiz','report'].filter(k => topic[k]).length;
                  const isComplete = doneCount === 4;
                  return (
                    <button
                      key={topic.slug}
                      id={`topic-${topic.slug}`}
                      onClick={() => setSelected(topic.slug)}
                      style={{
                        width: '100%', padding: '14px 16px', borderRadius: 12,
                        cursor: 'pointer', textAlign: 'left',
                        background: isActive ? 'rgba(99,102,241,0.14)' : 'rgba(255,255,255,0.02)',
                        border: `1px solid ${isActive ? 'rgba(99,102,241,0.35)' : 'rgba(255,255,255,0.06)'}`,
                        transition: 'all 0.2s ease',
                      }}
                    >
                      {/* Icon + label row */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                        <div style={{
                          width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                          background: isComplete
                            ? 'linear-gradient(135deg,#10b981,#34d399)'
                            : isActive
                            ? 'linear-gradient(135deg,#6366f1,#818cf8)'
                            : 'rgba(255,255,255,0.06)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '0.85rem',
                          boxShadow: (isComplete || isActive) ? `0 2px 10px ${isComplete ? 'rgba(16,185,129,0.3)' : 'rgba(99,102,241,0.25)'}` : 'none',
                        }}>
                          {isComplete
                            ? <CheckCircle size={14} color="white" />
                            : <FolderOpen size={14} color={isActive ? 'white' : '#475569'} />}
                        </div>
                        <div style={{
                          fontSize: '0.82rem', fontWeight: 600, flex: 1, minWidth: 0,
                          color: isActive ? '#a78bfa' : isComplete ? '#34d399' : '#94a3b8',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {topic.label}
                        </div>
                        {isActive && <ChevronRight size={13} color="#6366f1" />}
                      </div>

                      {/* Step completion dots */}
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {[
                          { key: 'syllabus', short: 'Syl' },
                          { key: 'lessons',  short: 'Les' },
                          { key: 'quiz',     short: 'Quiz'},
                          { key: 'report',   short: 'Rep' },
                        ].map(s => (
                          <span key={s.key} style={{
                            display: 'inline-flex', alignItems: 'center', gap: 3,
                            padding: '2px 7px', borderRadius: 99,
                            fontSize: '0.65rem', fontWeight: 600,
                            background: topic[s.key] ? 'rgba(52,211,153,0.12)' : 'rgba(255,255,255,0.04)',
                            border: `1px solid ${topic[s.key] ? 'rgba(52,211,153,0.25)' : 'rgba(255,255,255,0.06)'}`,
                            color: topic[s.key] ? '#34d399' : '#334155',
                          }}>
                            {topic[s.key] ? <CheckCircle size={9} /> : <Clock size={9} />}
                            {s.short}
                          </span>
                        ))}
                      </div>

                      {/* Progress bar */}
                      <div style={{
                        marginTop: 8, height: 3, borderRadius: 99,
                        background: 'rgba(255,255,255,0.05)', overflow: 'hidden',
                      }}>
                        <div style={{
                          height: '100%', borderRadius: 99,
                          width: `${(doneCount / 4) * 100}%`,
                          background: isComplete
                            ? 'linear-gradient(90deg,#10b981,#34d399)'
                            : 'linear-gradient(90deg,#6366f1,#a78bfa)',
                          transition: 'width 0.5s ease',
                        }} />
                      </div>
                      <div style={{ fontSize: '0.62rem', color: '#475569', marginTop: 4 }}>
                        {doneCount}/4 steps complete
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── Right: outputs panel ─────────────────────────────────────── */}
            <div>
              {/* Topic header */}
              {selectedTopic && (
                <div className="glass-card" style={{
                  padding: '18px 22px', marginBottom: 16,
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10,
                }}>
                  <div>
                    <h2 style={{ fontWeight: 700, fontSize: '1.1rem', color: '#f1f5f9', marginBottom: 4 }}>
                      {selectedTopic.label}
                    </h2>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {[
                        { key: 'syllabus', label: 'Syllabus' },
                        { key: 'lessons',  label: 'Lessons'  },
                        { key: 'quiz',     label: 'Quiz'      },
                        { key: 'report',   label: 'Report'   },
                      ].map(s => (
                        <span key={s.key} style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          padding: '3px 10px', borderRadius: 99, fontSize: '0.72rem', fontWeight: 600,
                          background: selectedTopic[s.key] ? 'rgba(52,211,153,0.1)' : 'rgba(255,255,255,0.04)',
                          border: `1px solid ${selectedTopic[s.key] ? 'rgba(52,211,153,0.25)' : 'rgba(255,255,255,0.06)'}`,
                          color: selectedTopic[s.key] ? '#34d399' : '#475569',
                        }}>
                          {selectedTopic[s.key] ? <CheckCircle size={11} /> : <Clock size={11} />}
                          {s.label}
                        </span>
                      ))}
                    </div>
                  </div>
                  <span style={{
                    fontSize: '0.75rem', color: '#64748b', fontFamily: 'JetBrains Mono, monospace',
                    background: 'rgba(255,255,255,0.04)', padding: '4px 10px',
                    borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)',
                  }}>
                    data/{selectedTopic.slug}/
                  </span>
                </div>
              )}

              {/* Loading skeleton */}
              {loadingOutputs && (
                <div className="glass-card" style={{ padding: 40, textAlign: 'center' }}>
                  <div className="spinner" style={{ width: 28, height: 28, margin: '0 auto 14px' }} />
                  <p style={{ color: '#475569', fontSize: '0.85rem' }}>Loading content…</p>
                </div>
              )}

              {/* Output tabs */}
              {!loadingOutputs && hasContent && (
                <OutputTabs outputs={outputs} />
              )}

              {/* Empty state for this topic */}
              {!loadingOutputs && !hasContent && selectedTopic && (
                <div className="glass-card" style={{ padding: 40, textAlign: 'center' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: 14 }}>📂</div>
                  <h3 style={{ fontWeight: 700, fontSize: '1rem', color: '#e2e8f0', marginBottom: 8 }}>
                    No output files yet
                  </h3>
                  <p style={{ color: '#475569', fontSize: '0.85rem', marginBottom: 20 }}>
                    Run steps in the Step Builder for <strong style={{ color: '#a78bfa' }}>{selectedTopic.label}</strong>.
                  </p>
                  <button
                    onClick={() => navigate('/builder')}
                    style={{
                      padding: '10px 20px', borderRadius: 10, cursor: 'pointer',
                      background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.3)',
                      color: '#818cf8', fontSize: '0.85rem', fontWeight: 600,
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                    }}
                  >
                    <Layers size={14} /> Go to Step Builder
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
