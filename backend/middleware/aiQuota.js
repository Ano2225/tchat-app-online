const AIUsage = require('../models/AIUsage');

const getDateKeyUTC = () => new Date().toISOString().slice(0, 10);

const getNextUtcMidnight = () => {
  const now = new Date();
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0));
  return next.toISOString();
};

const enforceAIQuota = (limitOverride) => {
  const limit = Number(limitOverride || process.env.AI_DAILY_LIMIT || 20);

  return async (req, res, next) => {
    try {
      const userId = req.user?.id || req.user?._id;
      if (!userId) {
        return res.status(401).json({ error: 'Authentification requise pour utiliser l’IA.' });
      }

      const dateKey = getDateKeyUTC();
      const usage = await AIUsage.findOneAndUpdate(
        { userId, dateKey },
        { $inc: { count: 1 }, $setOnInsert: { userId, dateKey } },
        { new: true, upsert: true }
      );

      if (usage.count > limit) {
        await AIUsage.updateOne({ _id: usage._id }, { $inc: { count: -1 } });
        return res.status(429).json({
          error: 'Quota IA atteint. Réessayez demain.',
          limit,
          remaining: 0,
          resetAt: getNextUtcMidnight()
        });
      }

      res.set('X-AI-Limit', String(limit));
      res.set('X-AI-Remaining', String(Math.max(0, limit - usage.count)));
      res.set('X-AI-Reset', getNextUtcMidnight());

      return next();
    } catch (error) {
      console.error('Erreur quota IA:', error);
      return res.status(500).json({ error: 'Erreur serveur (quota IA).' });
    }
  };
};

module.exports = {
  enforceAIQuota
};
