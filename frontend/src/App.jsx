import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { Send, Bot, User, Loader2, Link2, Copy, Check } from 'lucide-react';

function App() {
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
    scrollToBottom();
  }, [messages]);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await axios.post('http://127.0.0.1:8000/api/chat', {
        message: userMessage
      });

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: response.data.response,
          contextCount: response.data.retrieved_context_count
        }
      ]);
    } catch (error) {
      console.error('Error fetching response:', error);
      const errorMessage = error.response?.data?.detail || 'Sorry, I encountered an error communicating with the backend. Please ensure the FastAPI server is running.';
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: errorMessage,
          isError: true
        }
      ]);
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

  return (
    <div className="flex flex-col h-screen w-screen bg-[#343541] text-gray-100 font-sans overflow-x-hidden">

      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b border-white/10 bg-[#343541] z-10 sticky top-0">
        <div className="flex items-center gap-2">
          <Bot className="w-6 h-6 text-emerald-500" />
          <h1 className="text-xl font-semibold">RAG Support Copilot</h1>
        </div>
        <div className="text-xs text-gray-400 font-mono bg-white/5 px-2 py-1 rounded">
          Gemini 1.5 + Vector DB
        </div>
      </header>

      {/* Main Chat Area */}
      <main className="flex-1 overflow-y-auto w-full flex flex-col items-center">
        <div className="w-full max-w-3xl flex flex-col p-4 pb-12 space-y-6 mt-4">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`flex max-w-[85%] gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                {/* User variant: bubble then avatar (reverse) */}
                {msg.role === 'user' ? (
                  <>
                    <div className="flex-shrink-0 mt-1">
                      <div className="w-8 h-8 rounded-full bg-[#5436DA] flex items-center justify-center shadow-lg border border-white/10">
                        <User className="w-5 h-5 text-white" />
                      </div>
                    </div>
                    <div className="relative group px-5 py-3.5 rounded-2xl shadow-sm bg-[#5436DA] text-white rounded-tr-none">
                      <div className="prose prose-invert max-w-none text-[15px] whitespace-pre-wrap leading-relaxed">
                        {msg.content}
                      </div>
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
                      <div className="prose prose-invert max-w-none text-[15px] whitespace-pre-wrap leading-relaxed">
                        {msg.content}
                      </div>

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
              <div className="flex max-w-[85%] gap-4 justify-start">
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

      {/* Input Area */}
      <div className="w-full flex flex-col items-center bg-[#343541] pt-4 pb-6 border-t border-white/5 relative z-10 shadow-[0_-15px_40px_rgba(0,0,0,0.1)]">
        <div className="w-full max-w-3xl px-4">

          {/* Quick Stages Row */}
          {stages.length > 0 && (
            <div className="flex px-1 pb-3 gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']">
              {stages.map((stg, i) => (
                <button
                  key={i}
                  onClick={() => handleStageClick(stg.stage, stg.message)}
                  className="whitespace-nowrap px-4 py-1.5 text-xs font-medium bg-[#40414F] hover:bg-[#5436DA] border border-white/10 text-gray-300 hover:text-white rounded-full transition-colors flex items-center justify-center shrink-0 shadow-sm"
                >
                  {stg.stage}
                </button>
              ))}
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            className="flex items-end gap-2 bg-[#40414F] border border-white/10 rounded-xl overflow-hidden shadow-[0_0_15px_rgba(0,0,0,0.1)] focus-within:border-white/20 transition-colors"
          >
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleInput}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              placeholder="Paste customer message here..."
              className="flex-1 max-h-52 bg-transparent border-0 p-4 pt-4 resize-none focus:ring-0 focus:outline-none text-white text-[15px] leading-relaxed"
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
}

export default App;
