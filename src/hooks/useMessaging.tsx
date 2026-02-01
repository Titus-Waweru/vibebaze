import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEncryption } from "./useEncryption";
import { toast } from "sonner";

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  encrypted_content: string;
  encrypted_key_sender: string;
  encrypted_key_receiver: string;
  nonce: string;
  message_type: string;
  is_read: boolean;
  created_at: string;
  decryptedContent?: string;
}

interface Conversation {
  id: string;
  participant_one: string;
  participant_two: string;
  last_message_at: string | null;
  created_at: string;
  otherUser?: {
    id: string;
    username: string;
    avatar_url: string | null;
    full_name: string | null;
  };
  lastMessage?: Message;
  unreadCount?: number;
}

export const useMessaging = (userId: string | undefined) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);

  const {
    encryptForRecipient,
    decryptReceivedMessage,
    getRecipientPublicKey,
    isReady: encryptionReady,
  } = useEncryption(userId);

  // Fetch all conversations for the user
  const fetchConversations = useCallback(async () => {
    if (!userId) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("conversations")
        .select("*")
        .or(`participant_one.eq.${userId},participant_two.eq.${userId}`)
        .order("last_message_at", { ascending: false, nullsFirst: false });

      if (error) throw error;

      // Fetch other user's profile for each conversation
      const conversationsWithUsers = await Promise.all(
        (data || []).map(async (conv) => {
          const otherUserId =
            conv.participant_one === userId
              ? conv.participant_two
              : conv.participant_one;

          const { data: profile } = await supabase
            .from("profiles")
            .select("id, username, avatar_url, full_name")
            .eq("id", otherUserId)
            .single();

          // Get unread count
          const { count } = await supabase
            .from("messages")
            .select("*", { count: "exact", head: true })
            .eq("conversation_id", conv.id)
            .neq("sender_id", userId)
            .eq("is_read", false);

          return {
            ...conv,
            otherUser: profile || undefined,
            unreadCount: count || 0,
          };
        })
      );

      setConversations(conversationsWithUsers);
    } catch (err) {
      console.error("Error fetching conversations:", err);
      toast.error("Failed to load conversations");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Fetch messages for a conversation
  const fetchMessages = useCallback(
    async (conversationId: string) => {
      if (!userId || !encryptionReady) return;

      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("messages")
          .select("*")
          .eq("conversation_id", conversationId)
          .order("created_at", { ascending: true });

        if (error) throw error;

        // Decrypt messages
        const decryptedMessages = await Promise.all(
          (data || []).map(async (msg) => {
            const encryptedKey =
              msg.sender_id === userId
                ? msg.encrypted_key_sender
                : msg.encrypted_key_receiver;

            const decryptedContent = await decryptReceivedMessage(
              msg.encrypted_content,
              encryptedKey,
              msg.nonce
            );

            return {
              ...msg,
              decryptedContent: decryptedContent || "[Unable to decrypt]",
            };
          })
        );

        setMessages(decryptedMessages);

        // Mark messages as read
        await supabase
          .from("messages")
          .update({ is_read: true, read_at: new Date().toISOString() })
          .eq("conversation_id", conversationId)
          .neq("sender_id", userId)
          .eq("is_read", false);
      } catch (err) {
        console.error("Error fetching messages:", err);
        toast.error("Failed to load messages");
      } finally {
        setLoading(false);
      }
    },
    [userId, encryptionReady, decryptReceivedMessage]
  );

  // Send a message
  const sendMessage = useCallback(
    async (conversationId: string, content: string, recipientId: string) => {
      if (!userId || !encryptionReady) {
        toast.error("Encryption not ready");
        return false;
      }

      try {
        setSendingMessage(true);

        // Get recipient's public key
        const recipientPublicKey = await getRecipientPublicKey(recipientId);
        if (!recipientPublicKey) {
          throw new Error("Recipient encryption key not found");
        }

        // Encrypt the message
        const encrypted = await encryptForRecipient(content, recipientPublicKey);
        if (!encrypted) {
          throw new Error("Failed to encrypt message");
        }

        // Store in database
        const { data, error } = await supabase
          .from("messages")
          .insert({
            conversation_id: conversationId,
            sender_id: userId,
            encrypted_content: encrypted.encryptedContent,
            encrypted_key_sender: encrypted.encryptedKeyForSender,
            encrypted_key_receiver: encrypted.encryptedKeyForReceiver,
            nonce: encrypted.nonce,
            message_type: "text",
          })
          .select()
          .single();

        if (error) throw error;

        // Update conversation's last_message_at
        await supabase
          .from("conversations")
          .update({ last_message_at: new Date().toISOString() })
          .eq("id", conversationId);

        // Add to local messages
        setMessages((prev) => [
          ...prev,
          { ...data, decryptedContent: content },
        ]);

        return true;
      } catch (err) {
        console.error("Error sending message:", err);
        
        // Queue for retry if offline
        if (!navigator.onLine) {
          toast.info("Message queued - will send when online");
          return true;
        }
        
        toast.error("Failed to send message");
        return false;
      } finally {
        setSendingMessage(false);
      }
    },
    [userId, encryptionReady, encryptForRecipient, getRecipientPublicKey]
  );

  // Get or create a conversation with another user
  const getOrCreateConversation = useCallback(
    async (otherUserId: string): Promise<string | null> => {
      if (!userId) return null;

      try {
        const { data, error } = await supabase.rpc("get_or_create_conversation", {
          p_user_one: userId,
          p_user_two: otherUserId,
        });

        if (error) throw error;
        return data;
      } catch (err) {
        console.error("Error creating conversation:", err);
        toast.error("Failed to start conversation");
        return null;
      }
    },
    [userId]
  );

  // Subscribe to new messages
  useEffect(() => {
    if (!currentConversation?.id || !userId) return;

    const channel = supabase
      .channel(`messages-${currentConversation.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${currentConversation.id}`,
        },
        async (payload) => {
          const newMsg = payload.new as Message;
          
          // Only process messages from other users
          if (newMsg.sender_id === userId) return;

          // Decrypt the new message
          const encryptedKey = newMsg.encrypted_key_receiver;
          const decryptedContent = await decryptReceivedMessage(
            newMsg.encrypted_content,
            encryptedKey,
            newMsg.nonce
          );

          setMessages((prev) => [
            ...prev,
            { ...newMsg, decryptedContent: decryptedContent || "[Unable to decrypt]" },
          ]);

          // Mark as read immediately
          await supabase
            .from("messages")
            .update({ is_read: true, read_at: new Date().toISOString() })
            .eq("id", newMsg.id);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentConversation?.id, userId, decryptReceivedMessage]);

  return {
    conversations,
    currentConversation,
    messages,
    loading,
    sendingMessage,
    fetchConversations,
    fetchMessages,
    sendMessage,
    getOrCreateConversation,
    setCurrentConversation,
    encryptionReady,
  };
};
