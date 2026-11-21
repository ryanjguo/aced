import ReactMarkdown from 'react-markdown'
import rehypeSanitize from 'rehype-sanitize'

/** Renders user markdown safely: raw HTML is ignored and the output is sanitized. */
export function Markdown({ children }: { children: string }) {
  return (
    <div className="prose-aced text-sm break-words">
      <ReactMarkdown
        rehypePlugins={[rehypeSanitize]}
        components={{
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer nofollow ugc"
              className="text-accent hover:underline"
            >
              {children}
            </a>
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  )
}
