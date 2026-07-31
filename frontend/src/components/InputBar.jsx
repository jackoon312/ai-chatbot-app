import { useState } from 'react';
import { FiArrowUp } from 'react-icons/fi';

const InputBar = ({ onSend, disabled }) => {
  const [text, setText] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText('');
  };

  // Enter sends, Shift+Enter adds a newline
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="px-4 sm:px-6 pb-4 sm:pb-6 pt-2">
      <form
        onSubmit={handleSubmit}
        className="max-w-3xl mx-auto flex items-end gap-2 rounded-2xl bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] px-3 py-2 focus-within:ring-2 focus-within:ring-[var(--accent)] transition"
      >
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          placeholder="Type a message..."
          disabled={disabled}
          className="flex-1 resize-none bg-transparent px-1 py-1.5 text-sm focus:outline-none disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={disabled || !text.trim()}
          className="rounded-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-40 text-white p-2 transition shrink-0"
          title="Send"
        >
          <FiArrowUp size={16} />
        </button>
      </form>
    </div>
  );
};

export default InputBar;
