import React from 'react';
import ReactMarkdown, { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';

type MarkdownRendererProps = {
  content: string;
  className?: string;
  // Allow callers to override styling/components per-context
  componentsOverride?: Components;
  enableGfm?: boolean; // default true
};

// Fallback-safe boundary to avoid runtime errors from plugins/rendering
class MarkdownErrorBoundary extends React.Component<{ fallback: React.ReactNode; children: React.ReactNode }, { hasError: boolean }>{
  constructor(props: { fallback: React.ReactNode; children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch() {
    // Swallow error to avoid crashing chat UI
  }
  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children as React.ReactNode;
  }
}

// Neutral dark-theme defaults; callers can override for brand/variant styling
const defaultComponents: Components = {
  p: ({ children }) => (
    <p className="mb-3 last:mb-0 leading-relaxed">{children}</p>
  ),
  ul: ({ children }) => (
    <ul className="space-y-2 my-3 ml-4 list-disc">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="space-y-2 my-3 ml-4 list-decimal">{children}</ol>
  ),
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  code: ({ children, className }) => {
    const isBlock = className?.includes('language-');
    return isBlock ? (
      <pre className="my-4 rounded-lg overflow-x-auto bg-zinc-900 text-emerald-400 p-4 text-sm font-mono border border-zinc-700">
        <code>{children}</code>
      </pre>
    ) : (
      <code className="bg-zinc-800 text-zinc-100 px-1.5 py-0.5 rounded text-[0.875em] font-mono">
        {children}
      </code>
    );
  },
  table: ({ children }) => (
    <div className="overflow-x-auto my-4 rounded-lg border border-zinc-700">
      <table className="min-w-full bg-zinc-900/60">{children}</table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-zinc-800 text-zinc-100">{children}</thead>
  ),
  th: ({ children }) => (
    <th className="px-4 py-2 text-left text-sm font-semibold border-r border-zinc-700 last:border-r-0">
      {children}
    </th>
  ),
  tbody: ({ children }) => (
    <tbody className="divide-y divide-zinc-800">{children}</tbody>
  ),
  tr: ({ children }) => (
    <tr className="hover:bg-zinc-800/40 transition-colors duration-200">{children}</tr>
  ),
  td: ({ children }) => (
    <td className="px-4 py-2 text-sm border-r border-zinc-800 last:border-r-0 align-top">
      {children}
    </td>
  ),
};

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
  content,
  className,
  componentsOverride,
  enableGfm = true,
}) => {
  const plugins = [] as any[];
  if (enableGfm) plugins.push(remarkGfm as any);

  // react-markdown@9 removed `className` on the component itself.
  // To support external styling, wrap the root via components.div.
  const rootWrapper: Partial<Components> = className
    ? {
        div: ({ children }) => <div className={className}>{children}</div>,
      }
    : {};

  const mergedComponents = {
    ...rootWrapper,
    ...defaultComponents,
    ...(componentsOverride || {}),
  } as Components;

  // Fallback without GFM if something goes wrong
  const fallback = (
    <ReactMarkdown components={mergedComponents}>{content}</ReactMarkdown>
  );

  return (
    <MarkdownErrorBoundary fallback={fallback}>
      <ReactMarkdown remarkPlugins={plugins} components={mergedComponents}>
        {content}
      </ReactMarkdown>
    </MarkdownErrorBoundary>
  );
};

export default MarkdownRenderer;
