import { useEffect, useState, useCallback } from 'react';
import { Outlet, useNavigate, Link } from 'react-router-dom';
import { FiSettings, FiMenu, FiSun, FiMoon } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import api from '../services/api';
import ConversationList from '../components/ConversationList';

const AppLayout = () => {
  const { user, logout } = useAuth();
  const { darkMode, toggleDarkMode } = useTheme();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState([]);
  // Sidebar is an off-canvas drawer on mobile, always visible on desktop (md+)
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const loadConversations = useCallback(async () => {
    try {
      const response = await api.get('/conversations');
      setConversations(response.data.conversations);
    } catch (error) {
      console.error('Failed to load conversations:', error);
    }
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // "+ New Conversation" no longer creates anything in the database - it just
  // takes you to the composer (Dashboard), which creates the conversation only
  // once you actually send a first message. This is what stops empty,
  // never-used conversations from cluttering the sidebar.
  const handleNewConversation = () => {
    setSidebarOpen(false);
    navigate('/dashboard');
  };

  return (
    <div className="flex h-screen bg-[var(--bg-page)] text-[var(--text-primary)]">
      {/* Backdrop - only shown on mobile when the drawer is open */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar: fixed off-canvas drawer on mobile, static in-flow on desktop */}
      <div
        className={`fixed inset-y-0 left-0 z-40 transform transition-transform duration-200 md:static md:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <ConversationList
          conversations={conversations}
          onNewConversation={handleNewConversation}
          onNavigate={() => setSidebarOpen(false)}
          onConversationsChanged={loadConversations}
        />
      </div>

      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-[var(--border-subtle)]">
          <button
            onClick={() => setSidebarOpen(true)}
            className="md:hidden text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-1.5 -ml-1.5"
            title="Open conversations"
          >
            <FiMenu size={18} />
          </button>

          <div className="flex items-center gap-2 ml-auto">
            <span className="text-xs text-[var(--text-secondary)] hidden sm:inline mr-1">
              {user?.username}
            </span>
            <button
              onClick={toggleDarkMode}
              className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-panel-alt)] rounded-lg p-2 transition"
              title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {darkMode ? <FiSun size={15} /> : <FiMoon size={15} />}
            </button>
            <Link
              to="/settings"
              className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-panel-alt)] rounded-lg p-2 transition"
              title="AI Settings"
            >
              <FiSettings size={15} />
            </Link>
            <button
              onClick={logout}
              className="text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-panel-alt)] rounded-lg px-3 py-2 transition"
            >
              Log out
            </button>
          </div>
        </div>
        {/* refreshConversations lets the Chat page ask the sidebar to update its
            preview text/order after an AI response finishes */}
        <Outlet context={{ refreshConversations: loadConversations }} />
      </div>
    </div>
  );
};

export default AppLayout;
