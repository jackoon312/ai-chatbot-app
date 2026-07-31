import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import InputBar from '../components/InputBar';
import Logo from '../components/Logo';

const Dashboard = () => {
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  // A conversation isn't created until this first message is actually sent -
  // this is what stops empty, never-used conversations from piling up in the
  // sidebar, and lets you start typing immediately instead of clicking through
  // an empty state first.
  const handleFirstMessage = async (content) => {
    setCreating(true);
    setError('');
    try {
      let mode = 'General';
      try {
        const settingsResponse = await api.get('/settings');
        mode = settingsResponse.data.settings.defaultMode;
      } catch (settingsError) {
        // Fall back to General if settings aren't reachable
      }

      const response = await api.post('/conversations', { title: 'New Conversation', mode });
      // Pass the typed message along via navigation state - Chat.jsx sends it
      // itself once it has joined the new conversation's socket room.
      navigate(`/chat/${response.data.conversation._id}`, { state: { initialMessage: content } });
    } catch (err) {
      setError('Failed to start a new conversation. Please try again.');
      setCreating(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 text-center">
      <Logo size={40} className="mb-4" />
      <h1 className="text-xl font-semibold tracking-tight mb-1">What can I help with?</h1>
      <p className="text-sm text-[var(--text-secondary)] mb-6">
        Type a message below to start a new conversation.
      </p>
      {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
      <div className="w-full max-w-2xl">
        <InputBar onSend={handleFirstMessage} disabled={creating} />
      </div>
    </div>
  );
};

export default Dashboard;
