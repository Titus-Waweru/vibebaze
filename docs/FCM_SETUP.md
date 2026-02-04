# VibeBaze Push Notifications - FCM V1 API Documentation

## Overview

VibeBaze uses Firebase Cloud Messaging (FCM) V1 API for push notifications. This is the modern, recommended approach by Google that uses service account authentication instead of legacy server keys.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         VibeBaze FCM Setup                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Frontend (React/Vite)          Backend (Edge Functions)        │
│  ┌─────────────────────┐       ┌─────────────────────────────┐ │
│  │ firebase.ts         │       │ send-push-notification      │ │
│  │ - Initialize app    │       │ - Service Account Auth      │ │
│  │ - Get FCM token     │       │ - OAuth2 Token Exchange     │ │
│  │ - Handle foreground │       │ - FCM V1 API calls          │ │
│  └─────────────────────┘       └─────────────────────────────┘ │
│           │                              │                       │
│           ▼                              ▼                       │
│  ┌─────────────────────┐       ┌─────────────────────────────┐ │
│  │ Service Worker      │       │ push_subscriptions table    │ │
│  │ - Background msgs   │       │ - user_id                   │ │
│  │ - Notification click│       │ - endpoint (FCM token)      │ │
│  └─────────────────────┘       └─────────────────────────────┘ │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Configuration

### Required Environment Variables (Secrets)

These secrets must be configured in the backend:

| Secret Name | Description |
|-------------|-------------|
| `FCM_CLIENT_EMAIL` | Service account email from Firebase Console |
| `FCM_PRIVATE_KEY` | Private key from service account JSON |

### Firebase Project Details

- **Project ID**: `vibebaze-f08b2`
- **API Endpoint**: `https://fcm.googleapis.com/v1/projects/vibebaze-f08b2/messages:send`

## Adding New Notifications

### Step 1: Create a Notification Function

Add a new function in `src/lib/notificationService.ts`:

```typescript
export const notifyCustomEvent = async (
  userId: string,
  customData: string
): Promise<NotificationResult> => {
  return sendNotification({
    userId,
    title: "🎯 Custom Event",
    body: `Something happened: ${customData}`,
    url: "/relevant-page",
    tag: "custom-event"
  });
};
```

### Step 2: Call the Function

Use the notification function wherever the event occurs:

```typescript
import { notifyCustomEvent } from "@/lib/notificationService";

// In your component or hook
const handleEvent = async () => {
  await notifyCustomEvent(targetUserId, "event details");
};
```

### Available Notification Functions

| Function | Use Case |
|----------|----------|
| `notifyTipReceived` | When a user receives a tip |
| `notifyWalletUpdate` | Wallet balance changes |
| `notifyNewMessage` | New direct message |
| `notifyNewFollower` | New follower |
| `notifyPostLiked` | Post receives a like |
| `notifyPostComment` | Post receives a comment |
| `broadcastNotification` | Admin broadcast to all users |
| `notifyUsers` | Send to multiple specific users |

## Token Management

### Token Lifecycle

1. **Registration**: When user enables notifications, token is obtained and stored
2. **Refresh**: Tokens are automatically refreshed every 24 hours
3. **Revocation**: When user disables notifications, token is deleted
4. **Cleanup**: Invalid tokens are automatically removed on failed delivery

### Revoking Tokens

#### User-Initiated (Settings Page)
Users can disable notifications from Settings → Push Notifications toggle.

#### Programmatic Revocation
```typescript
// Delete a specific user's token
await supabase
  .from("push_subscriptions")
  .delete()
  .eq("user_id", userId);
```

### Refreshing Tokens

The `usePushNotifications` hook handles automatic token refresh:

```typescript
const { refreshToken } = usePushNotifications();

// Manually refresh if needed
await refreshToken();
```

## Monitoring Delivery

### Edge Function Logs

View delivery logs in the backend console:

```
[VibeBaze] Sending to 150 subscribers using FCM V1 API
[VibeBaze] Sent: 148, Failed: 2, Tokens removed: 2
```

### Database Queries

Check active subscriptions:

```sql
SELECT COUNT(*) as total_subscribers FROM push_subscriptions;
```

Check recent token activity:

```sql
SELECT user_id, created_at 
FROM push_subscriptions 
ORDER BY created_at DESC 
LIMIT 10;
```

### API Response

The send-push-notification function returns:

```typescript
{
  success: true,
  sent: 148,      // Successfully delivered
  failed: 2,      // Failed to deliver
  total: 150,     // Total attempted
  tokensRemoved: 2 // Invalid tokens cleaned up
}
```

## Notification Payload Structure

### Standard Notification

```typescript
{
  userId: "uuid",           // Single recipient
  // OR
  userIds: ["uuid1", "uuid2"], // Multiple recipients
  // OR
  broadcast: true,          // All users
  
  title: "Notification Title",
  body: "Notification message body",
  url: "/destination-path", // Where to navigate on click
  tag: "notification-type"  // For grouping/deduplication
}
```

### Supported Emoji Prefixes

For consistent branding, use these emoji prefixes:

| Type | Emoji |
|------|-------|
| Tips/Money | 💰 |
| Wallet | 💳 💸 |
| Messages | 💬 |
| Followers | 👤 |
| Likes | ❤️ |
| Comments | 💬 |
| Announcements | 📢 🎉 |
| Alerts | ⚠️ |

## Security Best Practices

1. **Service Account**: Never expose service account credentials in frontend code
2. **Rate Limiting**: The platform limits notification frequency
3. **Admin Only**: Broadcast functionality is restricted to admin users
4. **Token Validation**: Invalid tokens are automatically cleaned up
5. **HTTPS Only**: All FCM communication uses HTTPS

## Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| "FCM not supported" | Browser doesn't support Push API |
| "Permission denied" | User blocked notifications |
| "No subscribers found" | No users have enabled notifications |
| "Failed to authenticate" | Check FCM_CLIENT_EMAIL and FCM_PRIVATE_KEY secrets |

### Debug Mode

Enable console logging:

```typescript
// Messages are logged with [VibeBaze] prefix
console.log("[VibeBaze] FCM Token obtained:", token);
```

## Migration from Legacy API

The VibeBaze setup uses FCM V1 API exclusively:

- ❌ No legacy server keys
- ❌ No deprecated `https://fcm.googleapis.com/fcm/send` endpoint
- ✅ OAuth2 authentication via service account
- ✅ Modern V1 API endpoint
- ✅ Automatic token management
