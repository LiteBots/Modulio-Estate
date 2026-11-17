const mongoose = require('mongoose');

// Ustawienia serwisu edytowane w panelu admina (nadpisują wartości domyślne i zmienne z Railway).
const SettingSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    data: { type: mongoose.Schema.Types.Mixed, default: {} }
  },
  { timestamps: true, minimize: false }
);

module.exports = mongoose.models.Setting || mongoose.model('Setting', SettingSchema);
