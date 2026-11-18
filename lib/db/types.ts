export type MailEventState = 'CLAIMED' | 'PROCESSING' | 'DRAFTED' | 'FAILED'
export type DraftStatus =
  | 'PENDING' | 'APPROVED' | 'REJECTED' | 'NO_REPLY_NEEDED'
  | 'SENT' | 'SEND_FAILED' | 'SEND_STATUS_UNKNOWN'
export type Classification =
  | 'ACTION_REQUIRED' | 'INFORMATIONAL' | 'SPAM_OR_UNSAFE' | 'NEEDS_HUMAN_REVIEW'

export interface MailEvent {
  id: string
  providerEventId: string
  payloadHash: string
  mailboxResourceId: string
  folder: string
  messageId: string
  senderAddress: string
  receivedAt: string
  bodyUrl: string
  subject: string
  state: MailEventState
  errorCode: string | null
  createdAt: string
  updatedAt: string
}

export interface MailDraft {
  id: string
  mailEventId: string
  classification: Classification
  confidence: number
  senderAddress: string
  subjectPreview: string
  bodyPreview: string
  proposedSubject: string
  proposedReply: string
  editedReply: string | null
  status: DraftStatus
  sendIdempotencyKey: string | null
  approvedBy: string | null
  approvedAt: string | null
  sentAt: string | null
  createdAt: string
  updatedAt: string
}

export interface NewMailEvent {
  providerEventId: string
  payloadHash: string
  mailboxResourceId: string
  folder: string
  messageId: string
  senderAddress: string
  receivedAt: string
  bodyUrl: string
  subject: string
}

export interface NewMailDraft {
  mailEventId: string
  classification: Classification
  confidence: number
  senderAddress: string
  subjectPreview: string
  bodyPreview: string
  proposedSubject: string
  proposedReply: string
}

export interface DraftApprovalPatch {
  status: 'APPROVED' | 'REJECTED' | 'NO_REPLY_NEEDED'
  editedReply?: string
  approvedBy: string
}

export interface SendResultPatch {
  status: 'SENT' | 'SEND_FAILED' | 'SEND_STATUS_UNKNOWN'
  sentAt?: string
}

export interface NewAuditEvent {
  actor: string
  action: string
  targetType: string
  targetId: string
  outcome: string
}
