import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Custom renderers for ReactMarkdown
const components = {
  // Ensure ordered lists always render with visible numbers
  ol({ children, start, ...props }) {
    return (
      <ol
        start={start}
        style={{
          listStyleType: 'decimal',
          paddingLeft: '1.75rem',
          margin: '0.75rem 0',
          counterReset: `list-counter ${(start ?? 1) - 1}`,
        }}
        {...props}
      >
        {children}
      </ol>
    );
  },

  li({ children, ordered, index, ...props }) {
    return (
      <li
        style={{
          display: 'list-item',
          margin: '0.45rem 0',
          color: '#94a3b8',
          lineHeight: 1.75,
        }}
        {...props}
      >
        {children}
      </li>
    );
  },

  // Highlight "Correct Answer:" lines in green
  p({ children, ...props }) {
    const text = typeof children === 'string' ? children :
      Array.isArray(children) ? children.join('') : '';

    const isCorrect = text.toString().trim().toLowerCase().startsWith('correct answer');
    if (isCorrect) {
      return (
        <p
          style={{
            margin: '0.5rem 0 0.75rem',
            padding: '4px 10px',
            borderRadius: 6,
            background: 'rgba(16,185,129,0.08)',
            borderLeft: '3px solid #10b981',
            color: '#34d399',
            fontWeight: 600,
            fontSize: '0.88rem',
          }}
          {...props}
        >
          {children}
        </p>
      );
    }
    return <p style={{ margin: '0.6rem 0', color: '#94a3b8' }} {...props}>{children}</p>;
  },

  // Unordered lists
  ul({ children, ...props }) {
    return (
      <ul
        style={{ listStyleType: 'disc', paddingLeft: '1.75rem', margin: '0.75rem 0' }}
        {...props}
      >
        {children}
      </ul>
    );
  },
};

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
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
