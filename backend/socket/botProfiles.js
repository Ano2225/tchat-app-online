/**
 * Profils bots partagés entre socketHandlers et botService.
 * Source de vérité unique.
 */
const BOT_PROFILES = [
  {
    id:       'bot_aya',
    username: 'Aya_CI',
    sexe:     'femme',
    age:      22,
    ville:    'Abidjan',
    avatarUrl: null,
    channels: ['General'],
    minDelay: 40_000,
    maxDelay: 90_000,
  },
  {
    id:       'bot_bintou',
    username: 'Bintou_bk',
    sexe:     'femme',
    age:      24,
    ville:    'Bouaké',
    avatarUrl: null,
    channels: ['General'],
    minDelay: 50_000,
    maxDelay: 110_000,
  },
  {
    id:       'bot_konan',
    username: 'Konan_225',
    sexe:     'homme',
    age:      26,
    ville:    'Abidjan',
    avatarUrl: null,
    channels: ['General'],
    minDelay: 60_000,
    maxDelay: 120_000,
  },
];

module.exports = { BOT_PROFILES };
