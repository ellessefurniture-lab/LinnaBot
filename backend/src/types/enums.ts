export enum UserStatus {
  ACTIVE = 'ACTIVE',
  BLOCKED = 'BLOCKED',
  DELETED = 'DELETED',
}

export enum MessageDirection {
  INCOMING = 'INCOMING',
  OUTGOING = 'OUTGOING',
}

export enum MessageType {
  TEXT = 'TEXT',
  PHOTO = 'PHOTO',
  VIDEO = 'VIDEO',
  DOCUMENT = 'DOCUMENT',
  AUDIO = 'AUDIO',
  VOICE = 'VOICE',
  STICKER = 'STICKER',
  CALLBACK_QUERY = 'CALLBACK_QUERY',
  OTHER = 'OTHER',
}

export enum MessageStatus {
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  FAILED = 'FAILED',
}

export enum MediaType {
  NONE = 'NONE',
  PHOTO = 'PHOTO',
  VIDEO = 'VIDEO',
  DOCUMENT = 'DOCUMENT',
}

export enum ParseMode {
  HTML = 'HTML',
  MARKDOWN = 'MARKDOWN',
  PLAIN = 'PLAIN',
}

export enum TargetAudience {
  ALL = 'ALL',
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  NEW_USERS = 'NEW_USERS',
}

export enum BroadcastStatus {
  DRAFT = 'DRAFT',
  SCHEDULED = 'SCHEDULED',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export enum RecipientStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  FAILED = 'FAILED',
}

export enum SupportStatus {
  OPEN = 'OPEN',
  RESOLVED = 'RESOLVED',
}

export enum SenderType {
  USER = 'USER',
  ADMIN = 'ADMIN',
}
