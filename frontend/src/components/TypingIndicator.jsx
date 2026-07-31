const TypingIndicator = () => (
  <div className="flex items-center gap-1.5 py-1.5">
    <span
      className="w-2 h-2 rounded-full bg-[var(--accent)] typing-dot"
      style={{ animationDelay: '0s' }}
    />
    <span
      className="w-2 h-2 rounded-full bg-[var(--accent)] typing-dot"
      style={{ animationDelay: '0.2s' }}
    />
    <span
      className="w-2 h-2 rounded-full bg-[var(--accent)] typing-dot"
      style={{ animationDelay: '0.4s' }}
    />
  </div>
);

export default TypingIndicator;
