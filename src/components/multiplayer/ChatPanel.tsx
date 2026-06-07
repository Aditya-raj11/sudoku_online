import React, { useState, useRef, useEffect } from 'react';
import type { ChatMessage } from '../../hooks/useMultiplayerSudoku';

interface ChatPanelProps {
  messages: ChatMessage[];
  onSend: (text: string) => void;
}

const ChatPanel: React.FC<ChatPanelProps> = ({ messages, onSend }) => {
  const [text, setText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim()) {
      onSend(text.trim());
      setText('');
    }
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="chat-panel">
      <div className="chat-header">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <span>Chat</span>
      </div>
      <div className="chat-messages" ref={containerRef}>
        {messages.length === 0 && (
          <div className="chat-empty">No messages yet. Say hello! 👋</div>
        )}
        {messages.map(msg => (
          <div key={msg.id} className={`chat-msg ${msg.isSystem ? 'system' : ''}`}>
            {msg.isSystem ? (
              <div className="chat-system-text">{msg.text}</div>
            ) : (
              <>
                <div className="chat-msg-header">
                  <span className="chat-msg-name" style={{ color: msg.playerColor }}>
                    {msg.playerName}
                  </span>
                  <span className="chat-msg-time">{formatTime(msg.timestamp)}</span>
                </div>
                <div className="chat-msg-text">{msg.text}</div>
              </>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <form className="chat-input-row" onSubmit={handleSubmit}>
        <input
          type="text"
          className="chat-input"
          placeholder="Type a message..."
          value={text}
          onChange={e => setText(e.target.value)}
          maxLength={500}
        />
        <button type="submit" className="chat-send-btn" disabled={!text.trim()}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </form>
    </div>
  );
};

export default ChatPanel;
