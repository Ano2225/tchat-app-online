const net = require('net');
const tls = require('tls');
const os = require('os');

const getSmtpConfig = () => {
  const host = process.env.SMTP_HOST || process.env.MAILHOG_HOST || 'localhost';
  const port = Number(process.env.SMTP_PORT || process.env.MAILHOG_PORT || 1025);
  const secure = String(process.env.SMTP_SECURE || 'false') === 'true';
  const user = process.env.SMTP_USER || '';
  const pass = process.env.SMTP_PASS || '';
  const from = process.env.MAIL_FROM || 'no-reply@babichat.local';

  return { host, port, secure, user, pass, from };
};

let cachedTransporter = null;
const verificationPreviews = new Map();

const getTransporter = () => {
  if (cachedTransporter) return cachedTransporter;

  let nodemailer;
  try {
    nodemailer = require('nodemailer');
  } catch (error) {
    return null;
  }

  const { host, port, secure, user, pass } = getSmtpConfig();
  const auth = user ? { user, pass } : undefined;
  cachedTransporter = nodemailer.createTransport({ host, port, secure, auth });
  return cachedTransporter;
};

const readSmtpResponse = (socket) => {
  return new Promise((resolve, reject) => {
    let buffer = '';

    const cleanup = () => {
      socket.off('data', onData);
      socket.off('error', onError);
      socket.off('close', onClose);
    };

    const onData = (chunk) => {
      buffer += chunk.toString();
      const lines = buffer.split('\r\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (/^\d{3} /.test(line)) {
          cleanup();
          resolve(line);
          return;
        }
      }
    };

    const onError = (error) => {
      cleanup();
      reject(error);
    };

    const onClose = () => {
      cleanup();
      reject(new Error('SMTP connection closed'));
    };

    socket.on('data', onData);
    socket.on('error', onError);
    socket.on('close', onClose);
  });
};

const sendSmtpCommand = async (socket, command, expectedCode) => {
  if (command) {
    socket.write(`${command}\r\n`);
  }

  const response = await readSmtpResponse(socket);
  if (expectedCode && !response.startsWith(expectedCode)) {
    throw new Error(`SMTP error: ${response}`);
  }

  return response;
};

const buildRawMessage = ({ from, to, subject, text }) => {
  const headers = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset="utf-8"',
    'Content-Transfer-Encoding: 8bit'
  ];

  const body = (text || '').replace(/\r?\n/g, '\r\n');
  return `${headers.join('\r\n')}\r\n\r\n${body}\r\n`;
};

const sendWithRawSmtp = async ({ host, port, secure, user, pass, from, to, subject, text }) => {
  const socket = secure
    ? tls.connect({ host, port })
    : net.connect({ host, port });

  socket.setTimeout(10000);
  socket.on('timeout', () => {
    socket.destroy(new Error('SMTP timeout'));
  });

  try {
    await readSmtpResponse(socket);
    await sendSmtpCommand(socket, `EHLO ${os.hostname()}`, '250');

    if (user) {
      await sendSmtpCommand(socket, 'AUTH LOGIN', '334');
      await sendSmtpCommand(socket, Buffer.from(user).toString('base64'), '334');
      await sendSmtpCommand(socket, Buffer.from(pass || '').toString('base64'), '235');
    }

    await sendSmtpCommand(socket, `MAIL FROM:<${from}>`, '250');
    await sendSmtpCommand(socket, `RCPT TO:<${to}>`, '250');
    await sendSmtpCommand(socket, 'DATA', '354');

    socket.write(`${buildRawMessage({ from, to, subject, text })}\r\n.\r\n`);
    await readSmtpResponse(socket);
    await sendSmtpCommand(socket, 'QUIT', '221');
  } finally {
    socket.end();
  }
};

const sendMail = async ({ to, subject, text, html }) => {
  const transporter = getTransporter();
  const { host, port, secure, user, pass, from } = getSmtpConfig();

  if (!transporter) {
    try {
      await sendWithRawSmtp({ host, port, secure, user, pass, from, to, subject, text });
      return { delivered: true };
    } catch (error) {
      console.warn('SMTP non configure. Email de verification non envoye.');
      console.log(`[EMAIL VERIFICATION] to=${to} subject="${subject}"`);
      console.log(text);
      return {
        delivered: false,
        warning: 'SMTP non configure. Email de verification non envoye.'
      };
    }
  }

  try {
    await transporter.sendMail({ from, to, subject, text, html });
    return { delivered: true };
  } catch (error) {
    console.warn('Erreur SMTP. Email de verification non envoye.');
    console.error(error);
    return {
      delivered: false,
      warning: 'Erreur SMTP. Email de verification non envoye.'
    };
  }
};

const buildVerificationEmail = ({ user, url }) => {
  const displayName = user?.name || user?.username || 'utilisateur';
  const subject = 'Confirmez votre adresse email';
  const text = [
    `Bonjour ${displayName},`,
    '',
    'Merci pour votre inscription.',
    'Veuillez confirmer votre email en cliquant sur le lien suivant :',
    url,
    '',
    'Si vous n\'etes pas a l\'origine de cette demande, ignorez cet email.'
  ].join('\n');

  const html = [
    `<p>Bonjour ${displayName},</p>`,
    '<p>Merci pour votre inscription.</p>',
    `<p>Veuillez confirmer votre email en cliquant sur le lien suivant :</p>`,
    `<p><a href="${url}">${url}</a></p>`,
    '<p>Si vous n\'etes pas a l\'origine de cette demande, ignorez cet email.</p>'
  ].join('');

  return { subject, text, html };
};

const sendVerificationEmail = async ({ user, url }) => {
  if (!user?.email) {
    console.warn('Email utilisateur manquant, verification impossible.');
    return;
  }

  const { subject, text, html } = buildVerificationEmail({ user, url });
  const { delivered, warning } = await sendMail({ to: user.email, subject, text, html });
  verificationPreviews.set(user.email.toLowerCase(), {
    email: user.email,
    subject,
    text,
    html,
    url,
    delivered,
    warning,
    timestamp: new Date().toISOString()
  });

  return { delivered, warning, url };
};

const getVerificationEmailPreview = (email) => {
  if (!email) return null;
  return verificationPreviews.get(String(email).toLowerCase()) || null;
};

module.exports = {
  sendVerificationEmail,
  getVerificationEmailPreview
};
