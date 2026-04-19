import AgentCard from './AgentCard';
import { Zap } from 'lucide-react';

export default function PipelineProgress({ pipelineState }) {
  const { status, steps, progress, current_agent, error } = pipelineState;
  const isActive = status === 'running' || status === 'done';

  if (!isActive && status !== 'error') return null;

  return (
    <div className="glass-card fade-in-up" style={{ padding: 28, marginTop: 32 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Zap size={16} color="white" />
          </div>
          <div>
            <h3 style={{ fontWeight: 700, fontSize: '1rem', color: '#f1f5f9' }}>Pipeline Progress</h3>
            {status === 'running' && (
              <p style={{ fontSize: '0.78rem', color: '#818cf8', marginTop: 1 }}>
                Active: {current_agent}
              </p>
            )}
            {status === 'done' && (
              <p style={{ fontSize: '0.78rem', color: '#34d399', marginTop: 1 }}>
                ✓ All agents completed successfully
              </p>
            )}
            {status === 'error' && (
              <p style={{ fontSize: '0.78rem', color: '#f87171', marginTop: 1 }}>
                ✗ Pipeline error occurred
              </p>
            )}
          </div>
        </div>
        <span style={{
          fontWeight: 700, fontSize: '1.4rem',
          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
          WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent',
        }}>
          {progress}%
        </span>
      </div>

      {/* Progress bar */}
      <div className="progress-bar-track" style={{ marginBottom: 24 }}>
        <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
      </div>

      {/* Error box */}
      {status === 'error' && error && (
        <div style={{
          background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
          borderRadius: 10, padding: '12px 16px', marginBottom: 20,
          fontSize: '0.82rem', color: '#f87171', fontFamily: 'JetBrains Mono, monospace',
        }}>
          {error}
        </div>
      )}

      {/* Agent steps */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {steps.map((step, i) => (
          <AgentCard
            key={step.id}
            step={step}
            index={i}
            isLast={i === steps.length - 1}
          />
        ))}
      </div>
    </div>
  );
}
