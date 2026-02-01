import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useMessaging } from "@/hooks/useMessaging";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  ArrowLeft, 
  Send, 
  Loader2, 
  MessageCircle, 
  Lock,
  WifiOff 
} from "lucide-react";
import { cn } from "@/lib/utils";

const Messages = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [messageInput, setMessageInput] = useState("");
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    conversations,
    currentConversation,
    messages,
    loading,
    sendingMessage,
    fetchConversations,
    fetchMessages,
    sendMessage,
    setCurrentConversation,
    encryptionReady,
  } = useMessaging(user?.id);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchConversations();
    }
  }, [user, fetchConversations]);

  useEffect(() => {
    if (currentConversation?.id) {
      fetchMessages(currentConversation.id);
    }
  }, [currentConversation?.id, fetchMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Online/offline detection
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !currentConversation || !user) return;

    const recipientId =
      currentConversation.participant_one === user.id
        ? currentConversation.participant_two
        : currentConversation.participant_one;

    const success = await sendMessage(
      currentConversation.id,
      messageInput.trim(),
      recipientId
    );

    if (success) {
      setMessageInput("");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Conversation list view
  if (!currentConversation) {
    return (
      <div className="min-h-screen bg-background pb-20 md:pb-4 md:pt-20">
        <Navbar />

        <div className="container mx-auto px-4 pt-6 max-w-2xl">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-foreground">Messages</h1>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Lock className="h-3 w-3" />
              <span>End-to-end encrypted</span>
            </div>
          </div>

          {/* Offline indicator */}
          {!isOnline && (
            <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg flex items-center gap-2 text-yellow-500">
              <WifiOff className="h-4 w-4" />
              <span className="text-sm">You're offline. Messages will be sent when you reconnect.</span>
            </div>
          )}

          {/* Encryption loading */}
          {!encryptionReady && (
            <div className="mb-4 p-3 bg-primary/10 border border-primary/20 rounded-lg flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">Setting up secure messaging...</span>
            </div>
          )}

          {/* Conversations list */}
          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="text-center py-20">
              <MessageCircle className="h-16 w-16 mx-auto mb-4 text-muted-foreground/30" />
              <p className="text-muted-foreground mb-2">No conversations yet</p>
              <p className="text-sm text-muted-foreground/70">
                Start a conversation from someone's profile
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => setCurrentConversation(conv)}
                  className="w-full p-4 bg-card border border-border rounded-xl hover:border-primary/50 transition-all duration-200 flex items-center gap-4"
                >
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={conv.otherUser?.avatar_url || undefined} />
                    <AvatarFallback className="bg-gradient-primary text-background">
                      {conv.otherUser?.username?.[0]?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 text-left">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-foreground">
                        {conv.otherUser?.full_name || conv.otherUser?.username || "Unknown"}
                      </p>
                      {(conv.unreadCount ?? 0) > 0 && (
                        <span className="bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">
                          {conv.unreadCount}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      @{conv.otherUser?.username || "user"}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Individual conversation view
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Chat header */}
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-md border-b border-border px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCurrentConversation(null)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Avatar
            className="h-10 w-10 cursor-pointer"
            onClick={() =>
              navigate(`/user/${currentConversation.otherUser?.id}`)
            }
          >
            <AvatarImage
              src={currentConversation.otherUser?.avatar_url || undefined}
            />
            <AvatarFallback className="bg-gradient-primary text-background">
              {currentConversation.otherUser?.username?.[0]?.toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <p className="font-semibold text-foreground">
              {currentConversation.otherUser?.full_name ||
                currentConversation.otherUser?.username}
            </p>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Lock className="h-3 w-3" />
              <span>Encrypted</span>
            </div>
          </div>
        </div>
      </header>

      {/* Offline indicator */}
      {!isOnline && (
        <div className="px-4 py-2 bg-yellow-500/10 border-b border-yellow-500/20 flex items-center justify-center gap-2 text-yellow-500">
          <WifiOff className="h-4 w-4" />
          <span className="text-sm">Offline mode</span>
        </div>
      )}

      {/* Messages area */}
      <ScrollArea className="flex-1 px-4 py-4">
        <div className="max-w-2xl mx-auto space-y-4">
          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-20">
              <Lock className="h-12 w-12 mx-auto mb-4 text-primary/30" />
              <p className="text-muted-foreground">
                Messages are end-to-end encrypted
              </p>
              <p className="text-sm text-muted-foreground/70">
                Start the conversation securely
              </p>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  "flex",
                  msg.sender_id === user.id ? "justify-end" : "justify-start"
                )}
              >
                <div
                  className={cn(
                    "max-w-[75%] rounded-2xl px-4 py-2",
                    msg.sender_id === user.id
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-card border border-border rounded-bl-sm"
                  )}
                >
                  <p className="text-sm whitespace-pre-wrap break-words">
                    {msg.decryptedContent}
                  </p>
                  <p
                    className={cn(
                      "text-[10px] mt-1",
                      msg.sender_id === user.id
                        ? "text-primary-foreground/70"
                        : "text-muted-foreground"
                    )}
                  >
                    {new Date(msg.created_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Message input */}
      <div className="sticky bottom-0 bg-card/95 backdrop-blur-md border-t border-border px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Input
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            disabled={!encryptionReady || sendingMessage}
            className="flex-1 bg-background/50"
          />
          <Button
            onClick={handleSendMessage}
            disabled={!messageInput.trim() || !encryptionReady || sendingMessage}
            size="icon"
            className="bg-gradient-primary hover:shadow-glow"
          >
            {sendingMessage ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Messages;
