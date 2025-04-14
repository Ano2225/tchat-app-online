const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    trim: true,
    minlength: 3,
    maxlength: 30
  },
  avatarUrl : {
    type: String,
  },
  email: {
    type: String,
    required: false,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: false
  },
  sexe: {
    type: String,
    enum: ['homme', 'femme', 'autre'],
    default: 'Autre',
  },
  ville : {
    type: String,
  },
  age : {
    type: String,
    required: true
  },
  isAnonymous: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastSeen: {
    type: Date,
    default: Date.now
  },
  isOnline : {
    type: Boolean,
    default: false,
  }
});

module.exports = mongoose.model('User', UserSchema);
