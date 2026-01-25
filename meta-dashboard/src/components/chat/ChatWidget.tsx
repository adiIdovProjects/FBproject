'use client';

import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot } from 'lucide-react';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
}

const ChatWidget: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [conversationId, setConversationId] = useState<string | null>(null);
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Load initial suggestions and welcome message
    useEffect(() => {
        if (isOpen && messages.length === 0) {
            loadSuggestions();
            setMessages([{
                id: 'welcome',
                role: 'assistant',
                content: "Hi! I'm here to help you learn about AdsAI and Facebook Ads optimization. How can I assist you today?"
            }]);
        }
    }, [isOpen, messages.length]);

    // Scroll to bottom on new messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const loadSuggestions = async () => {
        try {
            const res = await fetch('/api/v1/public/chat/suggestions');
            const data = await res.json();
            setSuggestions(data.suggestions || []);
        } catch (error) {
            console.error('Failed to load suggestions', error);
            setSuggestions([
                "What is AdsAI?",
                "How much does it cost?",
                "How do I get started?"
            ]);
        }
    };

    const sendMessage = async (text: string) => {
        if (!text.trim() || isLoading) return;

        const userMsg: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: text
        };

        setMessages(prev => [...prev, userMsg]);
        setInputValue('');
        setIsLoading(true);

        try {
            const history = messages
                .filter(m => m.id !== 'welcome')
                .map(m => ({ role: m.role, content: m.content }));

            const res = await fetch('/api/v1/public/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: text,
                    conversation_id: conversationId,
                    history: history
                })
            });

            const data = await res.json();

            if (!conversationId) {
                setConversationId(data.conversation_id);
            }

            const aiMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: data.reply
            };

            setMessages(prev => [...prev, aiMsg]);

            if (data.suggested_actions) {
                setSuggestions(data.suggested_actions);
            }
        } catch (error) {
            console.error('Chat error', error);
            const errorMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: "Sorry, I'm having trouble responding. Please try again."
            };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage(inputValue);
        }
    };

    return (
        <>
            {/* Floating Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="fixed bottom-6 right-16 rtl:right-auto rtl:left-16 z-50 w-14 h-14 rounded-full bg-accent text-white shadow-lg hover:bg-accent-hover transition-all flex items-center justify-center"
                aria-label={isOpen ? "Close chat" : "Open chat"}
            >
                {isOpen ? <X size={24} /> : <MessageCircle size={24} />}
            </button>

            {/* Chat Window */}
            {isOpen && (
                <div className="fixed bottom-24 right-16 rtl:right-auto rtl:left-16 z-50 w-[360px] h-[480px] bg-card rounded-2xl shadow-2xl border border-border-subtle flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
                    {/* Header */}
                    <div className="p-4 bg-accent text-white flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                            <Bot size={20} />
                        </div>
                        <div>
                            <h3 className="font-bold text-sm">AdsAI Assistant</h3>
                            <p className="text-xs text-white/80">Typically replies instantly</p>
                        </div>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-background">
                        {messages.map((msg) => (
                            <div
                                key={msg.id}
                                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div
                                    className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                                        msg.role === 'user'
                                            ? 'bg-accent text-white rounded-br-sm'
                                            : 'bg-card text-foreground rounded-bl-sm border border-border-subtle'
                                    }`}
                                >
                                    <p className="whitespace-pre-wrap">{msg.content}</p>
                                </div>
                            </div>
                        ))}

                        {isLoading && (
                            <div className="flex justify-start">
                                <div className="bg-card rounded-2xl rounded-bl-sm px-4 py-3 border border-border-subtle">
                                    <div className="flex gap-1">
                                        <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                        <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                        <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                    </div>
                                </div>
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>

                    {/* Quick Suggestions */}
                    {messages.length <= 2 && suggestions.length > 0 && (
                        <div className="px-4 py-2 border-t border-border-subtle bg-card">
                            <div className="flex flex-wrap gap-2">
                                {suggestions.slice(0, 3).map((suggestion, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => sendMessage(suggestion)}
                                        className="text-xs bg-background hover:bg-accent hover:text-white text-foreground px-3 py-1.5 rounded-full transition-colors border border-border-subtle"
                                    >
                                        {suggestion}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Input */}
                    <div className="p-3 border-t border-border-subtle bg-card">
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onKeyDown={handleKeyPress}
                                placeholder="Type your message..."
                                className="flex-1 bg-background border-none rounded-full px-4 py-2 text-sm text-foreground placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-accent"
                                disabled={isLoading}
                            />
                            <button
                                onClick={() => sendMessage(inputValue)}
                                disabled={!inputValue.trim() || isLoading}
                                className="w-10 h-10 rounded-full bg-accent text-white flex items-center justify-center hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <Send size={18} />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default ChatWidget;
