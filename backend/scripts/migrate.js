#!/usr/bin/env node

/**
 * Database Migration Script
 * Creates indexes and ensures database schema is up to date
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');
const Message = require('../models/Message');
const Channel = require('../models/Channel');
const Alert = require('../models/Alert');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/babichat';

async function createIndexes() {
  console.log('📊 Creating database indexes...\n');

  try {
    // User indexes
    console.log('Creating User indexes...');
    await User.collection.createIndex({ username: 1 }, { unique: true });
    await User.collection.createIndex({ email: 1 }, { unique: true });
    await User.collection.createIndex({ isOnline: 1 });
    await User.collection.createIndex({ role: 1 });
    await User.collection.createIndex({ createdAt: -1 });
    console.log('✅ User indexes created');

    // RefreshToken indexes
    console.log('Creating RefreshToken indexes...');
    await RefreshToken.collection.createIndex({ token: 1 }, { unique: true });
    await RefreshToken.collection.createIndex({ userId: 1 });
    await RefreshToken.collection.createIndex({ family: 1 });
    await RefreshToken.collection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
    await RefreshToken.collection.createIndex({ isRevoked: 1 });
    console.log('✅ RefreshToken indexes created');

    // Message indexes
    console.log('Creating Message indexes...');
    await Message.collection.createIndex({ channelId: 1, createdAt: -1 });
    await Message.collection.createIndex({ sender: 1 });
    await Message.collection.createIndex({ createdAt: -1 });
    console.log('✅ Message indexes created');

    // Channel indexes
    console.log('Creating Channel indexes...');
    await Channel.collection.createIndex({ name: 1 }, { unique: true });
    await Channel.collection.createIndex({ isPrivate: 1 });
    await Channel.collection.createIndex({ createdAt: -1 });
    console.log('✅ Channel indexes created');

    // Alert indexes
    console.log('Creating Alert indexes...');
    await Alert.collection.createIndex({ type: 1 });
    await Alert.collection.createIndex({ severity: 1 });
    await Alert.collection.createIndex({ isRead: 1 });
    await Alert.collection.createIndex({ createdAt: -1 });
    console.log('✅ Alert indexes created');

    console.log('\n✅ All indexes created successfully!');
  } catch (error) {
    console.error('❌ Error creating indexes:', error.message);
    throw error;
  }
}

async function cleanupExpiredTokens() {
  console.log('\n🧹 Cleaning up expired tokens...');
  
  try {
    const result = await RefreshToken.deleteMany({
      expiresAt: { $lt: new Date() }
    });
    
    console.log(`✅ Deleted ${result.deletedCount} expired tokens`);
  } catch (error) {
    console.error('❌ Error cleaning up tokens:', error.message);
  }
}

async function verifyCollections() {
  console.log('\n🔍 Verifying collections...');
  
  try {
    const collections = await mongoose.connection.db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);
    
    const requiredCollections = ['users', 'refreshtokens', 'messages', 'channels', 'alerts'];
    
    for (const name of requiredCollections) {
      if (collectionNames.includes(name)) {
        console.log(`✅ Collection '${name}' exists`);
      } else {
        console.log(`⚠️  Collection '${name}' does not exist yet (will be created on first use)`);
      }
    }
  } catch (error) {
    console.error('❌ Error verifying collections:', error.message);
  }
}

async function showStats() {
  console.log('\n📊 Database Statistics:');
  
  try {
    const userCount = await User.countDocuments();
    const tokenCount = await RefreshToken.countDocuments();
    const messageCount = await Message.countDocuments();
    const channelCount = await Channel.countDocuments();
    const alertCount = await Alert.countDocuments();
    
    console.log(`Users: ${userCount}`);
    console.log(`Active Tokens: ${tokenCount}`);
    console.log(`Messages: ${messageCount}`);
    console.log(`Channels: ${channelCount}`);
    console.log(`Alerts: ${alertCount}`);
  } catch (error) {
    console.error('❌ Error getting stats:', error.message);
  }
}

async function main() {
  console.log('🚀 BabiChat Database Migration\n');
  console.log(`Connecting to: ${MONGODB_URI}\n`);

  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Run migrations
    await createIndexes();
    await verifyCollections();
    await cleanupExpiredTokens();
    await showStats();

    console.log('\n✅ Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    process.exit(1);
  }
}

// Run migration
main();

