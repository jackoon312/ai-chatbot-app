const AISettings = require('../models/AISettings');

// @route  GET /api/settings
// Auto-creates a default settings document the first time a user requests it.
const getSettings = async (req, res) => {
  try {
    let settings = await AISettings.findOne({ userId: req.user._id });

    if (!settings) {
      settings = await AISettings.create({ userId: req.user._id });
    }

    return res.status(200).json({ settings });
  } catch (error) {
    return res.status(500).json({ message: 'Server error fetching settings', error: error.message });
  }
};

// @route  PUT /api/settings
const updateSettings = async (req, res) => {
  try {
    const { defaultMode, temperature, maxTokens, systemPrompt, notificationsEnabled, darkMode } = req.body;

    let settings = await AISettings.findOne({ userId: req.user._id });

    if (!settings) {
      settings = new AISettings({ userId: req.user._id });
    }

    if (defaultMode !== undefined) settings.defaultMode = defaultMode;
    if (temperature !== undefined) settings.temperature = temperature;
    if (maxTokens !== undefined) settings.maxTokens = maxTokens;
    if (systemPrompt !== undefined) settings.systemPrompt = systemPrompt;
    if (notificationsEnabled !== undefined) settings.notificationsEnabled = notificationsEnabled;
    if (darkMode !== undefined) settings.darkMode = darkMode;

    await settings.save();

    return res.status(200).json({ settings });
  } catch (error) {
    return res.status(500).json({ message: 'Server error updating settings', error: error.message });
  }
};

module.exports = { getSettings, updateSettings };
