import { useState, useRef, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { pichaChat, smartlivaChat, ApiError } from "../lib/api";
import {
  Send,
  Bot,
  User,
  Loader2,
  MessageSquare,
  X,
  Maximize2,
  Minimize2,
} from "lucide-react";

function ChatMessage({ msg }) {
  const isUser = msg.role === "user";
  return (
    <div
      className={`flex gap-2.5 ${isUser ? "flex-row-reverse" : "flex-row"} mb-3`}
    >
      <div
        className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 border ${
          isUser
            ? "bg-[var(--surface-2)] border-[var(--line-strong)]"
            : "bg-blue-500/20 border-blue-500/40"
        }`}
      >
        {isUser ? (
          <User className="w-3.5 h-3.5 text-[var(--text)]" />
        ) : (
          <Bot className="w-3.5 h-3.5 text-blue-400" />
        )}
      </div>
      <div
        className={`max-w-[85%] p-3 rounded-xl text-sm leading-relaxed border ${
          isUser
            ? "bg-[var(--surface-2)] text-[var(--text)] border-[var(--line)] rounded-tr-sm"
            : "bg-[var(--surface)] border-[var(--line)] text-[var(--text)] rounded-tl-sm whitespace-pre-line"
        }`}
      >
        {msg.typing ? (
          <span className="flex gap-1 items-center text-[var(--muted)] text-xs font-semibold">
            APEX Copilot is thinking
            {[0, 150, 300].map((d) => (
              <span
                key={d}
                className="w-1 h-1 bg-blue-400 rounded-full animate-bounce"
                style={{ animationDelay: `${d}ms` }}
              />
            ))}
          </span>
        ) : (
          <div
            dangerouslySetInnerHTML={{
              __html: msg.content
                .replace(/\n/g, "<br/>")
                .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>"),
            }}
          />
        )}
      </div>
    </div>
  );
}

export default function UnifiedChat() {
  const { id: patientId, module } = useParams();
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [input, setInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef(null);

  // Maintain separate conversation history or a unified one.
  // For a unified experience, we keep one array.
  const MODULE_GREET = {
    axia: "**APEX Copilot** online — Brain CT context loaded.\nI can help interpret hemorrhage findings, stroke patterns, and midline shift measurements for this study.",
    smartliva: "**APEX Copilot** online — Liver Ultrasound context loaded.\nAsk me about fibrosis staging, lesion characterization, or follow-up recommendations.",
    picha: "**APEX Copilot** online — Digital Pathology context loaded.\nI can explain the MARS agent findings, grading rationale, or treatment recommendations.",
  };

  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: MODULE_GREET[module] ||
        "**APEX Copilot** online.\nHow can I assist with the current clinical study?",
    },
  ]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOpen, isExpanded]);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || chatLoading) return;
    const userText = input.trim();
    const userMsg = { role: "user", content: userText };
    setInput("");
    setMessages((prev) => [
      ...prev,
      userMsg,
      { role: "assistant", typing: true },
    ]);
    setChatLoading(true);

    try {
      let replyText = "";

      const cleanHistory = messages.filter((m) => !m.typing);

      if (module === "picha") {
        const res = await pichaChat(userText, patientId);
        replyText = res.reply || res.message || "Unable to reach the PICHA pathology agent. Please try again.";
      } else {
        // Both 'smartliva' and 'axia' route to the SmartLiva chat backend.
        // For AXIA, we prepend a context primer so the model answers in a
        // neuroimaging frame rather than a hepatology frame.
        let history = cleanHistory.map((m) => ({
          role: m.role,
          content: m.content || "",
        }));

        if (module === "axia" && history.length === 1) {
          history = [
            {
              role: "user",
              content:
                "SYSTEM CONTEXT: You are APEX Copilot, a general clinical AI assistant. The clinician is currently reviewing a Brain CT study (AXIA module). Please respond with neuroimaging expertise.",
            },
            {
              role: "assistant",
              content:
                "Understood. I am ready to assist with Brain CT interpretation, hemorrhage grading, stroke assessment, and neurosurgical planning.",
            },
            ...history.slice(1),
          ];
        }

        history.push({ role: "user", content: userText });
        const res = await smartlivaChat(history, "en");
        replyText = res.reply || res.message || "Unable to reach the APEX AI backend. Please try again.";
      }

      setMessages((prev) => [
        ...prev.slice(0, -1),
        { role: "assistant", content: replyText },
      ]);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev.slice(0, -1),
        {
          role: "assistant",
          content: "Connection error. Please check that the backend services are running and try again.",
        },
      ]);
    } finally {
      setChatLoading(false);
    }
  }, [input, chatLoading, module, patientId, messages]);

  // If we are not in a patient context, don't render the chat
  if (!patientId) return null;

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 hover:bg-blue-500 rounded-full shadow-xl flex items-center justify-center text-white transition-transform hover:scale-105 z-50"
      >
        <MessageSquare className="w-6 h-6" />
      </button>
    );
  }

  return (
    <div
      className={`fixed bottom-6 right-6 bg-[var(--surface)] border border-[var(--line)] shadow-2xl rounded-xl flex flex-col z-50 transition-all duration-300 ${
        isExpanded ? "w-[450px] h-[600px]" : "w-[350px] h-[450px]"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-[var(--line)] bg-[var(--surface-2)] rounded-t-xl">
        <div className="flex items-center space-x-2">
          <Bot className="w-5 h-5 text-blue-500" />
          <div>
            <h3 className="font-bold text-sm text-[var(--text)]">
              APEX Copilot
            </h3>
            <p className="text-[10px] text-[var(--muted)]">
              Context: {module ? module.toUpperCase() : "Global"} | {patientId}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-1">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 text-[var(--muted)] hover:text-[var(--text)] rounded transition-colors"
          >
            {isExpanded ? (
              <Minimize2 className="w-4 h-4" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1.5 text-[var(--muted)] hover:text-[var(--text)] rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 bg-[var(--bg)]">
        {messages.map((msg, idx) => (
          <ChatMessage key={idx} msg={msg} />
        ))}
        <div ref={chatEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-3 border-t border-[var(--line)] bg-[var(--surface)] rounded-b-xl">
        <div className="flex items-center space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
            placeholder="Ask Copilot..."
            className="flex-1 bg-[var(--surface-2)] border border-[var(--line)] rounded-lg px-3 py-2 text-sm text-[var(--text)] focus:outline-none focus:border-blue-500"
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || chatLoading}
            className="p-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg transition-colors"
          >
            {chatLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
