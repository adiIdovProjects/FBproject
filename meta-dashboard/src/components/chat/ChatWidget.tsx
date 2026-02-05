'use client';

import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { usePathname } from 'next/navigation';

// Pages where the purple ChatWidget should appear (marketing/public pages)
const PUBLIC_PAGES = ['/', '/login', '/signup', '/pricing', '/features', '/about', '/contact'];

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
}

const ChatWidget: React.FC = () => {
    const t = useTranslations();
    const pathname = usePathname();
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [conversationId, setConversationId] = useState<string | null>(null);
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const abortControllerRef = useRef<AbortController | null>(null);
    const isMountedRef = useRef(true);

    // Cleanup on unmount
    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
            // Abort any pending requests on unmount
            abortControllerRef.current?.abort();
        };
    }, []);

    // Load initial suggestions and welcome message
    useEffect(() => {
        if (isOpen && messages.length === 0) {
            loadSuggestions();
            setMessages([{
                id: 'welcome',
                role: 'assistant',
                content: t('chat.welcome_message')
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
            if (isMountedRef.current) {
                setSuggestions(data.suggestions || []);
            }
        } catch (error) {
            console.error('Failed to load suggestions', error);
            if (isMountedRef.current) {
                setSuggestions([
                    "What is AdsAI?",
                    "How much does it cost?",
                    "How do I get started?"
                ]);
            }
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

        // Cancel any previous request
        abortControllerRef.current?.abort();
        abortControllerRef.current = new AbortController();

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
                }),
                signal: abortControllerRef.current.signal
            });

            const data = await res.json();

            // Only update state if still mounted
            if (!isMountedRef.current) return;

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
            // Ignore abort errors
            if ((error as Error).name === 'AbortError') return;

            console.error('Chat error', error);
            if (!isMountedRef.current) return;

            const errorMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: t('chat.error_message')
            };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            if (isMountedRef.current) {
                setIsLoading(false);
            }
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage(inputValue);
        }
    };

    // Only show on public/marketing pages (strip locale prefix for check)
    const pathWithoutLocale = pathname.replace(/^\/(en|ar|de|fr|he)/, '') || '/';
    const isPublicPage = PUBLIC_PAGES.some(page => pathWithoutLocale === page || pathWithoutLocale.startsWith(page + '/'));

    if (!isPublicPage) {
        return null;
    }

    return (
        <>
            {/* Floating Button - Only on marketing pages */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="fixed bottom-6 right-16 rtl:right-auto rtl:left-16 z-50 w-14 h-14 rounded-full bg-accent text-white shadow-lg hover:bg-accent-hover transition-all flex items-center justify-center"
                aria-label={isOpen ? t('chat.close_chat') : t('chat.open_chat')}
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
                            <h3 className="font-bold text-sm">{t('chat.assistant_name')}</h3>
                            <p className="text-xs text-white/80">{t('chat.typically_replies')}</p>
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
                                placeholder={t('chat.placeholder')}
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
