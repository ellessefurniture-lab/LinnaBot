export type UserStatus = 'ACTIVE' | 'BLOCKED' | 'DELETED';
export type MessageDirection = 'INCOMING' | 'OUTGOING';
export type MessageType =
  | 'TEXT'
  | 'PHOTO'
  | 'VIDEO'
  | 'DOCUMENT'
  | 'AUDIO'
  | 'VOICE'
  | 'STICKER'
  | 'CALLBACK_QUERY'
  | 'OTHER';
export type MediaType = 'NONE' | 'PHOTO' | 'VIDEO' | 'DOCUMENT';
export type ParseMode = 'HTML' | 'MARKDOWN' | 'PLAIN';
export type TargetAudience = 'ALL' | 'ACTIVE' | 'INACTIVE' | 'NEW_USERS';
export type BroadcastStatus =
  | 'DRAFT'
  | 'SCHEDULED'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';
export type SupportStatus = 'OPEN' | 'RESOLVED';
export type SenderType = 'USER' | 'ADMIN';

export interface Admin {
  id: string;
  email: string;
  username: string;
  role: string;
  createdAt: string;
}

export interface User {
  id: string;
  telegramId: string;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  languageCode: string | null;
  status: UserStatus;
  isBot: boolean;
  lastActiveAt: string;
  createdAt: string;
  _count?: {
    messages: number;
    supportConversations: number;
  };
  messages?: Message[];
}

export interface Message {
  id: string;
  telegramMessageId: string | null;
  userId: string;
  direction: MessageDirection;
  messageType: MessageType;
  content: string | null;
  mediaUrl: string | null;
  fileId: string | null;
  status: string;
  createdAt: string;
  user?: {
    id: string;
    telegramId: string;
    username: string | null;
    firstName: string | null;
    lastName: string | null;
  };
}

export interface InlineButton {
  text: string;
  url?: string;
  callback_data?: string;
}

export interface Broadcast {
  id: string;
  title: string;
  content: string;
  mediaType: MediaType;
  mediaUrl: string | null;
  parseMode: ParseMode;
  buttons: string | null;
  targetAudience: TargetAudience;
  scheduledAt: string | null;
  status: BroadcastStatus;
  totalRecipients: number;
  successfulCount: number;
  failedCount: number;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  createdBy?: {
    id: string;
    username: string;
    email: string;
  } | null;
  recipients?: Array<{
    id: string;
    status: string;
    errorMessage: string | null;
    sentAt: string | null;
    user: User;
  }>;
}

export interface SupportMessage {
  id: string;
  conversationId: string;
  senderType: SenderType;
  senderId: string;
  content: string;
  mediaUrl: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface SupportConversation {
  id: string;
  userId: string;
  status: SupportStatus;
  subject: string | null;
  lastMessageAt: string;
  createdAt: string;
  user: User;
  messages: SupportMessage[];
  _count?: {
    messages: number;
  };
}

export interface BotSetting {
  key: string;
  value: string;
  description: string | null;
  isPublic: boolean;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  adminId: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  details: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  admin?: {
    username: string;
  } | null;
}

export interface DashboardStats {
  users: {
    totalUsers: number;
    activeUsers: number;
    newToday: number;
    newThisWeek: number;
    blockedUsers: number;
  };
  messages: {
    incomingCount: number;
    outgoingCount: number;
    totalCount: number;
  };
  bot: {
    isConfigured: boolean;
    mode: string;
    isRunning: boolean;
    webhookUrl: string | null;
  };
  chartData: Array<{
    date: string;
    users: number;
    messages: number;
  }>;
  recentBroadcasts: Broadcast[];
  recentActivity: AuditLog[];
}
