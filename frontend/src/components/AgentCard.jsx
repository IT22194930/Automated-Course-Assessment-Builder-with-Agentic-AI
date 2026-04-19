import { CheckCircle, AlertCircle, FileText, BookOpen, ClipboardList, Award } from 'lucide-react';

// Lucide icon components per agent slot (replaces emoji strings)
const AGENT_META = [
  {
    Icon: FileText,
    gradient: 'linear-gradient(135deg, #6366f1, #818cf8)',
    glow: 'rgba(99,102,241,0.35)',
  },
  {
    Icon: BookOpen,
    gradient: 'linear-gradient(135deg, #8b5cf6, #a78bfa)',
    glow: 'rgba(139,92,246,0.35)',
  },
  {
    Icon: ClipboardList,
    gradient: 'linear-gradient(135deg, #ec4899, #f472b6)',
    glow: 'rgba(236,72,153,0.35)',
  },
  {
    Icon: Award,
    gradient: 'linear-gradient(135deg, #10b981, #34d399)',
    glow: 'rgba(16,185,129,0.35)',
  },
];

export default function AgentCard({ step, index, isLast }) {
  const meta = AGENT_META[index];
  const { Icon } = meta;
  const isRunning = step.status === 'running';
  const isDone    = step.status === 'done';
  const isError   = step.status === 'error';

  return (
    <div style={{ position: 'relative', paddingBottom: isLast ? 0 : 12 }}>
      {/* Vertical connector */}
      {!isLast && (
        <div style={{
          position: 'absolute',
          left: 19, top: 48, width: 2, bottom: 0,
          background: isDone
            ? 'linear-gradient(180deg, rgba(16,185,129,0.5), rgba(16,185,129,0.1))'
            : isRunning
            ? 'linear-gradient(180deg, rgba(99,102,241,0.5), rgba(99,102,241,0.05))'
            : 'rgba(255,255,255,0.06)',
          transition: 'all 0.4s ease',
        }} />
      )}

      <div
        className={`glass-card ${isRunning ? 'agent-card-active' : ''}`}
        style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16 }}
      >
        {/* Step icon */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12,
            background: isDone
              ? 'linear-gradient(135deg, #10b981, #34d399)'
              : isRunning
              ? meta.gradient
              : 'rgba(255,255,255,0.05)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: (isDone || isRunning)
              ? `0 4px 20px ${isDone ? 'rgba(16,185,129,0.4)' : meta.glow}`
              : 'none',
            transition: 'all 0.4s ease',
          }}>
            {isDone
              ? <CheckCircle size={20} color="white" />
              : isError
              ? <AlertCircle size={20} color="#f87171" />
              : isRunning
              ? <div className="spinner" style={{ width: 20, height: 20 }} />
              : <Icon size={18} color="rgba(255,255,255,0.35)" />
            }
          </div>
        </div>

        {/* Text */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{
              fontWeight: 600, fontSize: '0.9rem',
              color: isDone ? '#34d399' : isRunning ? '#a78bfa' : '#94a3b8',
              transition: 'color 0.3s',
            }}>
              {step.name}
            </span>
            <StatusBadge status={step.status} />
          </div>
          <p style={{ fontSize: '0.78rem', color: '#475569', marginTop: 2 }}>{step.role}</p>
        </div>

        {/* Index number */}
        <div style={{
          width: 24, height: 24, borderRadius: '50%',
          background: isDone ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.04)',
          border: `1px solid ${isDone ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.08)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '0.7rem', fontWeight: 700,
          color: isDone ? '#34d399' : '#475569',
          flexShrink: 0,
        }}>
          {index + 1}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    waiting: { label: 'Waiting', cls: 'badge-waiting' },
    running: { label: 'Running', cls: 'badge-running' },
    done:    { label: 'Done',    cls: 'badge-done'    },
    error:   { label: 'Error',   cls: 'badge-error'   },
  };
  const { label, cls } = map[status] || map.waiting;
  return (
    <span className={cls} style={{
      fontSize: '0.7rem', fontWeight: 600, padding: '2px 8px',
      borderRadius: 99, letterSpacing: '0.03em', textTransform: 'uppercase',
    }}>
      {status === 'running' && (
        <span style={{
          display: 'inline-block', width: 6, height: 6, borderRadius: '50%',
          background: '#818cf8', marginRight: 5, verticalAlign: 'middle',
          animation: 'pulse-anim 1.2s ease-in-out infinite',
        }} />
      )}
      {label}
    </span>
  );
}
