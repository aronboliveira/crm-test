export type EmailKind = 'password_invite' | 'generic';

export type EmailMessage = Readonly<{
  to: string;
  kind: EmailKind;
  subject: string;
  text?: string;
  html?: string;
  meta?: Record<string, any>;
}>;

export type EmailDeliveryResult = Readonly<{
  ok: boolean;
  deliveryId: string | null;
}>;
