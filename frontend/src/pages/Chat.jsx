import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, useLocation, useOutletContext } from 'react-router-dom';
import api from '../services/api';
import { getSocket } from '../services/socket';
import ChatWindow from '../components/ChatWindow';
import InputBar from '../components/InputBar';

const Chat = () => {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { refreshConversations } = useOutletContext();
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [aiTyping, setAiTyping] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [retryAfter, setRetryAfter] = useState(0); // seconds remaining until a rate limit clears
  const socketRef = useRef(null);
  // Captures the very first user message in a brand-new conversation, so we can
  // auto-rename it once the AI responds (instead of leaving it as "New Conversation").
  const pendingTitleRef = useRef(null);
  // Guards against sending the Dashboard's initial message twice (e.g. React
  // effects re-running) once it's been sent for this conversation.
  const initialMessageSentRef = useRef(false);

  // Load the conversation + its message history via REST whenever we switch conversations
  useEffect(() => {
    const loadConversation = async () => {
      setLoading(true);
      setError('');
      setStreamingText('');
      setAiTyping(false);
      try {
        const response = await api.get(`/conversations/${conversationId}`);
        setConversation(response.data.conversation);
        setMessages(response.data.messages);
      } catch (err) {
        setError(err.response?.data?.message || 'Could not load this conversation.');
      } finally {
        setLoading(false);
      }
    };

    loadConversation();
  }, [conversationId]);

  // Ticks the rate-limit countdown down once per second until it hits 0,
  // then clears the error message too so it doesn't linger indefinitely
  useEffect(() => {
    if (retryAfter <= 0) return;
    const interval = setInterval(() => {
      setRetryAfter((prev) => {
        const next = Math.max(prev - 1, 0);
        if (next === 0) setError('');
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [retryAfter]);

  // Join this conversation's Socket.io room and wire up the real-time event listeners
  useEffect(() => {
    const socket = getSocket();
    socketRef.current = socket;

    socket.emit('join_conversation', conversationId);

    // If we arrived here from Dashboard with a message already typed, send it
    // now that we're actually in the room - sending it before joining would
    // risk the AI's response arriving before we're listening for it.
    if (location.state?.initialMessage && !initialMessageSentRef.current) {
      initialMessageSentRef.current = true;
      const firstMessage = location.state.initialMessage;
      pendingTitleRef.current = firstMessage;
      socket.emit('send_message', { conversationId, content: firstMessage });
      // Clear the navigation state so refreshing this page doesn't resend it
      navigate(location.pathname, { replace: true, state: {} });
    }

    const handleMessageReceived = (msg) => {
      // The server broadcasts our own message back too - only add it if it's not
      // already in the list, so we don't get a duplicate.
      setMessages((prev) => (prev.some((m) => m._id === msg._id) ? prev : [...prev, msg]));
    };

    const handleAiStart = () => {
      setAiTyping(true);
      setStreamingText('');
    };

    const handleAiChunk = (data) => {
      setStreamingText((prev) => prev + data.content);
    };

    const handleAiEnd = async (finalMessage) => {
      setAiTyping(false);
      setStreamingText('');
      setMessages((prev) =>
        prev.some((m) => m._id === finalMessage._id)
          ? prev
          : [...prev, { ...finalMessage, sender: 'ai' }]
      );

      // If this was the first exchange in a brand-new conversation, rename it
      // based on the user's first message instead of leaving "New Conversation".
      if (pendingTitleRef.current) {
        const newTitle =
          pendingTitleRef.current.length > 40
            ? pendingTitleRef.current.slice(0, 40) + '...'
            : pendingTitleRef.current;
        pendingTitleRef.current = null;
        try {
          const response = await api.put(`/conversations/${conversationId}`, { title: newTitle });
          setConversation(response.data.conversation);
        } catch (err) {
          console.error('Failed to auto-rename conversation:', err);
        }
      }

      // Let the sidebar refresh its preview text/order (and updated title) now
      refreshConversations?.();
    };

    const handleError = (data) => {
      setAiTyping(false);
      setError(data.message || 'Something went wrong.');
      if (data.retryAfterSeconds) setRetryAfter(data.retryAfterSeconds);
      if (data.detail) console.error('Server error detail:', data.detail);
    };

    const handleMessageEdited = (data) => {
      setMessages((prev) => {
        const updated = prev.map((m) =>
          m._id === data._id ? { ...m, content: data.content, isEdited: true } : m
        );
        // Drop everything that came after the edited message - the server already
        // deleted these records, so the UI needs to match.
        return updated.filter(
          (m) => m._id === data._id || !m.timestamp || new Date(m.timestamp) <= new Date(data.timestamp)
        );
      });
      setAiTyping(true);
      setStreamingText('');
    };

    socket.on('message_received', handleMessageReceived);
    socket.on('message_edited', handleMessageEdited);
    socket.on('ai_response_start', handleAiStart);
    socket.on('ai_response_chunk', handleAiChunk);
    socket.on('ai_response_end', handleAiEnd);
    socket.on('error', handleError);

    return () => {
      socket.emit('leave_conversation', conversationId);
      socket.off('message_received', handleMessageReceived);
      socket.off('message_edited', handleMessageEdited);
      socket.off('ai_response_start', handleAiStart);
      socket.off('ai_response_chunk', handleAiChunk);
      socket.off('ai_response_end', handleAiEnd);
      socket.off('error', handleError);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  const handleSend = (content) => {
    setError('');
    setRetryAfter(0);
    // If this conversation is untouched and untitled, remember this message so we
    // can auto-rename the conversation once the AI responds.
    if (conversation?.title === 'New Conversation' && messages.length === 0) {
      pendingTitleRef.current = content;
    }
    socketRef.current?.emit('send_message', { conversationId, content });
  };

  const handleEditMessage = (messageId, newContent) => {
    setError('');
    // Editing regenerates the AI's response, same as ChatGPT/Claude - handled
    // entirely over the socket so the new answer can stream back in live.
    socketRef.current?.emit('edit_message', { messageId, content: newContent });
  };

  const handleDeleteMessage = async (messageId) => {
    try {
      await api.delete(`/messages/${messageId}`);
      setMessages((prev) => prev.filter((m) => m._id !== messageId));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete message.');
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-[var(--text-secondary)]">
        Loading conversation...
      </div>
    );
  }

  if (error && !conversation) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3">
        <p className="text-red-500">{error}</p>
        <button
          onClick={() => navigate('/dashboard')}
          className="text-[var(--accent)] hover:underline text-sm"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  // While the AI is generating a response: show a bouncing-dots bubble until the
  // first chunk arrives, then switch to showing the streamed text live.
  const displayMessages = aiTyping
    ? [
        ...messages,
        {
          _id: 'streaming',
          sender: 'ai',
          content: streamingText,
          timestamp: null,
          isTyping: streamingText.length === 0,
        },
      ]
    : messages;

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <header className="flex items-center justify-center relative py-3 border-b border-[var(--border-subtle)]">
        <div className="text-center">
          <h1 className="text-sm font-medium">{conversation?.title}</h1>
          <span className="text-xs text-[var(--text-secondary)]">{conversation?.mode} mode</span>
        </div>
      </header>

      <ChatWindow
        messages={displayMessages}
        onEditMessage={handleEditMessage}
        onDeleteMessage={handleDeleteMessage}
      />

      {error && (
        <p className="text-red-500 text-xs text-center pb-2">
          {error}
          {retryAfter > 0 && ` Try again in ${retryAfter}s.`}
        </p>
      )}

      <InputBar onSend={handleSend} disabled={aiTyping || retryAfter > 0} />
    </div>
  );
};

export default Chat;
