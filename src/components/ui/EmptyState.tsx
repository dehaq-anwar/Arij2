export function EmptyState({ children }: { children: string }) {
  return (
    <p className="rounded-card border border-dashed border-line-strong/50 px-6 py-12 text-center text-ink-muted">
      {children}
    </p>
  )
}
