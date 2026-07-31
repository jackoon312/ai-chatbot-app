import { useEffect, useRef } from 'react';
import MessageBubble from './MessageBubble';

const ChatWindow = ({ messages, onEditMessage, onDeleteMessage }) => {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-6">
      <div className="max-w-3xl mx-auto">
        {messages.length === 0 ? (
          <p className="text-[var(--text-secondary)] text-sm text-center mt-8">
            No messages yet. Say hello to get started.
          </p>
        ) : (
          messages.map((msg) => (
            <MessageBubble
              key={msg._id}
              id={msg._id}
              sender={msg.sender}
              content={msg.content}
              timestamp={msg.timestamp}
              isEdited={msg.isEdited}
              isTyping={msg.isTyping}
              onEdit={msg.sender === 'user' ? onEditMessage : undefined}
              onDelete={msg.sender === 'user' ? onDeleteMessage : undefined}
            />
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
};

export default ChatWindow;
