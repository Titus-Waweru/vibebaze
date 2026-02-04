import { supabase } from "@/integrations/supabase/client";

/**
 * VibeBaze Notification Service
 * 
 * This module provides utilities for sending push notifications
 * using Firebase Cloud Messaging V1 API.
 */

export interface NotificationPayload {
  userId?: string;
  userIds?: string[];
  broadcast?: boolean;
  title: string;
  body: string;
  url?: string;
  tag?: string;
  imageUrl?: string;
}

export interface NotificationResult {
  success: boolean;
  sent: number;
  failed: number;
  total: number;
  tokensRemoved?: number;
  error?: string;
}

/**
 * Send a push notification to specific users or broadcast to all
 */
export const sendNotification = async (payload: NotificationPayload): Promise<NotificationResult> => {
  try {
    const { data, error } = await supabase.functions.invoke("send-push-notification", {
      body: payload
    });

    if (error) {
      console.error("[VibeBaze] Notification error:", error);
      return {
        success: false,
        sent: 0,
        failed: 0,
        total: 0,
        error: error.message
      };
    }

    return data as NotificationResult;
  } catch (error) {
    console.error("[VibeBaze] Notification error:", error);
    return {
      success: false,
      sent: 0,
      failed: 0,
      total: 0,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
};

/**
 * Send notification when user receives a tip
 */
export const notifyTipReceived = async (
  recipientId: string,
  senderUsername: string,
  amount: number
): Promise<NotificationResult> => {
  return sendNotification({
    userId: recipientId,
    title: "💰 You received a tip!",
    body: `${senderUsername} sent you KSh ${amount}`,
    url: "/wallet",
    tag: "tip-received"
  });
};

/**
 * Send notification when wallet balance changes
 */
export const notifyWalletUpdate = async (
  userId: string,
  type: "deposit" | "withdrawal" | "earning",
  amount: number
): Promise<NotificationResult> => {
  const titles = {
    deposit: "💳 Deposit Successful",
    withdrawal: "💸 Withdrawal Processed",
    earning: "🎉 New Earnings!"
  };

  const bodies = {
    deposit: `KSh ${amount} has been added to your wallet`,
    withdrawal: `KSh ${amount} has been withdrawn from your wallet`,
    earning: `You earned KSh ${amount}!`
  };

  return sendNotification({
    userId,
    title: titles[type],
    body: bodies[type],
    url: "/wallet",
    tag: `wallet-${type}`
  });
};

/**
 * Send notification when user receives a new message
 */
export const notifyNewMessage = async (
  recipientId: string,
  senderUsername: string
): Promise<NotificationResult> => {
  return sendNotification({
    userId: recipientId,
    title: "💬 New Message",
    body: `${senderUsername} sent you a message`,
    url: "/messages",
    tag: "new-message"
  });
};

/**
 * Send notification when user gets a new follower
 */
export const notifyNewFollower = async (
  userId: string,
  followerUsername: string
): Promise<NotificationResult> => {
  return sendNotification({
    userId,
    title: "👤 New Follower",
    body: `${followerUsername} started following you`,
    url: "/notifications",
    tag: "new-follower"
  });
};

/**
 * Send notification when user's post gets a like
 */
export const notifyPostLiked = async (
  postOwnerId: string,
  likerUsername: string
): Promise<NotificationResult> => {
  return sendNotification({
    userId: postOwnerId,
    title: "❤️ Post Liked",
    body: `${likerUsername} liked your post`,
    url: "/notifications",
    tag: "post-liked"
  });
};

/**
 * Send notification when user's post gets a comment
 */
export const notifyPostComment = async (
  postOwnerId: string,
  commenterUsername: string
): Promise<NotificationResult> => {
  return sendNotification({
    userId: postOwnerId,
    title: "💬 New Comment",
    body: `${commenterUsername} commented on your post`,
    url: "/notifications",
    tag: "post-comment"
  });
};

/**
 * Send admin broadcast to all users
 */
export const broadcastNotification = async (
  title: string,
  body: string,
  url?: string
): Promise<NotificationResult> => {
  return sendNotification({
    broadcast: true,
    title,
    body,
    url: url || "/notifications",
    tag: "admin-broadcast"
  });
};

/**
 * Send notification to multiple specific users
 */
export const notifyUsers = async (
  userIds: string[],
  title: string,
  body: string,
  url?: string
): Promise<NotificationResult> => {
  return sendNotification({
    userIds,
    title,
    body,
    url: url || "/notifications",
    tag: "bulk-notification"
  });
};
