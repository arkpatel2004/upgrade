import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { Send, Bot, User, Loader2, Link2, Copy, Check, ArrowLeft, LogOut } from 'lucide-react';
import XpathApp from './XpathApp';

function App() {
  const [currentView, setCurrentView] = useState('dashboard');
  const [profileOpen, setProfileOpen] = useState(false);

  // Chatbot State
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Hello! I am your company's RAG Support Assistant. Paste a customer's query here, and I will draft a response based on our past emails.",
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [stages, setStages] = useState([]);

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (currentView === 'reply') scrollToBottom();
  }, [messages, currentView]);

  useEffect(() => {
    const fetchStages = async () => {
      try {
        const response = await axios.get('http://127.0.0.1:8000/api/stages');
        setStages(response.data || []);
      } catch (error) {
        console.error('Failed to load stages', error);
      }
    };
    fetchStages();
  }, []);

  // Close profile dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('#profile-btn')) setProfileOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    const userMessage = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);
    try {
      const response = await axios.post('http://127.0.0.1:8000/api/chat', { message: userMessage });
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: response.data.response, contextCount: response.data.retrieved_context_count }
      ]);
    } catch (error) {
      const errorMessage = error.response?.data?.detail || 'Sorry, I encountered an error communicating with the backend.';
      setMessages((prev) => [...prev, { role: 'assistant', content: errorMessage, isError: true }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStageClick = (stageName, stageMessage) => {
    setMessages((prev) => [
      ...prev,
      { role: 'user', content: `Send standard ${stageName} reply.` },
      { role: 'assistant', content: stageMessage, contextCount: 0 }
    ]);
  };

  const copyToClipboard = (text, index) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const textareaRef = useRef(null);
  const handleInput = (e) => {
    setInput(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  };

  // ── Shared Back Button ─────────────────────────────────────────
  const BackButton = () => (
    <button
      onClick={() => setCurrentView('dashboard')}
      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-emerald-500/20 border border-white/10 hover:border-emerald-500/40 text-gray-400 hover:text-emerald-400 transition-all text-sm font-medium"
    >
      <ArrowLeft className="w-4 h-4" />
      <span>Home</span>
    </button>
  );

  // ── DASHBOARD ─────────────────────────────────────────────────
  const renderDashboard = () => (
    <div className="min-h-screen w-full h-screen relative bg-black flex flex-col overflow-hidden">
      {/* Northern Aurora */}
      <div
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse 70% 55% at 50% 50%, rgba(255, 20, 147, 0.15), transparent 50%),
            radial-gradient(ellipse 160% 130% at 10% 10%, rgba(0, 255, 255, 0.12), transparent 60%),
            radial-gradient(ellipse 160% 130% at 90% 90%, rgba(138, 43, 226, 0.18), transparent 65%),
            radial-gradient(ellipse 110% 50% at 80% 30%, rgba(255, 215, 0, 0.08), transparent 40%),
            #000000
          `,
        }}
      />

      {/* Navbar */}
      <header className="relative z-10 flex items-center justify-between px-6 py-3 border-b border-white/5 bg-black/40 backdrop-blur-md shrink-0">
        <h1 className="text-base font-semibold tracking-wide text-gray-300">UpgradeAI</h1>

        {/* Profile Icon + Dropdown */}
        <div className="relative" id="profile-btn">
          <button
            onClick={() => setProfileOpen((v) => !v)}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-emerald-500/20 border border-white/10 hover:border-emerald-500/40 flex items-center justify-center transition-all"
            aria-label="Profile menu"
          >
            <User className="w-5 h-5 text-gray-300" />
          </button>

          {profileOpen && (
            <div className="absolute right-0 top-full mt-2 w-36 bg-[#141414] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50">
              <button
                className="flex items-center gap-2 w-full px-4 py-3 text-sm text-red-400 hover:bg-white/5 transition-colors"
                onClick={() => setProfileOpen(false)}
              >
                <LogOut className="w-4 h-4" />
                Signout
              </button>
            </div>
          )}
        </div>
      </header>

      {/* App Grid */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-8">
        <div className="grid grid-cols-2 gap-12 sm:gap-16">

          {/* Reply */}
          <div
            onClick={() => setCurrentView('reply')}
            className="flex flex-col items-center gap-4 cursor-pointer group"
          >
            <div
              className="w-24 h-24 sm:w-32 sm:h-32 rounded-3xl flex items-center justify-center transition-all duration-300 group-hover:scale-105"
              style={{
                background: "linear-gradient(135deg, rgba(16,185,129,0.15), rgba(88,28,235,0.15))",
                boxShadow: "0 0 30px rgba(16,185,129,0.25), 0 0 60px rgba(16,185,129,0.1), inset 0 1px 0 rgba(255,255,255,0.08)",
                border: "1px solid rgba(16,185,129,0.3)",
              }}
            >
              {/* Reply: speech bubble + bolt SVG */}
              <svg viewBox="0 0 64 64" className="w-16 h-16 sm:w-20 sm:h-20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="replyGrad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#10B981" />
                    <stop offset="100%" stopColor="#8B5CF6" />
                  </linearGradient>
                </defs>
                {/* Bubble */}
                <path d="M10 12C10 8.686 12.686 6 16 6H48C51.314 6 54 8.686 54 12V38C54 41.314 51.314 44 48 44H36L24 58V44H16C12.686 44 10 41.314 10 38V12Z" fill="url(#replyGrad)" opacity="0.9" />
                {/* Bolt */}
                <path d="M36 14L26 32H33L28 50L42 28H35L36 14Z" fill="white" opacity="0.95" />
              </svg>
            </div>
            <span className="text-gray-300 font-medium tracking-wide text-sm group-hover:text-emerald-400 transition-colors">Reply</span>
          </div>

          {/* Xpath */}
          <div
            onClick={() => setCurrentView('xpath')}
            className="flex flex-col items-center gap-4 cursor-pointer group"
          >
            <div
              className="w-24 h-24 sm:w-32 sm:h-32 rounded-3xl flex items-center justify-center transition-all duration-300 group-hover:scale-105"
              style={{
                background: "linear-gradient(135deg, rgba(249,115,22,0.15), rgba(236,72,153,0.15))",
                boxShadow: "0 0 30px rgba(249,115,22,0.2), 0 0 60px rgba(249,115,22,0.08), inset 0 1px 0 rgba(255,255,255,0.08)",
                border: "1px solid rgba(249,115,22,0.3)",
              }}
            >
              {/* Xpath: bold X SVG */}
              <svg viewBox="0 0 64 64" className="w-16 h-16 sm:w-20 sm:h-20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="xpathGrad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#F97316" />
                    <stop offset="100%" stopColor="#EC4899" />
                  </linearGradient>
                </defs>
                <line x1="10" y1="10" x2="54" y2="54" stroke="url(#xpathGrad)" strokeWidth="10" strokeLinecap="round" />
                <line x1="54" y1="10" x2="10" y2="54" stroke="url(#xpathGrad)" strokeWidth="10" strokeLinecap="round" />
              </svg>
            </div>
            <span className="text-gray-300 font-medium tracking-wide text-sm group-hover:text-orange-400 transition-colors">Xpath</span>
          </div>

        </div>
      </main>
    </div>
  );

  // ── REPLY APP ─────────────────────────────────────────────────
  const renderReplyApp = () => (
    <div className="flex flex-col h-screen w-screen bg-[#343541] text-gray-100 font-sans overflow-x-hidden">
      <header className="flex items-center gap-4 p-4 border-b border-white/10 bg-[#343541] z-10 sticky top-0 shrink-0">
        <BackButton />
        <div className="flex items-center gap-2 border-l border-white/10 pl-4">
          <Bot className="w-5 h-5 text-emerald-500" />
          <h1 className="text-lg font-semibold">RAG Support Copilot</h1>
        </div>
        <div className="ml-auto text-xs text-gray-400 font-mono bg-white/5 px-2 py-1 rounded hidden sm:block">
          Gemini 1.5
        </div>
      </header>

      <main className="flex-1 overflow-y-auto w-full flex flex-col items-center">
        <div className="w-full max-w-3xl flex flex-col p-4 pb-12 space-y-6 mt-4">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`flex max-w-[85%] gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                {msg.role === 'user' ? (
                  <>
                    <div className="flex-shrink-0 mt-1">
                      <div className="w-8 h-8 rounded-full bg-[#5436DA] flex items-center justify-center shadow-lg border border-white/10">
                        <User className="w-5 h-5 text-white" />
                      </div>
                    </div>
                    <div className="relative group px-5 py-3.5 rounded-2xl shadow-sm bg-[#5436DA] text-white rounded-tr-none">
                      <div className="prose prose-invert max-w-none text-[15px] whitespace-pre-wrap leading-relaxed">{msg.content}</div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex-shrink-0 mt-1">
                      <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg">
                        <Bot className="w-5 h-5 text-white" />
                      </div>
                    </div>
                    <div className={`relative group px-5 py-3.5 rounded-2xl shadow-sm ${msg.isError ? 'bg-red-500/20 text-red-200 border border-red-500/30 rounded-tl-none' : 'bg-[#444654] border border-white/5 rounded-tl-none'}`}>
                      <div className="prose prose-invert max-w-none text-[15px] whitespace-pre-wrap leading-relaxed">{msg.content}</div>
                      {msg.contextCount > 0 && (
                        <div className="flex items-center gap-1 mt-3 text-xs text-emerald-300 bg-emerald-900/30 w-fit px-2 py-1 rounded-md border border-emerald-500/20">
                          <Link2 className="w-3 h-3" />
                          <span>Drafted using {msg.contextCount} past company emails</span>
                        </div>
                      )}
                      {!msg.isError && (
                        <div className="absolute -right-10 top-2 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                          <button
                            onClick={() => copyToClipboard(msg.content, idx)}
                            className="p-1.5 text-gray-400 hover:text-white rounded-md hover:bg-white/10 transition-colors bg-[#343541] shadow-sm border border-white/5"
                            title="Copy response"
                          >
                            {copiedIndex === idx ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                          </button>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex w-full justify-start">
              <div className="flex max-w-[85%] gap-4">
                <div className="flex-shrink-0 mt-1">
                  <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                </div>
                <div className="flex items-center h-[52px] px-5 bg-[#444654] border border-white/5 rounded-2xl rounded-tl-none shadow-sm">
                  <Loader2 className="w-5 h-5 animate-spin text-emerald-500" />
                  <span className="ml-3 text-sm text-gray-400">Searching knowledge base...</span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </main>

      <div className="w-full flex flex-col items-center bg-[#343541] pt-4 pb-6 border-t border-white/5 relative z-10 shrink-0">
        <div className="w-full max-w-3xl px-4">
          {stages.length > 0 && (
            <div className="flex px-1 pb-3 gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden">
              {stages.map((stg, i) => (
                <button
                  key={i}
                  onClick={() => handleStageClick(stg.stage, stg.message)}
                  className="whitespace-nowrap px-4 py-1.5 text-xs font-medium bg-[#40414F] hover:bg-[#5436DA] border border-white/10 text-gray-300 hover:text-white rounded-full transition-colors shrink-0"
                >
                  {stg.stage}
                </button>
              ))}
            </div>
          )}
          <form
            onSubmit={handleSubmit}
            className="flex items-end gap-2 bg-[#40414F] border border-white/10 rounded-xl overflow-hidden focus-within:border-white/20 transition-colors"
          >
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleInput}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(e); } }}
              placeholder="Paste customer message here..."
              className="flex-1 max-h-52 bg-transparent border-0 p-4 resize-none focus:ring-0 focus:outline-none text-white text-[15px] leading-relaxed"
              rows={1}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="p-3 m-2 rounded-lg bg-emerald-500 text-white disabled:bg-white/10 disabled:text-gray-400 hover:bg-emerald-600 transition-colors"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
          <div className="text-center mt-3 text-xs text-gray-400">
            Copilot can make mistakes. Verify the generated response before sending to the customer.
          </div>
        </div>
      </div>
    </div>
  );

  // ── XPATH APP — delegated to XpathApp component ───────────────

  return (
    <>
      {currentView === 'dashboard' && renderDashboard()}
      {currentView === 'reply' && renderReplyApp()}
      {currentView === 'xpath' && <XpathApp onBack={() => setCurrentView('dashboard')} />}
    </>
  );
}

export default App;
