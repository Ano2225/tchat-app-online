const express = require('express');
const router = express.Router();
const auth = require('../config/auth');
const User = require('../models/User');
const { getVerificationEmailPreview } = require('../services/emailService');

const EMAIL_NOT_VERIFIED = 'EMAIL_NOT_VERIFIED';

const buildSessionFromResult = (result) => {
  if (!result) return null;
  if (result.session) return result.session;
  if (result.token) return { token: result.token };
  return null;
};

const getErrorStatus = (error) => {
  return Number(error?.statusCode || error?.status) || 500;
};

const buildCallbackUrl = (callbackURL) => {
  if (!callbackURL) return null;
  if (/^https?:\/\//i.test(callbackURL)) {
    return callbackURL;
  }
  const base = process.env.FRONTEND_URL || 'http://localhost:3000';
  const normalized = callbackURL.startsWith('/') ? callbackURL : `/${callbackURL}`;
  return `${base}${normalized}`;
};

const getVerifyRedirectTarget = (callbackURL) => {
  return buildCallbackUrl(callbackURL) || `${process.env.FRONTEND_URL || 'http://localhost:3000'}/login`;
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
    const emailPreview = getVerificationEmailPreview(email);

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

    const result = await auth.api.signInEmail({
      body: { email, password }
    });

    if (!result || !result.user) {
      return res.status(500).json({ error: 'Réponse de connexion invalide' });
    }

    res.json({
      success: true,
      user: result.user,
      session: buildSessionFromResult(result)
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
router.put('/change-password', handleChangePassword);
router.post('/change-password', handleChangePassword);

const handleSendVerificationEmail = async (req, res) => {
  try {
    const { email, callbackURL } = req.body || {};

    if (!email) {
      return res.status(400).json({ error: 'Email requis' });
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
    
    if (!username) {
      return res.status(400).json({ error: 'Nom d\'utilisateur requis' });
    }

    if (!isValidUsername(username)) {
      return res.status(400).json({
        error: 'Nom d\'utilisateur invalide (3-20 caractères, lettres/chiffres/underscore)'
      });
    }

    await ensureUsernameAvailable(username);

    const ctx = await auth.$context;
    if (!ctx?.internalAdapter) {
      return res.status(500).json({ error: 'Adaptateur d\'authentification indisponible' });
    }

    // Créer un utilisateur anonyme temporaire sans email verification
    const anonymousEmail = `${username}_${Date.now()}@anonymous.local`;
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

    const session = await ctx.internalAdapter.createSession(anonymousUser.id);
    if (!session) {
      return res.status(500).json({ error: 'Création de session anonyme échouée' });
    }

    res.json({
      success: true,
      user: anonymousUser,
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
    const sessionToken = req.headers.authorization?.replace('Bearer ', '');
    
    if (sessionToken) {
      await auth.api.signOut({
        headers: { authorization: `Bearer ${sessionToken}` }
      });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Erreur déconnexion:', error);
    const normalized = normalizeAuthError(error);
    res.status(normalized.status).json(normalized);
  }
});

// Route pour obtenir l'utilisateur actuel
router.get('/me', async (req, res) => {
  try {
    const sessionToken = req.headers.authorization?.replace('Bearer ', '');
    
    if (!sessionToken) {
      return res.status(401).json({ error: 'Token manquant' });
    }

    const result = await auth.api.getSession({
      headers: { authorization: `Bearer ${sessionToken}` }
    });

    if (!result || !result.user || !result.session) {
      return res.status(401).json({ error: 'Session invalide' });
    }

    res.json({
      success: true,
      user: result.user,
      session: result.session
    });

  } catch (error) {
    console.error('Erreur récupération utilisateur:', error);
    const normalized = normalizeAuthError(error);
    res.status(normalized.status).json(normalized);
  }
});

// Email verification callback
router.get('/verify-email', async (req, res) => {
  try {
    const token = req.query.token;
    const callbackURL = req.query.callbackURL;

    if (!token || typeof token !== 'string') {
      return res.status(400).json({ error: 'Token manquant' });
    }

    const result = await auth.api.verifyEmail({
      query: {
        token,
        ...(callbackURL ? { callbackURL } : {})
      },
      headers: req.headers
    });

    const redirectTarget = getVerifyRedirectTarget(
      typeof callbackURL === 'string' ? callbackURL : undefined
    );
    if (result?.status) {
      return res.redirect(redirectTarget);
    }
    return res.json(result);
  } catch (error) {
    const statusCode = Number(error?.statusCode || error?.status);
    const redirectLocation = error?.headers?.Location || error?.headers?.location;
    if (redirectLocation) {
      return res.redirect(redirectLocation);
    }

    if (statusCode === 302 || error?.status === 'FOUND') {
      const redirectTarget = getVerifyRedirectTarget(
        typeof req.query.callbackURL === 'string' ? req.query.callbackURL : undefined
      );
      return res.redirect(redirectTarget);
    }

    const normalized = normalizeAuthError(error);
    if (normalized.status === 302) {
      const redirectTarget = getVerifyRedirectTarget(
        typeof req.query.callbackURL === 'string' ? req.query.callbackURL : undefined
      );
      return res.redirect(redirectTarget);
    }
    return res.status(normalized.status).json(normalized);
  }
});

module.exports = router;
