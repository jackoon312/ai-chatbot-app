import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FiMoreHorizontal, FiEdit2, FiTrash2 } from 'react-icons/fi';
import api from '../services/api';
import Logo from './Logo';

const ConversationList = ({ conversations, onNewConversation, onNavigate, onConversationsChanged }) => {
  const navigate = useNavigate();
  const { conversationId } = useParams();
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null); // null = not searching
  const [searching, setSearching] = useState(false);
  const [menuOpenId, setMenuOpenId] = useState(null);
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const menuRef = useRef(null);

  // Debounced search - waits until the user pauses typing before hitting the API
  useEffect(() => {
    if (!query.trim()) {
      setSearchResults(null);
      return;
    }

    setSearching(true);
    const timeout = setTimeout(async () => {
      try {
        const response = await api.get(`/conversations/search?query=${encodeURIComponent(query.trim())}`);
        setSearchResults(response.data.conversations);
      } catch (error) {
        console.error('Search failed:', error);
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 350);

    return () => clearTimeout(timeout);
  }, [query]);

  // Close the "..." menu when clicking anywhere outside it
  useEffect(() => {
    if (!menuOpenId) return;
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpenId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpenId]);

  // Hide conversations that never actually got a message - covers any
  // leftover empty ones from before lazy-creation, and any future edge case
  // where creation succeeds but the first message never lands.
  const listToShow = (searchResults !== null ? searchResults : conversations).filter(
    (conv) => conv.messageCount > 0
  );

  const goToConversation = (id) => {
    navigate(`/chat/${id}`);
    onNavigate?.();
  };

  const startRename = (conv) => {
    setRenamingId(conv._id);
    setRenameValue(conv.title);
    setMenuOpenId(null);
  };

  const saveRename = async (id) => {
    const trimmed = renameValue.trim();
    setRenamingId(null);
    if (!trimmed) return;
    try {
      await api.put(`/conversations/${id}`, { title: trimmed });
      onConversationsChanged?.();
      if (searchResults !== null) setQuery(''); // fall back to the full list, which is now fresh
    } catch (error) {
      console.error('Failed to rename conversation:', error);
    }
  };

  const handleRenameKeyDown = (e, id) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveRename(id);
    } else if (e.key === 'Escape') {
      setRenamingId(null);
    }
  };

  const handleDelete = async (conv) => {
    setMenuOpenId(null);
    const confirmed = window.confirm(`Delete "${conv.title}"? This can't be undone.`);
    if (!confirmed) return;
    try {
      await api.delete(`/conversations/${conv._id}`);
      onConversationsChanged?.();
      if (searchResults !== null) setQuery('');
      if (conv._id === conversationId) navigate('/dashboard');
    } catch (error) {
      console.error('Failed to delete conversation:', error);
    }
  };

  return (
    <div className="w-72 shrink-0 h-screen bg-[var(--bg-panel)] border-r border-[var(--border-subtle)] flex flex-col">
      <div className="flex items-center gap-2.5 px-4 pt-4 pb-2">
        <Logo size={26} />
        <span className="font-semibold text-sm tracking-tight">AI Chatbot</span>
      </div>
      <div className="p-3 space-y-2">
        <button
          onClick={onNewConversation}
          className="w-full rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-sm font-medium px-4 py-2.5 transition"
        >
          + New Conversation
        </button>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search conversations..."
          className="w-full rounded-lg bg-[var(--bg-panel-alt)] border border-[var(--border-subtle)] px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[var(--accent)] transition"
        />
      </div>
      <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-0.5">
        {searching ? (
          <p className="text-[var(--text-secondary)] text-xs p-3">Searching...</p>
        ) : listToShow.length === 0 ? (
          <p className="text-[var(--text-secondary)] text-xs p-3">
            {searchResults !== null ? 'No matching conversations.' : 'No conversations yet.'}
          </p>
        ) : (
          listToShow.map((conv) => (
            <div key={conv._id} className="relative group">
              {renamingId === conv._id ? (
                <input
                  autoFocus
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onKeyDown={(e) => handleRenameKeyDown(e, conv._id)}
                  onBlur={() => saveRename(conv._id)}
                  className="w-full rounded-lg bg-[var(--bg-panel-alt)] border border-[var(--accent)] px-3 py-2.5 text-sm focus:outline-none"
                />
              ) : (
                <button
                  onClick={() => goToConversation(conv._id)}
                  className={`w-full text-left pl-3 pr-8 py-2.5 rounded-lg transition ${
                    conv._id === conversationId
                      ? 'bg-[var(--bg-panel-alt)]'
                      : 'hover:bg-[var(--bg-panel-alt)]/60'
                  }`}
                >
                  <div className="flex justify-between items-center gap-2">
                    <span className="font-medium text-sm truncate">{conv.title}</span>
                    <span className="text-[10px] text-[var(--text-secondary)] shrink-0">{conv.mode}</span>
                  </div>
                  {conv.lastMessage && (
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5 truncate">
                      {conv.lastMessage}
                    </p>
                  )}
                </button>
              )}

              {renamingId !== conv._id && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuOpenId(menuOpenId === conv._id ? null : conv._id);
                  }}
                  className={`absolute right-1 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-page)] transition ${
                    menuOpenId === conv._id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                  }`}
                  title="More options"
                >
                  <FiMoreHorizontal size={14} />
                </button>
              )}

              {menuOpenId === conv._id && (
                <div
                  ref={menuRef}
                  className="absolute right-1 top-full mt-1 z-10 w-36 rounded-lg bg-[var(--bg-panel)] border border-[var(--border-subtle)] shadow-lg overflow-hidden"
                >
                  <button
                    onClick={() => startRename(conv)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-[var(--bg-panel-alt)] transition"
                  >
                    <FiEdit2 size={13} /> Rename
                  </button>
                  <button
                    onClick={() => handleDelete(conv)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-[var(--bg-panel-alt)] transition"
                  >
                    <FiTrash2 size={13} /> Delete
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ConversationList;
