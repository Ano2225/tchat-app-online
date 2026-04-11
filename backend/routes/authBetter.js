const express = require('express');
const router = express.Router();
const auth = require('../config/auth');
const User = require('../models/User');
const { ObjectId } = require('mongodb');
const { getVerificationEmailPreview, sendMail, sendWelcomeEmail } = require('../services/emailService');
const crypto = require('crypto');
// Password hashing using the same scrypt config as better-auth
// Format: hexSalt:hexKey  (matches better-auth's own hashPassword/verifyPassword)
const { scryptAsync } = require('@noble/hashes/scrypt.js');
const { bytesToHex, randomBytes: nobleRandomBytes } = require('@noble/hashes/utils.js');

const hashPassword = async (password) => {
  // better-auth's hashPassword uses the hex string directly as the salt argument
  // to scryptAsync (not the raw bytes). Its verifyPassword splits "salt:key",
  // then calls generateKey(password, salt) with the same hex string — so
  // scrypt sees the hex string as UTF-8 bytes in both paths.
  // We must replicate that exact behaviour to produce a hash that better-auth can verify.
  const salt = bytesToHex(nobleRandomBytes(16)); // hex string (32 chars, 16 bytes encoded)
  const key = await scryptAsync(password.normalize('NFKC'), salt, { N: 16384, r: 16, p: 1, dkLen: 64, maxmem: 128 * 16384 * 16 * 2 });
  return `${salt}:${bytesToHex(key)}`;
};
const { authMiddleware, sessionCache } = require('../middleware/authBetter');
const { getCsrfToken, csrfProtection } = require('../middleware/csrf');

// ── httpOnly session cookie helpers ────���─────────────────────────────────────
const COOKIE_NAME = 'session_token';
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days (matches session TTL)

const setSessionCookie = (res, token) => {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  });
};

const clearSessionCookie = (res) => {
  res.clearCookie(COOKIE_NAME, { path: '/' });
};
// ─────────────────────────────────────────────────────────────────────────────

const EMAIL_NOT_VERIFIED = 'EMAIL_NOT_VERIFIED';

const buildSessionFromResult = (result) => {
  if (!result) return null;
  // better-auth may put the token in result.token, result.session.token, or both
  const token = result.session?.token || result.token || null;
  if (!token) return result.session || null;
  // Always embed the token inside the returned session object
  return { ...(result.session || {}), token };
};

const getErrorStatus = (error) => {
  return Number(error?.statusCode || error?.status) || 500;
};

const normalizeBaseUrl = (value) => {
  if (!value) return '';
  return String(value).split(',')[0].trim().replace(/\/+$/, '');
};

const isLocalHost = (value) => {
  return /(^|\/\/)(localhost|127\.0\.0\.1)(:\d+)?$/i.test(String(value || '').trim());
};

// Build the set of allowed frontend origins from FRONTEND_URL (comma-separated)
const getAllowedFrontendOrigins = () => {
  const raw = process.env.FRONTEND_URL || 'http://localhost:3000';
  return raw.split(',').map(o => normalizeBaseUrl(o)).filter(Boolean);
};

const getFrontendBaseUrl = (req) => {
  const allowed = getAllowedFrontendOrigins();

  // In development, use the first configured origin
  if (process.env.NODE_ENV === 'development') {
    return allowed[0] || 'http://localhost:3000';
  }

  // In production, only use a non-localhost configured origin — never trust request headers
  const prodOrigin = allowed.find(o => !isLocalHost(o));
  if (prodOrigin) return prodOrigin;

  // Last-resort fallback (should not be reached if FRONTEND_URL is set correctly)
  return 'https://babichat.tech';
};

const buildCallbackUrl = (callbackURL, req) => {
  if (!callbackURL) return null;
  const base = getFrontendBaseUrl(req);
  // Absolute URLs are only allowed if they start with an allowed frontend origin
  if (/^https?:\/\//i.test(callbackURL)) {
    const allowed = getAllowedFrontendOrigins();
    if (allowed.some(o => callbackURL.startsWith(o))) {
      return callbackURL;
    }
    // Reject: absolute URL not in allowlist (open redirect prevention)
    return `${base}/`;
  }
  const normalized = callbackURL.startsWith('/') ? callbackURL : `/${callbackURL}`;
  return `${base}${normalized}`;
};

const getVerifyRedirectTarget = (callbackURL, req) => {
  return buildCallbackUrl(callbackURL, req) || `${getFrontendBaseUrl(req)}/login`;
};

const normalizeAuthError = (error) => {
  const message = error?.message || error?.body?.message || 'Erreur serveur';
  if (message === EMAIL_NOT_VERIFIED || error?.body?.code === EMAIL_NOT_VERIFIED) {
    return {
      status: 403,
      error: 'Veuillez confirmer votre email avant de vous connecter',
      code: EMAIL_NOT_VERIFIED
    };
  }

  return {
    status: getErrorStatus(error),
    error: message,
    code: error?.body?.code
  };
};

const normalizeUsername = (value) => {
  return typeof value === 'string' ? value.trim() : '';
};

const isValidUsername = (value) => {
  return /^[a-zA-Z0-9_]{3,20}$/.test(value);
};

const ensureUsernameAvailable = async (username) => {
  if (!username) return;
  const existingUser = await User.findOne({ username }).select('_id').lean();
  if (existingUser) {
    const error = new Error('Nom d\'utilisateur déjà utilisé');
    error.statusCode = 409;
    throw error;
  }
};

const extractResetToken = (value) => {
  if (!value) return '';
  const normalizedValue = decodeURIComponent(String(value)).trim();
  const match = normalizedValue.match(/[a-f0-9]{64}/i);
  return match ? match[0].toLowerCase() : '';
};

// Routes better-auth automatiques
router.use('/auth', auth.handler);

// Route personnalisée pour l'inscription avec champs additionnels
router.post('/register', async (req, res) => {
  try {
    const { email, password, username, age, sexe, ville } = req.body;
    
    // Validation basique
    if (!email || !password || !username) {
      return res.status(400).json({ 
        error: 'Email, mot de passe et nom d\'utilisateur requis' 
      });
    }

    await ensureUsernameAvailable(username);

    // Créer l'utilisateur avec better-auth
    const result = await auth.api.signUpEmail({
      body: {
        email,
        password,
        name: username,
        username,
        age: age || null,
        sexe: sexe || 'autre',
        ville: ville || '',
        role: 'user',
        isAnonymous: false
      }
    });

    if (!result || !result.user) {
      return res.status(500).json({ error: 'Réponse d\'inscription invalide' });
    }

    const session = buildSessionFromResult(result);
    // Set httpOnly cookie so the token is not exposed to JavaScript on subsequent requests
    if (session?.token) setSessionCookie(res, session.token);

    const emailPreview = getVerificationEmailPreview(email);

    // If email verification is disabled (no RESEND_API_KEY), send welcome email now.
    // Otherwise it's sent after the user clicks the verification link.
    if (!process.env.RESEND_API_KEY) {
      sendWelcomeEmail({ user: result.user }).catch(() => {});
    }

    res.json({
      success: true,
      user: result.user,
      session,
      verificationRequired: !session,
      emailDelivery: emailPreview
        ? {
            delivered: emailPreview.delivered,
            warning: emailPreview.warning,
            verificationUrl: emailPreview.url
          }
        : undefined
    });

  } catch (error) {
    console.error('Erreur inscription:', error);
    const normalized = normalizeAuthError(error);
    res.status(normalized.status).json(normalized);
  }
});

// Route personnalisée pour la connexion
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: 'Email et mot de passe requis'
      });
    }

    // Resolve username to email if the input is not an email address
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    let resolvedEmail = email;
    if (!isEmail) {
      const userByUsername = await User.findOne({ username: email }).select('email').lean();
      if (!userByUsername) {
        return res.status(401).json({ error: 'Identifiants incorrects', code: 'INVALID_CREDENTIALS' });
      }
      resolvedEmail = userByUsername.email;
    }

    const result = await auth.api.signInEmail({
      body: { email: resolvedEmail, password }
    });

    if (!result || !result.user) {
      return res.status(500).json({ error: 'Réponse de connexion invalide' });
    }

    const loginSession = buildSessionFromResult(result);
    if (loginSession?.token) setSessionCookie(res, loginSession.token);

    res.json({
      success: true,
      user: result.user,
      session: loginSession
    });

  } catch (error) {
    console.error('Erreur connexion:', error);
    const normalized = normalizeAuthError(error);
    res.status(normalized.status).json(normalized);
  }
});

const handleChangePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, revokeOtherSessions } = req.body || {};

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Mot de passe actuel et nouveau requis' });
    }

    const sessionToken = req.headers.authorization?.replace('Bearer ', '');
    if (!sessionToken) {
      return res.status(401).json({ error: 'Token d\'authentification manquant' });
    }

    await auth.api.changePassword({
      body: {
        currentPassword,
        newPassword,
        ...(typeof revokeOtherSessions === 'boolean' ? { revokeOtherSessions } : {})
      },
      headers: { authorization: `Bearer ${sessionToken}` }
    });

    return res.json({ success: true, message: 'Mot de passe modifie avec succes' });
  } catch (error) {
    console.error('Erreur changement mot de passe:', error);
    const normalized = normalizeAuthError(error);
    return res.status(normalized.status).json({ message: normalized.error, code: normalized.code });
  }
};

// Route personnalisée pour le changement de mot de passe
router.put('/change-password', authMiddleware, csrfProtection, handleChangePassword);
router.post('/change-password', authMiddleware, csrfProtection, handleChangePassword);

const handleSendVerificationEmail = async (req, res) => {
  try {
    let { email, callbackURL } = req.body || {};

    if (!email) {
      return res.status(400).json({ error: 'Email requis' });
    }

    // Resolve username → email (user may have typed their username, not their email)
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!isEmail) {
      const userByUsername = await User.findOne({ username: email, isAnonymous: { $ne: true } })
        .select('email').lean();
      if (!userByUsername) {
        return res.status(404).json({ error: 'Utilisateur introuvable' });
      }
      email = userByUsername.email;
    }

    await auth.api.sendVerificationEmail({
      body: {
        email,
        ...(callbackURL ? { callbackURL } : {})
      }
    });

    const preview = getVerificationEmailPreview(email);
    return res.json({
      success: true,
      delivered: preview?.delivered ?? true,
      warning: preview?.warning,
      verificationUrl: preview?.url
    });
  } catch (error) {
    console.error('Erreur envoi verification email:', error);
    const normalized = normalizeAuthError(error);
    return res.status(normalized.status).json({ message: normalized.error, code: normalized.code });
  }
};

// Route pour renvoyer l'email de verification
router.post('/send-verification-email', handleSendVerificationEmail);

// Route pour l'utilisateur anonyme
router.post('/anonymous', async (req, res) => {
  try {
    const username = normalizeUsername(req.body?.username);
    const age  = req.body?.age  ? parseInt(req.body.age)  : null;
    const sexe = req.body?.sexe || null;
    
    if (!username) {
      return res.status(400).json({ error: 'Nom d\'utilisateur requis' });
    }

    if (!isValidUsername(username)) {
      return res.status(400).json({
        error: 'Nom d\'utilisateur invalide (3-20 caractères, lettres/chiffres/underscore)'
      });
    }

    // Block if a registered (non-anonymous) user holds this username.
    const existingRegistered = await User.findOne({ username, isAnonymous: { $ne: true } }).select('_id').lean();
    if (existingRegistered) {
      return res.status(409).json({ error: 'Ce nom d\'utilisateur est déjà pris par un compte inscrit' });
    }

    // Remove any stale anonymous account with this username to avoid the unique-index violation.
    // Their messages remain visible via the denormalized senderUsername field.
    await User.deleteOne({ username, isAnonymous: true });

    const ctx = await auth.$context;
    if (!ctx?.internalAdapter) {
      return res.status(500).json({ error: 'Adaptateur d\'authentification indisponible' });
    }

    // Créer un utilisateur anonyme temporaire sans email verification
    const anonymousEmail = `${username}_${require('crypto').randomUUID()}@anonymous.local`;
    const anonymousUser = await ctx.internalAdapter.createUser({
      email: anonymousEmail,
      emailVerified: true,
      name: username,
      username,
      role: 'user',
      isAnonymous: true
    });

    if (!anonymousUser) {
      return res.status(500).json({ error: 'Création utilisateur anonyme échouée' });
    }

    // Save age & sexe directly at creation
    const extra = {};
    if (age)  extra.age  = age;
    if (sexe) extra.sexe = sexe;
    const anonId = String(anonymousUser.id || anonymousUser._id || '');
    if (Object.keys(extra).length && anonId) {
      // The _id may be stored as ObjectId (24-char) or string (32-char) — try both
      const idQuery = /^[0-9a-f]{24}$/i.test(anonId)
        ? { $or: [{ _id: anonId }, { _id: new ObjectId(anonId) }] }
        : { _id: anonId };
      await User.collection.updateOne(idQuery, { $set: extra });
    }

    const session = await ctx.internalAdapter.createSession(anonymousUser.id);
    if (!session) {
      return res.status(500).json({ error: 'Création de session anonyme échouée' });
    }

    if (session?.token) setSessionCookie(res, session.token);

    res.json({
      success: true,
      user: { ...anonymousUser, ...extra },
      session
    });

  } catch (error) {
    console.error('Erreur utilisateur anonyme:', error);
    const normalized = normalizeAuthError(error);
    res.status(normalized.status).json(normalized);
  }
});

// Route pour la déconnexion
router.post('/logout', async (req, res) => {
  try {
    const sessionToken = req.headers.authorization?.replace('Bearer ', '')
      || req.cookies?.session_token;

    if (sessionToken) {
      await auth.api.signOut({
        headers: { authorization: `Bearer ${sessionToken}` }
      });
      // Clear from cache immediately so the token is invalid on next request
      sessionCache.delete(sessionToken);
    }

    // Always clear the httpOnly cookie regardless of token presence
    clearSessionCookie(res);
    res.json({ success: true });
  } catch (error) {
    console.error('Erreur déconnexion:', error);
    const normalized = normalizeAuthError(error);
    res.status(normalized.status).json(normalized);
  }
});

// Route pour obtenir l'utilisateur actuel — accepte cookie OU Bearer via authMiddleware
router.get('/me', authMiddleware, (req, res) => {
  res.json({
    success: true,
    user: req.user,
    session: req.session
  });
});

// Email verification callback
router.get('/verify-email', async (req, res) => {
  const token = req.query.token;

  if (!token || typeof token !== 'string') {
    return res.status(400).json({ error: 'Token manquant' });
  }

  // Fetch the user email from the verification record BEFORE the token is consumed
  // by better-auth (which deletes it on success).
  let verifiedUserEmail = null;
  try {
    const db = require('mongoose').connection.db;
    const record = await db.collection('verification').findOne({ value: token });
    if (record?.identifier) verifiedUserEmail = record.identifier;
  } catch (_) { /* non-blocking */ }

  const sendWelcome = () => {
    if (!verifiedUserEmail) return;
    User.findOne({ email: verifiedUserEmail }).lean()
      .then(u => { if (u) sendWelcomeEmail({ user: u }).catch(() => {}); })
      .catch(() => {});
  };

  const frontendBase = getFrontendBaseUrl(req);
  const emailVerifiedPage = `${frontendBase}/email-verified`;

  try {
    await auth.api.verifyEmail({
      query: { token },
      headers: req.headers
    });

    // better-auth returned normally (rare) — send welcome and redirect
    sendWelcome();
    return res.redirect(emailVerifiedPage);
  } catch (error) {
    const statusCode = Number(error?.statusCode || error?.status);

    // better-auth throws a 302 on success — this is the normal path
    const isSuccessRedirect =
      statusCode === 302 ||
      error?.status === 'FOUND' ||
      error?.headers?.Location ||
      error?.headers?.location;

    if (isSuccessRedirect) {
      sendWelcome();
      return res.redirect(emailVerifiedPage);
    }

    const normalized = normalizeAuthError(error);
    return res.status(normalized.status).json(normalized);
  }
});

router.get('/csrf-token', authMiddleware, getCsrfToken);

/* ── Password reset ─────────────────────────────────────────────────────── */

router.post('/request-password-reset', async (req, res) => {
  try {
    const { email: identifier } = req.body;
    if (!identifier) return res.status(400).json({ message: 'Email ou nom d\'utilisateur requis' });

    const trimmed = identifier.trim();
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);

    // Resolve username → email when the user typed their username
    let user;
    if (isEmail) {
      user = await User.findOne({ email: trimmed.toLowerCase(), isAnonymous: { $ne: true } });
    } else {
      user = await User.findOne({ username: trimmed, isAnonymous: { $ne: true } });
    }

    // Always respond success to avoid user enumeration
    if (!user) {
      return res.json({ success: true, message: 'Si cet email existe, un lien a été envoyé.' });
    }

    // Generate a secure random token
    const rawToken   = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expires    = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    const updateResult = await User.updateOne(
      { email: user.email },
      { $set: { resetPasswordToken: hashedToken, resetPasswordExpires: expires } }
    );

    if (updateResult.matchedCount === 0) {
      console.error(`[password-reset] Failed to store token — user not found by email: ${user.email}`);
      return res.status(500).json({ message: 'Erreur serveur' });
    }

    const frontendUrl = getFrontendBaseUrl(req);
    const resetUrl = `${frontendUrl}/reset-password?token=${rawToken}`;

    const result = await sendMail({
      to: user.email,
      subject: 'Réinitialisation de votre mot de passe',
      text: `Bonjour ${user.username},\n\nCliquez sur le lien suivant pour réinitialiser votre mot de passe (valide 1 heure) :\n${resetUrl}\n\nSi vous n'êtes pas à l'origine de cette demande, ignorez cet email.`,
      html: `<p>Bonjour <strong>${user.username}</strong>,</p><p>Cliquez sur le lien ci-dessous pour réinitialiser votre mot de passe (valide 1 heure) :</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.</p>`
    });

    if (!result.delivered) {
      console.warn(`[password-reset] Email delivery failed for ${user.email} — token not sent to client`);
    }

    return res.json({
      success: true,
      message: 'Si cet email existe, un lien a été envoyé.',
      // Non-production only: expose the raw token so the reset flow can be tested without SMTP
      ...(process.env.NODE_ENV !== 'production' && { resetToken: rawToken })
    });
  } catch (error) {
    console.error('Erreur request-password-reset:', error);
    return res.status(500).json({ message: 'Erreur serveur' });
  }
});

router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    const normalizedToken = extractResetToken(token);
    if (!normalizedToken || !newPassword) return res.status(400).json({ message: 'Token et nouveau mot de passe requis' });
    if (newPassword.length < 8) return res.status(400).json({ message: 'Le mot de passe doit contenir au moins 8 caractères' });

    const hashedToken = crypto.createHash('sha256').update(normalizedToken).digest('hex');

    const user = await User.findOne({
      resetPasswordToken:   hashedToken,
      resetPasswordExpires: { $gt: new Date() },
      isAnonymous:          { $ne: true }
    });

    if (!user) return res.status(400).json({ message: 'Token invalide ou expiré' });

    // Hash using the same scrypt config as better-auth (salt:key hex format)
    const hashedPassword = await hashPassword(newPassword);

    // Update the password in better-auth's account collection.
    // The mongodb adapter stores userId as ObjectId when the ID is a valid 24-char hex string
    // (which is the case for better-auth v1.4+ with the mongodb adapter).
    // We must query with both the string and the ObjectId form to handle all cases.
    const db = require('mongoose').connection.db;
    const userId = String(user._id);
    const userIdVariants = [userId];
    if (/^[0-9a-f]{24}$/i.test(userId)) {
      try { userIdVariants.push(new ObjectId(userId)); } catch (_) { /* not a valid ObjectId */ }
    }

    await db.collection('account').updateOne(
      { userId: { $in: userIdVariants }, providerId: 'credential' },
      { $set: { password: hashedPassword } }
    );

    // Clear reset token
    await User.updateOne(
      { email: user.email },
      { $unset: { resetPasswordToken: 1, resetPasswordExpires: 1 } }
    );

    return res.json({ success: true, message: 'Mot de passe réinitialisé avec succès' });
  } catch (error) {
    console.error('Erreur reset-password:', error);
    return res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;
