import { useState } from 'react';
import { FiEdit2, FiTrash2, FiCheck, FiX } from 'react-icons/fi';
import TypingIndicator from './TypingIndicator';
import Logo from './Logo';

const MessageBubble = ({ id, sender, content, timestamp, isEdited, isTyping, onEdit, onDelete }) => {
  const isUser = sender === 'user';
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(content);

  const startEdit = () => {
    setDraft(content);
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setDraft(content);
  };

  const saveEdit = () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== content) {
      onEdit?.(id, trimmed);
    }
    setEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      saveEdit();
    } else if (e.key === 'Escape') {
      cancelEdit();
    }
  };

  // AI messages render as plain flowing text with a small accent marker -
  // no boxed bubble - matching how modern assistants (Claude, ChatGPT)
  // actually present responses. User messages keep a soft bubble so the
  // conversation still reads as a clear back-and-forth.
  if (!isUser) {
    return (
      <div className="flex gap-3 mb-6 max-w-3xl">
        <Logo size={24} className="mt-0.5" />
        <div className="min-w-0 flex-1 pt-0.5">
          {isTyping ? (
            <TypingIndicator />
          ) : (
            <p className="text-[15px] leading-relaxed whitespace-pre-wrap break-words">{content}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-end mb-4 group">
      {!editing && (onEdit || onDelete) && (
        <div className="flex items-center gap-1 mr-1.5 opacity-0 group-hover:opacity-100 transition self-center">
          {onEdit && (
            <button
              onClick={startEdit}
              className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-1"
              title="Edit"
            >
              <FiEdit2 size={12} />
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(id)}
              className="text-[var(--text-secondary)] hover:text-red-500 p-1"
              title="Delete"
            >
              <FiTrash2 size={12} />
            </button>
          )}
        </div>
      )}

      <div className="max-w-[85%] sm:max-w-[70%] rounded-2xl px-4 py-2.5 bg-[var(--bubble-user)] text-[var(--text-primary)]">
        {editing ? (
          <div className="space-y-2">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={2}
              autoFocus
              className="w-full bg-black/5 dark:bg-white/5 rounded-lg px-2.5 py-1.5 text-sm resize-none focus:outline-none"
            />
            <div className="flex justify-end gap-2">
              <button onClick={cancelEdit} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-1" title="Cancel">
                <FiX size={14} />
              </button>
              <button onClick={saveEdit} className="text-[var(--accent)] hover:text-[var(--accent-hover)] p-1" title="Save & regenerate">
                <FiCheck size={14} />
              </button>
            </div>
          </div>
        ) : (
          <>
            <p className="text-sm">{content}</p>
            <div className="flex items-center gap-1.5 mt-1">
              {timestamp && (
                <p className="text-[10px] text-[var(--text-secondary)]">
                  {new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              )}
              {isEdited && <span className="text-[10px] italic text-[var(--text-secondary)]">(edited)</span>}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default MessageBubble;
