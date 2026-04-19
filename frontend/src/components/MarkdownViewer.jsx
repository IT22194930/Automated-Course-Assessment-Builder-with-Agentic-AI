import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function MarkdownViewer({ content, emptyLabel = 'No content yet.' }) {
  if (!content || !content.trim()) {
    return (
      <div style={{
        textAlign: 'center', padding: '60px 20px',
        color: '#475569', fontSize: '0.9rem',
      }}>
        <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>📄</div>
        <p>{emptyLabel}</p>
        <p style={{ fontSize: '0.8rem', marginTop: 6, color: '#334155' }}>
          Run the pipeline to generate content.
        </p>
      </div>
    );
  }

  return (
    <div className="prose-custom" style={{ padding: '4px 8px' }}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
