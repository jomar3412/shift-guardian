import { useState, useRef, useEffect, useCallback } from "react";
import { useShift } from "@/context/ShiftContext";
import { useApp } from "@/context/AppContext";
import { getComplianceInfo, getMinutesToFifthHour, getActiveCountByRole } from "@/lib/compliance";
import { Bot, Send, X, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";

type Msg = { role: "user" | "assistant"; content: string };

const QUICK_PROMPTS = [
  "Who should go to lunch next?",
  "Is coverage safe right now?",
  "Who can cover self-checkout?",
];

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/shift-assistant`;

export function ShiftAssistant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const { employees } = useShift();
  const { subRoles, employeeRecords, primaryRoles } = useApp();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  const buildShiftContext = useCallback(() => {
    const activeEmps = employees.filter(e => e.status === "active" || e.lunchStatus === "on_lunch");
    return {
      currentTime: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true }),
      employees: activeEmps.map(emp => {
        const info = getComplianceInfo(emp);
        const record = employeeRecords.find(r => r.id === emp.employeeRecordId);
        const primaryRole = primaryRoles.find(r => r.id === emp.primaryRoleId);
        const currentSub = subRoles.find(r => r.id === emp.currentAssignmentId);
        const qualifiedRoles = record?.qualifications.map(q => subRoles.find(s => s.id === q.subRoleId)?.name).filter(Boolean) || [];

        return {
          name: emp.name,
          primaryRole: primaryRole?.name || "Unknown",
          currentAssignment: currentSub?.name || "Unassigned",
          scheduledStart: emp.scheduledStart,
          scheduledEnd: emp.scheduledEnd,
          lunchStatus: emp.lunchStatus,
          breakStatus: emp.breakStatus,
          complianceLevel: info.level,
          hoursWorked: Math.round(info.hoursWorked * 100) / 100,
          minutesToFifthHour: Math.round(getMinutesToFifthHour(emp)),
          qualifiedRoles,
        };
      }),
      coverageStatus: subRoles.filter(r => r.coverageProtection).map(role => ({
        role: role.name,
        activeCount: getActiveCountByRole(employees, role.id),
        minCoverage: role.minCoverage,
        isBelowMin: getActiveCountByRole(employees, role.id) < role.minCoverage,
      })),
      totalActive: activeEmps.filter(e => e.status === "active").length,
      onLunch: activeEmps.filter(e => e.lunchStatus === "on_lunch").length,
    };
  }, [employees, subRoles, employeeRecords, primaryRoles]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMsg: Msg = { role: "user", content: text.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    let assistantSoFar = "";
    const allMessages = [...messages, userMsg];

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: allMessages.map(m => ({ role: m.role, content: m.content })),
          shiftContext: buildShiftContext(),
        }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Request failed" }));
        toast({ title: "Assistant Error", description: err.error || "Something went wrong", variant: "destructive" });
        setIsLoading(false);
        return;
      }

      if (!resp.body) throw new Error("No response body");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantSoFar += content;
              setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant") {
                  return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantSoFar } : m);
                }
                return [...prev, { role: "assistant", content: assistantSoFar }];
              });
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }
    } catch (e) {
      console.error("Assistant error:", e);
      toast({ title: "Connection Error", description: "Could not reach the assistant.", variant: "destructive" });
    }

    setIsLoading(false);
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 active:scale-95"
        aria-label="Open shift assistant"
      >
        <Sparkles className="h-6 w-6" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex w-[380px] max-w-[calc(100vw-2rem)] flex-col rounded-2xl border border-border bg-card shadow-2xl"
      style={{ height: "min(560px, calc(100vh - 6rem))" }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
          <Bot className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-foreground">Shift Assistant</h3>
          <p className="text-xs text-muted-foreground">AI-powered scheduling help</p>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setOpen(false)}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.length === 0 && (
          <div className="space-y-3 pt-4">
            <p className="text-center text-sm text-muted-foreground">
              Ask about lunch scheduling, coverage, or compliance.
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {QUICK_PROMPTS.map(p => (
                <button
                  key={p}
                  onClick={() => sendMessage(p)}
                  className="rounded-full border border-border bg-muted/50 px-3 py-1.5 text-xs text-foreground transition-colors hover:bg-muted"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground rounded-br-md"
                  : "bg-muted text-foreground rounded-bl-md"
              }`}
            >
              {msg.role === "assistant" ? (
                <div className="prose prose-sm dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              ) : (
                msg.content
              )}
            </div>
          </div>
        ))}

        {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-bl-md bg-muted px-3.5 py-2.5">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-border p-3">
        <form
          onSubmit={e => { e.preventDefault(); sendMessage(input); }}
          className="flex items-center gap-2"
        >
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Ask about scheduling..."
            className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            disabled={isLoading}
          />
          <Button type="submit" size="icon" className="h-9 w-9 rounded-xl" disabled={!input.trim() || isLoading}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
