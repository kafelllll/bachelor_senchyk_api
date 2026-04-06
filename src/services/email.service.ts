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
