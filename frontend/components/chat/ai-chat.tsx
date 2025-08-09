"use client"
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Message = { id: string; role: "user" | "assistant"; content: string };

export function AIChat({ seed }: { seed?: string }) {
  const [messages, setMessages] = useState<Message[]>(seed ? [{ id: "m1", role: "assistant", content: seed }] : []);
  const [input, setInput] = useState("");

  function send() {
    if (!input.trim()) return;
    const userMsg: Message = { id: `u-${Date.now()}`, role: "user", content: input };
    const assistantMsg: Message = {
      id: `a-${Date.now()}`,
      role: "assistant",
      content: `Mock AI: responding to "${input}" with insights about agronomy and local conditions.`,
    };
    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setInput("");
  }

  return (
    <div className="flex flex-col h-80 border rounded-md">
      <div className="flex-1 overflow-auto p-3 space-y-2">
        {messages.map((m) => (
          <div key={m.id} className={m.role === "assistant" ? "text-sm bg-accent/60 p-2 rounded" : "text-sm bg-secondary p-2 rounded"}>
            <span className="font-medium mr-2">{m.role === "assistant" ? "AI" : "You"}:</span>
            <span>{m.content}</span>
          </div>
        ))}
      </div>
      <div className="p-2 flex gap-2 border-t">
        <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask about the recommendation..." onKeyDown={(e) => { if (e.key === "Enter") send(); }} />
        <Button onClick={send}>Send</Button>
      </div>
    </div>
  );
}


