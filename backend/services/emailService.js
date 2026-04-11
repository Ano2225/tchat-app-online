const { Resend } = require('resend');

const verificationPreviews = new Map();

let cachedClient = null;
let cachedApiKey = null;

const getEmailConfig = () => {
  const apiKey = process.env.RESEND_API_KEY || '';
  const from = process.env.RESEND_FROM || process.env.MAIL_FROM || 'BabiChat <no-reply@babichat.tech>';

  return {
    apiKey,
    from
  };
};

const getClient = () => {
  const { apiKey } = getEmailConfig();
  if (!apiKey) return null;

  if (!cachedClient || cachedApiKey !== apiKey) {
    cachedClient = new Resend(apiKey);
    cachedApiKey = apiKey;
  }

  return cachedClient;
};

const buildDisabledDelivery = ({ to, subject, text, warning }) => {
  console.warn(warning);
  console.log(`[EMAIL PREVIEW] to=${to} subject="${subject}"`);
  console.log(text);

  return {
    delivered: false,
    warning,
    preview: true
  };
};

const sendMail = async ({ to, subject, text, html }) => {
  const client = getClient();
  const { from } = getEmailConfig();

  if (!client) {
    return buildDisabledDelivery({
      to,
      subject,
      text,
      warning: 'RESEND_API_KEY manquante. Email non envoye.'
    });
  }

  try {
    const response = await client.emails.send({
      from,
      to,
      subject,
      text,
      html
    });

    if (response?.error) {
      throw new Error(response.error.message || 'Erreur Resend');
    }

    return {
      delivered: true,
      id: response?.data?.id
    };
  } catch (error) {
    console.warn('Erreur Resend. Email non envoye.');
    console.error(error);
    return {
      delivered: false,
      warning: error?.message || 'Erreur Resend. Email non envoye.'
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
    "Si vous n'etes pas a l'origine de cette demande, ignorez cet email."
  ].join('\n');

  const html = [
    `<p>Bonjour ${displayName},</p>`,
    '<p>Merci pour votre inscription.</p>',
    '<p>Veuillez confirmer votre email en cliquant sur le lien suivant :</p>',
    `<p><a href="${url}">${url}</a></p>`,
    "<p>Si vous n'etes pas a l'origine de cette demande, ignorez cet email.</p>"
  ].join('');

  return { subject, text, html };
};

const buildWelcomeEmail = ({ user }) => {
  const displayName = user?.name || user?.username || 'utilisateur';
  const subject = 'Bienvenue sur BabiChat';
  const loginUrl = `${(process.env.FRONTEND_URL || 'http://localhost:3000').split(',')[0].trim()}/login`;
  const text = [
    `Bonjour ${displayName},`,
    '',
    'Bienvenue sur BabiChat.',
    'Votre compte a bien ete cree et vous pouvez maintenant rejoindre la communaute.',
    `Connexion : ${loginUrl}`,
    '',
    "Si vous n'etes pas a l'origine de cette inscription, repondez a cet email."
  ].join('\n');

  const html = [
    `<p>Bonjour ${displayName},</p>`,
    '<p>Bienvenue sur <strong>BabiChat</strong>.</p>',
    '<p>Votre compte a bien ete cree et vous pouvez maintenant rejoindre la communaute.</p>',
    `<p><a href="${loginUrl}">Se connecter a BabiChat</a></p>`,
    "<p>Si vous n'etes pas a l'origine de cette inscription, repondez a cet email.</p>"
  ].join('');

  return { subject, text, html };
};

const sendVerificationEmail = async ({ user, url }) => {
  if (!user?.email) {
    console.warn('Email utilisateur manquant, verification impossible.');
    return;
  }

  const { subject, text, html } = buildVerificationEmail({ user, url });
  const { delivered, warning, preview, id } = await sendMail({ to: user.email, subject, text, html });
  verificationPreviews.set(user.email.toLowerCase(), {
    email: user.email,
    subject,
    text,
    html,
    url,
    delivered,
    warning,
    preview,
    id,
    timestamp: new Date().toISOString()
  });

  return { delivered, warning, preview, id, url };
};

const sendWelcomeEmail = async ({ user }) => {
  if (!user?.email) {
    console.warn('Email utilisateur manquant, bienvenue non envoyee.');
    return {
      delivered: false,
      warning: 'Email utilisateur manquant.'
    };
  }

  const { subject, text, html } = buildWelcomeEmail({ user });
  return sendMail({ to: user.email, subject, text, html });
};

const getVerificationEmailPreview = (email) => {
  if (!email) return null;
  return verificationPreviews.get(String(email).toLowerCase()) || null;
};

module.exports = {
  sendVerificationEmail,
  sendWelcomeEmail,
  getVerificationEmailPreview,
  sendMail
};
