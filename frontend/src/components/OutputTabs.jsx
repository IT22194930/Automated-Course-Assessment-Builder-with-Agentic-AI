import { useState } from 'react';
import MarkdownViewer from './MarkdownViewer';
import { Download, FileText, BookOpen, ClipboardList, Award } from 'lucide-react';

const TABS = [
  { id: 'syllabus',     label: 'Syllabus',      icon: <FileText size={15} />,      emptyLabel: 'Syllabus will appear here after the Planner agent runs.' },
  { id: 'lessons',     label: 'Lessons',       icon: <BookOpen size={15} />,      emptyLabel: 'Lessons will appear here after the Writer agent runs.' },
  { id: 'quiz',        label: 'Quiz',          icon: <ClipboardList size={15} />, emptyLabel: 'Quiz questions will appear here after the Examiner agent runs.' },
  { id: 'final_report',label: 'Final Report',  icon: <Award size={15} />,         emptyLabel: 'The final compiled report will appear here after the Auditor agent runs.' },
];

export default function OutputTabs({ outputs }) {
  const [activeTab, setActiveTab] = useState('syllabus');
  const current = TABS.find(t => t.id === activeTab);
  const content = outputs?.[activeTab] || '';

  function handleDownload() {
    if (!content) return;
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeTab}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="glass-card" style={{ overflow: 'hidden' }}>
      {/* Tab bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 20px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        gap: 12, flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {TABS.map(tab => (
            <button
              key={tab.id}
              id={`tab-${tab.id}`}
              className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              {tab.icon}
              {tab.label}
              {outputs?.[tab.id] && (
                <span style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: '#34d399', display: 'inline-block',
                }} />
              )}
            </button>
          ))}
        </div>

        {/* Download button */}
        <button
          onClick={handleDownload}
          disabled={!content}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '7px 14px', borderRadius: 10, cursor: content ? 'pointer' : 'not-allowed',
            background: content ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.04)',
            border: `1px solid ${content ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.08)'}`,
            color: content ? '#818cf8' : '#334155',
            fontSize: '0.82rem', fontWeight: 500,
            transition: 'all 0.2s ease',
          }}
        >
          <Download size={14} />
          Download .md
        </button>
      </div>

      {/* Content area */}
      <div style={{ padding: '24px 28px', maxHeight: 560, overflowY: 'auto' }}>
        <MarkdownViewer
          content={content}
          emptyLabel={current?.emptyLabel}
        />
      </div>
    </div>
  );
}
