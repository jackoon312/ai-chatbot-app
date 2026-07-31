// A simple 4-point sparkle mark - this shape is a generic, widely-used visual
// shorthand for "AI" across many products (not any single company's
// trademarked logo), which is why it's safe to use here.
const Logo = ({ size = 32, className = '' }) => (
  <div
    className={`rounded-full bg-[var(--accent)] flex items-center justify-center shrink-0 ${className}`}
    style={{ width: size, height: size }}
  >
    <svg width={size * 0.52} height={size * 0.52} viewBox="0 0 24 24" fill="white">
      <path d="M12 2C12 2 13.2 8.2 16 11C18.8 13.8 22 12 22 12C22 12 18.8 13.8 16 16C13.2 18.8 12 22 12 22C12 22 10.8 18.8 8 16C5.2 13.8 2 12 2 12C2 12 5.2 13.8 8 8C10.8 5.2 12 2 12 2Z" />
    </svg>
  </div>
);

export default Logo;
