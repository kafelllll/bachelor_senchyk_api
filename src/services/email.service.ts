import nodemailer from 'nodemailer';

const getSmtpConfig = () => {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? Number.parseInt(process.env.SMTP_PORT, 10) : 0;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM;
  if (!host || !port || !user || !pass || !from) {
    throw new Error('SMTP configuration is incomplete');
  }
  return { host, port, user, pass, from };
};

const buildVerificationEmailHtml = (verifyUrl: string, code: string) => {
  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.5;">
      <h2>Email confirmation</h2>
      <p>Please confirm your email address by clicking the button below.</p>
      <p>
        <a href="${verifyUrl}" style="display: inline-block; padding: 12px 18px; background: #2f855a; color: #fff; text-decoration: none; border-radius: 6px;">Confirm email</a>
      </p>
      <p>Or enter this confirmation code:</p>
      <p style="font-size: 20px; letter-spacing: 4px; font-weight: bold;">${code}</p>
      <p>If the button does not work, open this link:</p>
      <p><a href="${verifyUrl}">${verifyUrl}</a></p>
    </div>
  `;
};

const escapeHtml = (value: string) => {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

const getFrontendBaseUrl = () => {
  const raw = process.env.FRONTEND_BASE_URL?.trim();
  if (!raw) return null;
  return raw.replace(/\/$/, '');
};

const buildFrontendUrl = (path: string) => {
  const base = getFrontendBaseUrl();
  if (!base) return null;
  const safePath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${safePath}`;
};

const buildLink = (label: string, url: string | null) => {
  if (!url) return '';
  return `<p><a href="${url}">${escapeHtml(label)}</a></p>`;
};

const buildChatUrl = (params: {
  userId: string;
  announcementId?: string | null;
  userName?: string | null;
  announcementTitle?: string | null;
}) => {
  const base = getFrontendBaseUrl();
  if (!base) return null;
  const search = new URLSearchParams({ userId: params.userId });
  if (params.announcementId) search.set('announcementId', params.announcementId);
  if (params.userName) search.set('userName', params.userName);
  if (params.announcementTitle) search.set('announcementTitle', params.announcementTitle);
  return `${base}/messages?${search.toString()}`;
};

const buildMessageNotificationHtml = (params: {
  receiverName: string;
  receiverId: string;
  senderName: string;
  senderId: string;
  message: string;
  announcementId?: string | null;
  announcementTitle?: string | null;
}) => {
  const announcementLine = params.announcementTitle
    ? `<p>Listing: <strong>${escapeHtml(params.announcementTitle)}</strong></p>`
    : '';
  const senderProfileUrl = buildFrontendUrl(`/users/${params.senderId}`);
  const listingUrl = params.announcementId ? buildFrontendUrl(`/listings/${params.announcementId}`) : null;
  const chatUrl = buildChatUrl({
    userId: params.senderId,
    announcementId: params.announcementId ?? null,
    userName: params.senderName,
    announcementTitle: params.announcementTitle ?? null,
  });
  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.5;">
      <h2>New message</h2>
      <p>Hi ${escapeHtml(params.receiverName)},</p>
      <p>You received a new message from <strong>${escapeHtml(params.senderName)}</strong>.</p>
      ${announcementLine}
      <blockquote style="border-left: 4px solid #2f855a; margin: 12px 0; padding: 8px 12px; background: #f7fafc;">
        ${escapeHtml(params.message)}
      </blockquote>
      ${buildLink('Open chat', chatUrl)}
      ${buildLink('View sender profile', senderProfileUrl)}
      ${buildLink('View listing', listingUrl)}
    </div>
  `;
};

const buildExchangeInitiatedHtml = (params: {
  receiverName: string;
  receiverId: string;
  initiatorName: string;
  initiatorId: string;
  announcementId: string;
  announcementTitle: string;
}) => {
  const initiatorProfileUrl = buildFrontendUrl(`/users/${params.initiatorId}`);
  const listingUrl = buildFrontendUrl(`/listings/${params.announcementId}`);
  const exchangesUrl = buildFrontendUrl('/exchanges');
  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.5;">
      <h2>New exchange request</h2>
      <p>Hi ${escapeHtml(params.receiverName)},</p>
      <p><strong>${escapeHtml(params.initiatorName)}</strong> wants to exchange for your listing:</p>
      <p><strong>${escapeHtml(params.announcementTitle)}</strong></p>
      ${buildLink('View exchange requests', exchangesUrl)}
      ${buildLink('View listing', listingUrl)}
      ${buildLink('View requester profile', initiatorProfileUrl)}
    </div>
  `;
};

const buildRatingNotificationHtml = (params: {
  receiverName: string;
  receiverId: string;
  raterName: string;
  raterId: string;
  score: number;
  comment?: string | null;
}) => {
  const commentLine = params.comment
    ? `<p>Comment: “${escapeHtml(params.comment)}”</p>`
    : '';
  const raterProfileUrl = buildFrontendUrl(`/users/${params.raterId}`);
  const receiverProfileUrl = buildFrontendUrl(`/users/${params.receiverId}`);
  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.5;">
      <h2>New rating</h2>
      <p>Hi ${escapeHtml(params.receiverName)},</p>
      <p><strong>${escapeHtml(params.raterName)}</strong> left you a rating: <strong>${params.score}/5</strong>.</p>
      ${commentLine}
      ${buildLink('View reviewer profile', raterProfileUrl)}
      ${buildLink('View your profile', receiverProfileUrl)}
    </div>
  `;
};

export const sendVerificationEmail = async (to: string, verifyUrl: string, code: string) => {
  const { host, port, user, pass, from } = getSmtpConfig();
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
  });

  const subject = 'Confirm your email';
  const html = buildVerificationEmailHtml(verifyUrl, code);

  await transporter.sendMail({
    from,
    to,
    subject,
    html,
  });
};

export const sendMessageNotificationEmail = async (to: string, params: {
  receiverName: string;
  receiverId: string;
  senderName: string;
  senderId: string;
  message: string;
  announcementId?: string | null;
  announcementTitle?: string | null;
}) => {
  const { host, port, user, pass, from } = getSmtpConfig();
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
  });

  const subject = 'You have a new message';
  const html = buildMessageNotificationHtml(params);

  await transporter.sendMail({
    from,
    to,
    subject,
    html,
  });
};

export const sendExchangeInitiatedEmail = async (to: string, params: {
  receiverName: string;
  receiverId: string;
  initiatorName: string;
  initiatorId: string;
  announcementId: string;
  announcementTitle: string;
}) => {
  const { host, port, user, pass, from } = getSmtpConfig();
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
  });

  const subject = 'New exchange request';
  const html = buildExchangeInitiatedHtml(params);

  await transporter.sendMail({
    from,
    to,
    subject,
    html,
  });
};

export const sendRatingNotificationEmail = async (to: string, params: {
  receiverName: string;
  receiverId: string;
  raterName: string;
  raterId: string;
  score: number;
  comment?: string | null;
}) => {
  const { host, port, user, pass, from } = getSmtpConfig();
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
  });

  const subject = 'You received a new rating';
  const html = buildRatingNotificationHtml(params);

  await transporter.sendMail({
    from,
    to,
    subject,
    html,
  });
};
