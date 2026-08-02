'use client';

import React, { useState } from 'react';
import { AiChatMessage, HydraulicCalculationResult, PipelineGeometry, HydraulicConfig } from '../lib/types';
import { answerAiEngineeringQuestion } from '../lib/ai/aiAssistant';
import { Bot, Sparkles, Send, User, X, CornerDownLeft, Lightbulb } from 'lucide-react';

interface AiAssistantDrawerProps {
  geometry: PipelineGeometry;
  hydraulics: HydraulicCalculationResult;
  config: HydraulicConfig;
  isOpen: boolean;
  onClose: () => void;
}

export const AiAssistantDrawer: React.FC<AiAssistantDrawerProps> = ({
  geometry,
  hydraulics,
  config,
  isOpen,
  onClose,
}) => {
  const [inputQuery, setInputQuery] = useState('');
  const [messages, setMessages] = useState<AiChatMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: `Hello! I am your **AI Hydraulic Engineering Consultant**.\n\nI have analyzed your **${geometry.name}** pipeline (${geometry.stats.totalLength} miles, ${hydraulics.pumpsRequired} pump stations, ${hydraulics.totalHorsepower} Total HP).\n\nAsk me anything about pump locations, Hazen-Williams friction loss, pipe diameter optimization, or energy efficiency!`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      suggestedQuestions: [
        'Why was this pump placed here?',
        'What happens if I increase pipe diameter?',
        'Can I reduce the number of pumps?',
        'How much energy will this system consume?',
        'What if flow increases to 300 GPM?',
        'Where is the highest pressure loss?',
      ],
    },
  ]);

  if (!isOpen) return null;

  const handleSendMessage = (textToSend?: string) => {
    const query = textToSend || inputQuery;
    if (!query.trim()) return;

    const userMsg: AiChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const response = answerAiEngineeringQuestion(query, geometry, hydraulics, config);

    const assistantMsg: AiChatMessage = {
      id: `ai-${Date.now()}`,
      sender: 'assistant',
      text: response.answer,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      suggestedQuestions: response.suggestedQuestions,
    };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setInputQuery('');
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[480px] bg-slate-900 border-l border-slate-700 shadow-2xl flex flex-col text-white">
      {/* Drawer Header */}
      <div className="p-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 p-0.5 shadow-md shadow-cyan-500/20 flex items-center justify-center">
            <Bot className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <h2 className="text-sm font-bold text-slate-100">AI Engineering Assistant</h2>
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            </div>
            <p className="text-[10px] text-slate-400">Context-Aware Hydraulic Advisor</p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div className="flex items-center space-x-1.5 mb-1 text-[10px] text-slate-400">
              {msg.sender === 'user' ? (
                <>
                  <span>You</span>
                  <User className="w-3 h-3 text-slate-400" />
                </>
              ) : (
                <>
                  <Bot className="w-3 h-3 text-cyan-400" />
                  <span>AI Engineer</span>
                </>
              )}
              <span>• {msg.timestamp}</span>
            </div>

            <div
              className={`max-w-[90%] p-3 rounded-2xl text-xs whitespace-pre-line leading-relaxed ${
                msg.sender === 'user'
                  ? 'bg-cyan-600 text-white rounded-tr-none'
                  : 'bg-slate-950 border border-slate-800 text-slate-200 rounded-tl-none shadow-md'
              }`}
            >
              {msg.text}
            </div>

            {/* Quick suggested follow-up chips */}
            {msg.suggestedQuestions && msg.suggestedQuestions.length > 0 && (
              <div className="mt-2.5 flex flex-wrap gap-1.5 max-w-[90%]">
                {msg.suggestedQuestions.map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(q)}
                    className="text-[10px] bg-slate-850 hover:bg-slate-800 border border-slate-750 text-cyan-300 hover:text-cyan-200 px-2.5 py-1 rounded-full text-left transition-colors flex items-center space-x-1"
                  >
                    <Lightbulb className="w-2.5 h-2.5 text-amber-400 shrink-0" />
                    <span>{q}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Input Form */}
      <div className="p-3 border-t border-slate-800 bg-slate-950">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center space-x-2"
        >
          <input
            type="text"
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            placeholder="Ask AI why a pump was placed or test a what-if..."
            className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={!inputQuery.trim()}
            className="p-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white transition-colors shadow-md"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
