interface SourceLinkProps {
  href: string;
  source: string;
}

export function SourceLink({ href, source }: SourceLinkProps) {
  return (
    <a className="source-link" href={href} target="_blank" rel="noreferrer">
      Open on {source}
      <span aria-hidden="true"> ↗</span>
    </a>
  );
}
