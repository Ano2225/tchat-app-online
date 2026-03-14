const mongoose = require('mongoose');

// Modèle User compatible avec better-auth
// better-auth stores _id as 32-char hex string (not ObjectId) — declare as String
// so Mongoose does not try to cast to ObjectId on findById/findOne calls.
const UserSchema = new mongoose.Schema({
  _id: { type: String },
  email: { type: String, required: true, unique: true },
  emailVerified: { type: Boolean, default: false },
  username: { type: String, required: true, unique: true },
  name: String,
  image: String,
  
  // Champs personnalisés
  age: Number,
  sexe: { type: String, enum: ['homme', 'femme', 'autre'], default: 'autre' },
  ville: String,
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  isAnonymous: { type: Boolean, default: false },
  avatarUrl: String,
  bgColor: String,
  isOnline: { type: Boolean, default: false },
  lastSeen: { type: Date, default: null },
  isBlocked: { type: Boolean, default: false },
  blockedUsers: [{ type: String, ref: 'User' }],
  
  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  _id: false,      // _id is declared explicitly as String above; don't auto-generate
  timestamps: true,
  collection: 'user'
});

module.exports = mongoose.model('User', UserSchema);
