import React, { useState, useRef, useEffect } from "react";
import ImageComponent from "../../../../assets/index.jsx";
import ReactMarkdown from 'react-markdown';

export const AiAssistant = ({ onClose }) => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: "bot",
      text: "Hello! I am your AI Curriculum Assistant. I can help you with curriculum-based questions and compare your curriculum PDFs.",
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
    formData.append("prompt", "Compare these two curriculums and suggest improvements based on the model curriculum.");

    try {
      const response = await fetch(`${BASE_URL}/api/v1/ai/compare`, {
        method: "POST",
        body: formData,
      });
      const data = await response.json();

      const botMsg = {
        id: Date.now() + 1,
        type: "bot",
        text: data.reply || "Comparison complete.",
      };
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

  return (
    <div className="flex flex-col h-full w-full pt-4 relative bg-gray-50">
      <div className="flex-grow overflow-auto p-4 gap-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${
              message.type === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-[80%] p-3 rounded-lg ${
                message.type === "user"
                  ? "bg-blue-500 text-white rounded-br-none"
                  : "bg-white border border-gray-200 text-gray-800 rounded-bl-none shadow-sm"
              }`}
            >
              <div className="text-sm prose prose-sm max-w-none">
                <ReactMarkdown>{message.text}</ReactMarkdown>
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-200 p-3 rounded-lg rounded-bl-none animate-pulse">
              <span className="text-gray-500 text-sm">Thinking...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* File Upload Area */}
      <div className="p-2 bg-white border-t border-gray-200">
        <div className="flex gap-2 mb-2 overflow-x-auto">
            <div className="relative">
                <input
                    type="file"
                    accept=".pdf"
                    id="model-upload"
                    className="hidden"
                    onChange={(e) => handleFileUpload(e, 'model')}
                />
                <label
                    htmlFor="model-upload"
                    className={`cursor-pointer text-xs px-3 py-1 rounded-full border ${modelPdf ? 'bg-green-100 border-green-500 text-green-700' : 'bg-gray-100 border-gray-300 text-gray-600'}`}
                >
                    {modelPdf ? 'Model PDF ✓' : '+ Model PDF'}
                </label>
            </div>
            <div className="relative">
                <input
                    type="file"
                    accept=".pdf"
                    id="gen-upload"
                    className="hidden"
                    onChange={(e) => handleFileUpload(e, 'generated')}
                />
                <label
                    htmlFor="gen-upload"
                    className={`cursor-pointer text-xs px-3 py-1 rounded-full border ${generatedPdf ? 'bg-green-100 border-green-500 text-green-700' : 'bg-gray-100 border-gray-300 text-gray-600'}`}
                >
                    {generatedPdf ? 'Gen PDF ✓' : '+ Gen PDF'}
                </label>
            </div>
            {(modelPdf && generatedPdf) && (
                <button onClick={handleCompare} className="text-xs px-3 py-1 rounded-full bg-purple-100 border border-purple-500 text-purple-700 hover:bg-purple-200">
                    Compare Now
                </button>
            )}
        </div>

        <form
            onSubmit={handleSendMessage}
            className="flex items-center gap-2"
        >
            <input
            type="text"
            value={newMessage}
            onChange={(event) => setNewMessage(event.target.value)}
            className="flex-grow px-4 py-2 text-gray-700 bg-gray-100 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-300"
            placeholder="Ask about curriculum..."
            />
            <button
            type="submit"
            disabled={isLoading}
            className="p-2 text-white bg-blue-600 rounded-full hover:bg-blue-700 disabled:bg-blue-300 transition-colors"
            >
            {/* Send Icon */}
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
            </svg>
            </button>
        </form>
      </div>

      <button
        className="absolute top-2 right-2 p-1 rounded-full hover:bg-gray-200 transition-colors"
        onClick={onClose}
        title="Close"
      >
        <ImageComponent imageName="CloseImage" className="w-6 h-6" />
      </button>
    </div>
  );
};
