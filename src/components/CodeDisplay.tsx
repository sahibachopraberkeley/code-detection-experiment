import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface CodeDisplayProps {
  code: string;
  onScroll?: (e: React.UIEvent<HTMLDivElement>) => void;
  onCopy?: (e: React.ClipboardEvent) => void;
}

export function CodeDisplay({ code, onScroll, onCopy }: CodeDisplayProps) {
  return (
    <div
      className="rounded-lg overflow-hidden border border-gray-700"
      onScroll={onScroll}
      onCopy={onCopy}
    >
      <div className="max-h-[400px] overflow-y-auto">
        <SyntaxHighlighter
          language="python"
          style={vscDarkPlus}
          showLineNumbers
          wrapLines
          customStyle={{
            margin: 0,
            padding: '1rem',
            fontSize: '14px',
            lineHeight: '1.5',
          }}
          lineNumberStyle={{
            minWidth: '2.5em',
            paddingRight: '1em',
            color: '#6b7280',
            userSelect: 'none',
          }}
        >
          {code}
        </SyntaxHighlighter>
      </div>
    </div>
  );
}
