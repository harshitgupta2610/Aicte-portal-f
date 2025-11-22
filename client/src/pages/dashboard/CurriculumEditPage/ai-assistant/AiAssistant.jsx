import React, { useState, useRef, useEffect } from "react";
import ImageComponent from "../../../../assets/index.jsx";
import ReactMarkdown from 'react-markdown';

export const AiAssistant = ({ onClose }) => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: "bot",
      text: "Hello! I am your **AI Curriculum Assistant**. I can help you with curriculum-based questions and compare your curriculum PDFs.",
    },
  ]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [modelPdf, setModelPdf] = useState(null);
  const [generatedPdf, setGeneratedPdf] = useState(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const BASE_URL = process.env.REACT_APP_URL || "http://localhost:8080";

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const userMsg = {
      id: Date.now(),
      type: "user",
      text: newMessage,
    };

    setMessages((prev) => [...prev, userMsg]);
    setNewMessage("");
    setIsLoading(true);

    try {
      const response = await fetch(`${BASE_URL}/api/v1/ai/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: newMessage }),
      });
      const data = await response.json();
      
      const botMsg = {
        id: Date.now() + 1,
        type: "bot",
        text: data.reply || "I'm sorry, I couldn't process that.",
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (error) {
      console.error("Error sending message:", error);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          type: "bot",
          text: "Sorry, something went wrong. Please check your connection and API key.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    if (type === 'model') setModelPdf(file);
    else setGeneratedPdf(file);

    const userMsg = {
      id: Date.now(),
      type: "user",
      text: `Uploaded ${type === 'model' ? 'Model' : 'Generated'} Curriculum: ${file.name}`,
    };
    setMessages((prev) => [...prev, userMsg]);
  };

  const handleCompare = async () => {
    if (!modelPdf || !generatedPdf) {
      alert("Please upload both Model and Generated PDFs to compare.");
      return;
    }

    const userMsg = {
      id: Date.now(),
      type: "user",
      text: "Please compare the uploaded curriculums.",
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    const formData = new FormData();
    formData.append("modelPdf", modelPdf);
    formData.append("generatedPdf", generatedPdf);

    try {
      const response = await fetch(`${BASE_URL}/api/v1/ai/compare`, {
        method: "POST",
        body: formData,
      });
      const data = await response.json();

      let botMsg;
      if (data.reply && typeof data.reply === 'object') {
          // Handle structured JSON response
          botMsg = {
              id: Date.now() + 1,
              type: "bot",
              isComparison: true,
              data: data.reply
          };
      } else {
          // Fallback for plain text
          botMsg = {
              id: Date.now() + 1,
              type: "bot",
              text: data.reply || "Comparison complete.",
          };
      }
      
      setMessages((prev) => [...prev, botMsg]);
    } catch (error) {
        console.error("Error comparing:", error);
        setMessages((prev) => [
            ...prev,
            {
              id: Date.now() + 1,
              type: "bot",
              text: "Error during comparison.",
            },
          ]);
    } finally {
        setIsLoading(false);
    }
  };

  const renderComparisonResult = (data) => {
      const score = parseFloat(data.similarityScore);
      let colorClass = "text-red-600";
      let bgClass = "bg-red-50 border-red-200";
      if (score >= 80) {
          colorClass = "text-emerald-600";
          bgClass = "bg-emerald-50 border-emerald-200";
      }
      else if (score >= 50) {
          colorClass = "text-amber-600";
          bgClass = "bg-amber-50 border-amber-200";
      }

      return (
          <div className="flex flex-col gap-4 w-full">
              {/* Score Card */}
              <div className={`flex items-center justify-between p-4 rounded-xl border ${bgClass} shadow-sm`}>
                  <div className="flex flex-col">
                      <span className="text-sm font-medium text-gray-600 uppercase tracking-wide">Similarity Score</span>
                      <span className="text-xs text-gray-500">Based on content embeddings</span>
                  </div>
                  <div className={`text-3xl font-bold ${colorClass}`}>
                      {data.similarityScore}%
                  </div>
              </div>
              
              {/* Analysis Section */}
              <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                  <h4 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                      <span className="w-1 h-4 bg-blue-500 rounded-full"></span>
                      Analysis
                  </h4>
                  <p className="text-sm text-gray-600 leading-relaxed">{data.analysis}</p>
              </div>

              {/* Differences */}
              {data.keyDifferences && data.keyDifferences.length > 0 && (
                  <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                      <h4 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                          <span className="w-1 h-4 bg-rose-500 rounded-full"></span>
                          Key Differences
                      </h4>
                      <ul className="space-y-2">
                          {data.keyDifferences.map((diff, i) => (
                              <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                                  <span className="mt-1.5 w-1.5 h-1.5 bg-rose-400 rounded-full flex-shrink-0"></span>
                                  {diff}
                              </li>
                          ))}
                      </ul>
                  </div>
              )}

              {/* Missing Topics */}
              {data.missingTopics && data.missingTopics.length > 0 && (
                  <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                      <h4 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                          <span className="w-1 h-4 bg-amber-500 rounded-full"></span>
                          Missing Topics
                      </h4>
                      <div className="flex flex-wrap gap-2">
                          {data.missingTopics.map((topic, i) => (
                              <span key={i} className="px-2.5 py-1 text-xs font-medium bg-amber-50 text-amber-700 rounded-md border border-amber-100">
                                  {topic}
                              </span>
                          ))}
                      </div>
                  </div>
              )}

              {/* Suggestions */}
              {data.suggestions && data.suggestions.length > 0 && (
                  <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                      <h4 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                          <span className="w-1 h-4 bg-indigo-500 rounded-full"></span>
                          Suggestions
                      </h4>
                      <ul className="space-y-2">
                          {data.suggestions.map((suggestion, i) => (
                              <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                                  <span className="mt-1.5 w-1.5 h-1.5 bg-indigo-400 rounded-full flex-shrink-0"></span>
                                  {suggestion}
                              </li>
                          ))}
                      </ul>
                  </div>
              )}
          </div>
      );
  };

  return (
    <div className="flex flex-col h-full w-full relative bg-gradient-to-br from-gray-50 to-blue-50/30 font-sans">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 h-16 bg-white/80 backdrop-blur-md border-b border-gray-200/50 flex items-center justify-between px-6 z-10">
          <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                      <path d="M16.5 7.5h-9v9h9v-9z" />
                      <path fillRule="evenodd" d="M8.25 2.25A.75.75 0 019 3v.75h2.25V3a.75.75 0 011.5 0v.75H15V3a.75.75 0 011.5 0v.75h.75a3 3 0 013 3v.75H21A.75.75 0 0121 9h-.75v2.25H21a.75.75 0 010 1.5h-.75V15H21a.75.75 0 010 1.5h-.75v.75a3 3 0 01-3 3h-.75V21a.75.75 0 01-1.5 0v-.75h-2.25V21a.75.75 0 01-1.5 0v-.75H9V21a.75.75 0 01-1.5 0v-.75h-.75a3 3 0 01-3-3v-.75H3A.75.75 0 013 15h.75v-2.25H3a.75.75 0 010-1.5h.75V9H3a.75.75 0 010-1.5h.75V6.75a3 3 0 013-3h.75V3a.75.75 0 01.75-.75zM6 6.75A1.5 1.5 0 017.5 5.25h9A1.5 1.5 0 0118 6.75v9A1.5 1.5 0 0116.5 17.25h-9A1.5 1.5 0 016 15.75v-9z" clipRule="evenodd" />
                  </svg>
              </div>
              <span className="font-bold text-gray-800 text-lg tracking-tight">AI Assistant</span>
          </div>
          <button
            className="p-2 rounded-full hover:bg-gray-100 text-gray-500 transition-colors"
            onClick={onClose}
            title="Close"
          >
            <ImageComponent imageName="CloseImage" className="w-5 h-5" />
          </button>
      </div>

      {/* Chat Area */}
      <div className="flex-grow overflow-y-auto p-6 pt-20 pb-32 gap-y-6 flex flex-col scroll-smooth">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex w-full ${
              message.type === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div className={`flex max-w-[85%] gap-3 ${message.type === "user" ? "flex-row-reverse" : "flex-row"}`}>
                {/* Avatar */}
                <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold shadow-sm ${
                    message.type === "user" 
                    ? "bg-gray-800 text-white" 
                    : "bg-white text-blue-600 border border-blue-100"
                }`}>
                    {message.type === "user" ? "U" : "AI"}
                </div>

                {/* Message Bubble */}
                <div
                className={`p-4 rounded-2xl shadow-sm text-sm leading-relaxed ${
                    message.type === "user"
                    ? "bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-tr-none"
                    : "bg-white border border-gray-100 text-gray-700 rounded-tl-none"
                }`}
                >
                {message.isComparison ? (
                    renderComparisonResult(message.data)
                ) : (
                    <div className={`prose prose-sm max-w-none ${message.type === "user" ? "prose-invert" : ""}`}>
                        <ReactMarkdown>{message.text}</ReactMarkdown>
                    </div>
                )}
                </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start w-full">
             <div className="flex max-w-[85%] gap-3">
                <div className="w-8 h-8 rounded-full bg-white text-blue-600 border border-blue-100 flex-shrink-0 flex items-center justify-center text-xs font-bold shadow-sm">AI</div>
                <div className="bg-white border border-gray-100 p-4 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
             </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input & Upload Area */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-white via-white to-transparent">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200/60 p-3 backdrop-blur-xl">
            {/* File Chips */}
            <div className="flex gap-2 mb-3 overflow-x-auto pb-1 px-1">
                <div className="relative group">
                    <input
                        type="file"
                        accept=".pdf"
                        id="model-upload"
                        className="hidden"
                        onChange={(e) => handleFileUpload(e, 'model')}
                    />
                    <label
                        htmlFor="model-upload"
                        className={`cursor-pointer text-xs font-medium px-4 py-2 rounded-xl border transition-all flex items-center gap-2 ${
                            modelPdf 
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-700 shadow-sm' 
                            : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                        }`}
                    >
                        {modelPdf ? (
                            <>
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                                Model PDF
                            </>
                        ) : (
                            <>
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                                Model PDF
                            </>
                        )}
                    </label>
                </div>

                <div className="relative group">
                    <input
                        type="file"
                        accept=".pdf"
                        id="gen-upload"
                        className="hidden"
                        onChange={(e) => handleFileUpload(e, 'generated')}
                    />
                    <label
                        htmlFor="gen-upload"
                        className={`cursor-pointer text-xs font-medium px-4 py-2 rounded-xl border transition-all flex items-center gap-2 ${
                            generatedPdf 
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-700 shadow-sm' 
                            : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                        }`}
                    >
                        {generatedPdf ? (
                            <>
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                                Gen PDF
                            </>
                        ) : (
                            <>
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                                Gen PDF
                            </>
                        )}
                    </label>
                </div>

                {(modelPdf && generatedPdf) && (
                    <button 
                        onClick={handleCompare} 
                        className="text-xs font-bold px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md shadow-purple-500/30 hover:shadow-lg hover:scale-105 transition-all flex items-center gap-2"
                    >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
                        Compare Now
                    </button>
                )}
            </div>

            {/* Input Form */}
            <form
                onSubmit={handleSendMessage}
                className="flex items-center gap-2"
            >
                <input
                type="text"
                value={newMessage}
                onChange={(event) => setNewMessage(event.target.value)}
                className="flex-grow px-5 py-3 text-gray-700 bg-gray-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:bg-white transition-all placeholder-gray-400"
                placeholder="Ask about curriculum..."
                />
                <button
                type="submit"
                disabled={isLoading || !newMessage.trim()}
                className="p-3 text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl hover:shadow-lg hover:shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform active:scale-95"
                >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                    <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
                </svg>
                </button>
            </form>
        </div>
      </div>
    </div>
  );
};
