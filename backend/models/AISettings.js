const mongoose = require('mongoose');

const aiSettingsSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true, // one settings document per user
    },
    defaultMode: {
      type: String,
      enum: ['General', 'Coding', 'Productivity', 'Learning'],
      default: 'General',
    },
    temperature: {
      type: Number,
      default: 0.7,
      min: 0,
      max: 2,
    },
    maxTokens: {
      type: Number,
      default: 1000,
      min: 1,
      max: 8192,
    },
    systemPrompt: {
      type: String,
      default: '', // if set, this overrides the built-in mode prompt
    },
    notificationsEnabled: {
      type: Boolean,
      default: true,
    },
    darkMode: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('AISettings', aiSettingsSchema);
