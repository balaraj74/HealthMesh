import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Send,
  Brain,
  User,
  Loader2,
  AlertTriangle,
  ThumbsUp,
  ThumbsDown,
  Copy,
  Check,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { ChatMessage, ClinicalCase } from "@shared/schema";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

function MessageBubble({
  message,
  onCopy
}: {
  message: ChatMessage;
  onCopy: (text: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  const isAssistant = message.role === "assistant";

  const handleCopy = () => {
    onCopy(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`flex gap-3 ${isAssistant ? "" : "flex-row-reverse"}`}>
      <Avatar className="h-8 w-8 flex-shrink-0">
        <AvatarFallback className={isAssistant ? "bg-primary/10" : "bg-muted"}>
          {isAssistant ? (
            <Brain className="h-4 w-4 text-primary" />
          ) : (
            <User className="h-4 w-4" />
          )}
        </AvatarFallback>
      </Avatar>
      <div className={`flex-1 max-w-[85%] ${isAssistant ? "" : "flex flex-col items-end"}`}>
        <div
          className={`rounded-lg p-4 ${isAssistant
            ? "bg-card border shadow-sm"
            : "bg-primary text-primary-foreground"
            }`}
        >
          {isAssistant ? (
            <div className="text-sm prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  h1: ({ node, ...props }) => <h1 className="text-lg font-bold mt-4 mb-2 text-primary border-b pb-1" {...props} />,
                  h2: ({ node, ...props }) => <h2 className="text-base font-bold mt-3 mb-2 text-primary" {...props} />,
                  h3: ({ node, ...props }) => <h3 className="text-sm font-bold mt-2 mb-1" {...props} />,
                  ul: ({ node, ...props }) => <ul className="list-disc pl-4 mb-2 space-y-1" {...props} />,
                  ol: ({ node, ...props }) => <ol className="list-decimal pl-4 mb-2 space-y-1" {...props} />,
                  li: ({ node, ...props }) => <li className="mb-0.5" {...props} />,
                  p: ({ node, ...props }) => <p className="mb-2 last:mb-0 leading-relaxed" {...props} />,
                  strong: ({ node, ...props }) => <strong className="font-bold text-foreground" {...props} />,
                  blockquote: ({ node, ...props }) => <blockquote className="border-l-4 border-primary/30 pl-4 italic my-2 text-muted-foreground" {...props} />,
                  code: ({ node, ...props }) => <code className="bg-muted px-1 py-0.5 rounded text-xs font-mono" {...props} />,
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          ) : (
            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
          )}
        </div>
        <div className={`flex items-center gap-2 mt-1 ${isAssistant ? "" : "flex-row-reverse"}`}>
          <span className="text-xs text-muted-foreground">
            {new Date(message.timestamp).toLocaleTimeString()}
          </span>
          {isAssistant && (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={handleCopy}
              >
                {copied ? (
                  <Check className="h-3 w-3 text-green-500" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </Button>
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <ThumbsUp className="h-3 w-3" />
              </Button>
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <ThumbsDown className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Chat() {
  const [selectedCaseId, setSelectedCaseId] = useState<string>("");
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const { data: casesData, isLoading: casesLoading, error: casesError } = useQuery<{ success: boolean; data: ClinicalCase[] }>({
    queryKey: ["/api/cases"],
    refetchInterval: 15000, // Refresh every 15 seconds
  });

  const cases = casesData?.data ?? [];

  const { data: messagesData, isLoading: messagesLoading, error: messagesError } = useQuery<{ success: boolean; data: ChatMessage[] }>({
    queryKey: ["/api/chat", selectedCaseId],
    enabled: !!selectedCaseId,
    refetchInterval: 5000, // Refresh chat every 5 seconds for real-time
  });

  const messages = messagesData?.data ?? [];

  const sendMutation = useMutation({
    mutationFn: async (content: string) => {
      const response = await apiRequest("POST", "/api/chat", {
        caseId: selectedCaseId,
        content,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat", selectedCaseId] });
      setInput("");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send message.",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    if (!input.trim() || !selectedCaseId) return;
    sendMutation.mutate(input.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "Message copied to clipboard.",
    });
  };

  const casesList = Array.isArray(cases) ? cases : [];
  const activeCases = casesList.filter((c: any) =>
    c.status === "active" || c.status === "analyzing" || c.status === "review-ready" || c.status === "submitted" || c.status === "draft" || c.status === "pending"
  );

  return (
    <div className="p-6 h-full flex flex-col">
      <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h1 className="text-3xl font-semibold">Clinician Chat</h1>
          <p className="text-muted-foreground">Interact with the AI clinical assistant</p>
        </div>
        <Select value={selectedCaseId} onValueChange={setSelectedCaseId}>
          <SelectTrigger className="w-64" data-testid="select-case">
            <SelectValue placeholder={casesError ? "Error loading cases" : "Select a case to discuss"} />
          </SelectTrigger>
          <SelectContent>
            {casesError ? (
              <SelectItem value="error" disabled>Failed to load cases</SelectItem>
            ) : activeCases.length === 0 ? (
              <SelectItem value="none" disabled>No active cases</SelectItem>
            ) : (
              activeCases.map((c: any) => (
                <SelectItem key={c.id} value={c.id}>
                  Case #{c.id.slice(0, 8)} - {c.caseType.replace("-", " ")}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </div>

      <Card className="flex-1 flex flex-col min-h-0">
        {!selectedCaseId ? (
          <CardContent className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Brain className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Select a Case</h3>
              <p className="text-sm text-muted-foreground max-w-md">
                Choose an active clinical case to start a conversation with the AI assistant.
                Ask questions, request clarifications, or provide feedback on recommendations.
              </p>
            </div>
          </CardContent>
        ) : (
          <>
            <CardHeader className="border-b">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-lg">
                    Case #{selectedCaseId.slice(0, 8)}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    AI Clinician Interaction Agent
                  </p>
                </div>
                <Badge variant="outline" className="gap-1">
                  <span className="w-2 h-2 rounded-full bg-green-500" />
                  Online
                </Badge>
              </div>
            </CardHeader>

            <ScrollArea className="flex-1 p-4" ref={scrollRef}>
              <div className="space-y-4">
                {messagesError ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <AlertTriangle className="h-8 w-8 text-destructive mb-2" />
                    <p className="font-medium text-destructive">Failed to load messages</p>
                    <p className="text-sm text-muted-foreground">{messagesError instanceof Error ? messagesError.message : "Unknown error"}</p>
                    <Button variant="outline" size="sm" className="mt-4" onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/chat", selectedCaseId] })}>
                      Retry
                    </Button>
                  </div>
                ) : messagesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : messages && messages.length > 0 ? (
                  messages.map((msg: any) => (
                    <MessageBubble key={msg.id} message={msg} onCopy={handleCopy} />
                  ))
                ) : (
                  <div className="text-center py-8">
                    <p className="text-sm text-muted-foreground">
                      Start a conversation about this case. Ask about recommendations,
                      request explanations, or provide clinical feedback.
                    </p>
                  </div>
                )}
                {sendMutation.isPending && (
                  <div className="flex gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-primary/10">
                        <Brain className="h-4 w-4 text-primary animate-pulse" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="bg-muted rounded-lg p-3">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            <div className="p-4 border-t">
              <div className="flex gap-2">
                <Textarea
                  placeholder="Ask a question about this case..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="min-h-10 max-h-32 resize-none"
                  data-testid="input-chat-message"
                />
                <Button
                  onClick={handleSend}
                  disabled={!input.trim() || sendMutation.isPending}
                  data-testid="button-send-message"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Press Enter to send, Shift+Enter for new line
              </p>
            </div>
          </>
        )}
      </Card>

      <Card className="mt-4 bg-primary/5 border-primary/20">
        <CardContent className="py-3">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-4 w-4 text-primary flex-shrink-0" />
            <p className="text-xs text-muted-foreground">
              This is an AI assistant providing decision support. All recommendations
              must be reviewed by qualified healthcare professionals before clinical action.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
