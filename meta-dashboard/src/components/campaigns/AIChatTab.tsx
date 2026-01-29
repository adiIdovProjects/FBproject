"use client";

/**
 * AIChatTab Component
 * Embedded AI chat for campaign questions (not a drawer overlay).
 * Reuses the same AI query API as the insights AIChat.
 */

import React, { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Send, Bot, User, Sparkles, Loader2 } from 'lucide-react';
import { apiClient } from '../../services/apiClient';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface AIChatTabProps {
  accountId: string;
}

export default function AIChatTab({ accountId }: AIChatTabProps) {
  const t = useTranslations();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initial greeting
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{
        id: 'welcome',
        role: 'assistant',
        content: t('insights.ai_welcome'),
        timestamp: new Date()
      }]);
      loadSuggestions();
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadSuggestions = async () => {
    try {
      const response = await apiClient.get<{ suggestions: string[] }>('/api/v1/ai/suggested-questions');
      setSuggestions(response.data.suggestions.slice(0, 4));
    } catch (error) {
      console.error('Failed to load suggestions', error);
    }
  };

  const handleSend = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsLoading(true);

    try {
      const payload = {
        question: text,
        context: { accountId }
      };
      const response = await apiClient.post<{ answer: string }>('/api/v1/ai/query', payload);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.data.answer,
        timestamp: new Date()
      }]);
    } catch {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: t('insights.ai_error'),
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-accent/20 rounded-lg">
          <Bot className="w-6 h-6 text-accent" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">{t('campaign_control.ai_chat_title')}</h2>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            <span className="text-xs text-gray-400">{t('insights.online_ready')}</span>
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="bg-gray-900/50 border border-white/10 rounded-xl overflow-hidden">
        {/* Messages */}
        <div className="h-[500px] overflow-y-auto p-4 space-y-6">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-primary-light' : 'bg-accent'}`}>
                {msg.role === 'user' ? <User className="w-5 h-5 text-white" /> : <Sparkles className="w-5 h-5 text-white" />}
              </div>
              <div className={`max-w-[85%] rounded-2xl p-4 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-primary-light/10 text-white rounded-tr-none border border-primary-light/20'
                  : 'bg-white/5 text-gray-200 rounded-tl-none border border-white/10'
              }`}>
                <div className="whitespace-pre-wrap">{msg.content}</div>
                <div className="mt-2 text-xs opacity-50">
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div className="bg-white/5 border border-white/10 rounded-2xl rounded-tl-none p-4 w-24 flex items-center justify-center">
                <span className="flex gap-1">
                  <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                  <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                  <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                </span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Suggestions */}
        {messages.length === 1 && suggestions.length > 0 && (
          <div className="px-4 pb-3 border-t border-white/10 pt-3">
            <p className="text-xs text-gray-500 mb-2 uppercase tracking-widest font-bold">{t('insights.suggested_actions')}</p>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((suggestion, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(suggestion)}
                  className="text-xs bg-white/5 hover:bg-white/10 border border-white/10 hover:border-accent/30 text-gray-300 hover:text-accent px-3 py-2 rounded-lg transition-all text-left"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="p-4 border-t border-white/10">
          <div className="relative flex items-center">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend(inputValue)}
              placeholder={t('insights.ask_placeholder')}
              className="w-full bg-gray-800 border border-white/10 rounded-xl pl-4 pr-12 py-4 text-white focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent placeholder-gray-500"
              disabled={isLoading}
            />
            <button
              onClick={() => handleSend(inputValue)}
              disabled={!inputValue.trim() || isLoading}
              className="absolute right-2 p-2 bg-accent hover:bg-accent/90 disabled:bg-gray-700 disabled:opacity-50 text-white rounded-lg transition-all"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
