const Settings = require('../models/settings.model');

// GET /api/admin/settings
const getSettings = async (_req, res) => {
  try {
    const settings = await Settings.getSingleton();
    res.json(settings);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to load settings' });
  }
};

// PATCH /api/admin/settings
const updateSettings = async (req, res) => {
  try {
    const updated = await Settings.updateFromPayload(req.body || {}, req.user && (req.user.id || req.user._id));
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message || 'Failed to update settings' });
  }
};

module.exports = { getSettings, updateSettings };
