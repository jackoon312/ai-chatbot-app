import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useTheme } from '../context/ThemeContext';

const Settings = () => {
  const navigate = useNavigate();
  const { darkMode, toggleDarkMode } = useTheme();
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await api.get('/settings');
        setSettings(response.data.settings);
      } catch (err) {
        setError('Could not load settings.');
      } finally {
        setLoading(false);
      }
    };
    loadSettings();
  }, []);

  const handleChange = (field, value) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
    setSaved(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const response = await api.put('/settings', {
        defaultMode: settings.defaultMode,
        temperature: Number(settings.temperature),
        maxTokens: Number(settings.maxTokens),
        systemPrompt: settings.systemPrompt,
        notificationsEnabled: settings.notificationsEnabled,
      });
      setSettings(response.data.settings);
      setSaved(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-[var(--text-secondary)]">
        Loading settings...
      </div>
    );
  }

  const inputClass =
    'w-full rounded-xl bg-[var(--bg-page)] border border-[var(--border-subtle)] px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] transition';

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-8">
      <div className="max-w-xl mx-auto">
        <button
          onClick={() => navigate(-1)}
          className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] mb-4"
        >
          ← Back
        </button>
        <h1 className="text-2xl font-semibold tracking-tight mb-1">Settings</h1>
        <p className="text-sm text-[var(--text-secondary)] mb-6">
          Adjust how the assistant behaves and how the app looks.
        </p>

        <form onSubmit={handleSave} className="space-y-6">
          {/* Behavior section */}
          <section className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-2xl p-5 space-y-5">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
              Behavior
            </h2>

            <div>
              <label className="block text-sm font-medium mb-1.5">Default Mode</label>
              <select
                value={settings.defaultMode}
                onChange={(e) => handleChange('defaultMode', e.target.value)}
                className={inputClass}
              >
                <option value="General">General</option>
                <option value="Coding">Coding</option>
                <option value="Productivity">Productivity</option>
                <option value="Learning">Learning</option>
              </select>
              <p className="text-xs text-[var(--text-secondary)] mt-1.5">
                Applied to every new conversation you start.
              </p>
            </div>

            <div>
              <div className="flex items-baseline justify-between mb-1.5">
                <label className="text-sm font-medium">Temperature</label>
                <span className="text-xs text-[var(--text-secondary)] font-mono">
                  {settings.temperature}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={settings.temperature}
                onChange={(e) => handleChange('temperature', e.target.value)}
                className="w-full accent-[var(--accent)]"
              />
              <div className="flex justify-between text-[10px] text-[var(--text-secondary)] mt-1">
                <span>Focused</span>
                <span>Creative</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">Max Response Length</label>
              <input
                type="number"
                min="1"
                max="8192"
                value={settings.maxTokens}
                onChange={(e) => handleChange('maxTokens', e.target.value)}
                className={inputClass}
              />
              <p className="text-xs text-[var(--text-secondary)] mt-1.5">Measured in tokens.</p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">Custom System Prompt</label>
              <textarea
                rows={3}
                value={settings.systemPrompt}
                onChange={(e) => handleChange('systemPrompt', e.target.value)}
                placeholder="Leave blank to use the default personality for each mode"
                className={`${inputClass} resize-none`}
              />
            </div>

            <label className="flex items-center justify-between text-sm cursor-pointer">
              <span>Enable notifications</span>
              <input
                type="checkbox"
                checked={settings.notificationsEnabled}
                onChange={(e) => handleChange('notificationsEnabled', e.target.checked)}
                className="accent-[var(--accent)] w-4 h-4"
              />
            </label>
          </section>

          {/* Appearance section */}
          <section className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-2xl p-5">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)] mb-4">
              Appearance
            </h2>
            <label className="flex items-center justify-between text-sm cursor-pointer">
              <span>Dark mode</span>
              <input
                type="checkbox"
                checked={darkMode}
                onChange={toggleDarkMode}
                className="accent-[var(--accent)] w-4 h-4"
              />
            </label>
          </section>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-50 text-white text-sm font-medium px-5 py-2.5 transition"
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
            {saved && <span className="text-green-600 dark:text-green-400 text-sm">Saved!</span>}
          </div>
        </form>
      </div>
    </div>
  );
};

export default Settings;
