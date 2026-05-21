#!/usr/bin/env node

/**
 * Database initialization script
 * Usage: node db/init.js
 */

require('dotenv').config();
const db = require('./database');

async function init() {
  try {
    console.log('🚀 Initializing SnapVision database...');
    await db.init();
    console.log('✅ Database initialized successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
  }
}

init();
