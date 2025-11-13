// Système de nettoyage automatique de la mémoire
const CLEANUP_INTERVAL = 300000; // 5 minutes
const MAX_INACTIVE_TIME = 1800000; // 30 minutes

class MemoryCleanup {
  constructor() {
    this.cleanupInterval = null;
  }

  start(activeGames, gameTimers, userActionTimestamps) {
    this.activeGames = activeGames;
    this.gameTimers = gameTimers;
    this.userActionTimestamps = userActionTimestamps;
    
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, CLEANUP_INTERVAL);
  }

  cleanup() {
    const now = Date.now();
    let cleaned = 0;

    // Nettoyer les jeux inactifs
    for (const [channel, game] of this.activeGames.entries()) {
      const lastActivity = game.currentQuestion?.startTime || game.lastActivity || 0;
      if (now - new Date(lastActivity).getTime() > MAX_INACTIVE_TIME) {
        this.activeGames.delete(channel);
        cleaned++;
      }
    }

    // Nettoyer les actions utilisateurs expirées
    for (const [userId, actions] of this.userActionTimestamps.entries()) {
      const validActions = actions.filter(timestamp => now - timestamp < 60000);
      if (validActions.length === 0) {
        this.userActionTimestamps.delete(userId);
      } else {
        this.userActionTimestamps.set(userId, validActions);
      }
    }

    if (cleaned > 0) {
      console.log(`[CLEANUP] Cleaned ${cleaned} inactive games`);
    }
  }

  stop() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}

module.exports = new MemoryCleanup();