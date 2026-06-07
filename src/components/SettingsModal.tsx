import React from 'react';
import type { SudokuSettings } from '../engine/types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: SudokuSettings;
  onSettingChange: (key: keyof SudokuSettings, value: boolean) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSettingChange,
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal settings-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Settings</h2>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close settings">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="var(--text-dark)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
        <div className="settings-list">
          <div className="settings-item">
            <div className="settings-info">
              <div className="settings-label">Dark Theme</div>
              <div className="settings-desc">Switch to a dark color palette.</div>
            </div>
            <label className="switch">
              <input
                type="checkbox"
                checked={settings.darkTheme}
                onChange={e => onSettingChange('darkTheme', e.target.checked)}
              />
              <span className="slider"></span>
            </label>
          </div>

          <div className="settings-item">
            <div className="settings-info">
              <div className="settings-label">Mistakes Limit</div>
              <div className="settings-desc">Game ends if you make 3 mistakes.</div>
            </div>
            <label className="switch">
              <input
                type="checkbox"
                checked={settings.mistakesLimit}
                onChange={e => onSettingChange('mistakesLimit', e.target.checked)}
              />
              <span className="slider"></span>
            </label>
          </div>

          <div className="settings-item">
            <div className="settings-info">
              <div className="settings-label">Auto-Clear Notes</div>
              <div className="settings-desc">Remove placed numbers from notes automatically.</div>
            </div>
            <label className="switch">
              <input
                type="checkbox"
                checked={settings.autoClearNotes}
                onChange={e => onSettingChange('autoClearNotes', e.target.checked)}
              />
              <span className="slider"></span>
            </label>
          </div>

          <div className="settings-item">
            <div className="settings-info">
              <div className="settings-label">Highlight Areas</div>
              <div className="settings-desc">Highlight row, column and box of selected cell.</div>
            </div>
            <label className="switch">
              <input
                type="checkbox"
                checked={settings.highlightAreas}
                onChange={e => onSettingChange('highlightAreas', e.target.checked)}
              />
              <span className="slider"></span>
            </label>
          </div>

          <div className="settings-item">
            <div className="settings-info">
              <div className="settings-label">Highlight Identical Numbers</div>
              <div className="settings-desc">Highlight cells with the same number.</div>
            </div>
            <label className="switch">
              <input
                type="checkbox"
                checked={settings.highlightIdentical}
                onChange={e => onSettingChange('highlightIdentical', e.target.checked)}
              />
              <span className="slider"></span>
            </label>
          </div>

          <div className="settings-item">
            <div className="settings-info">
              <div className="settings-label">Highlight Mistakes</div>
              <div className="settings-desc">Show wrong numbers in red.</div>
            </div>
            <label className="switch">
              <input
                type="checkbox"
                checked={settings.highlightMistakes}
                onChange={e => onSettingChange('highlightMistakes', e.target.checked)}
              />
              <span className="slider"></span>
            </label>
          </div>

          <div className="settings-item">
            <div className="settings-info">
              <div className="settings-label">Show Timer</div>
              <div className="settings-desc">Display the timer during the game.</div>
            </div>
            <label className="switch">
              <input
                type="checkbox"
                checked={settings.timerEnabled}
                onChange={e => onSettingChange('timerEnabled', e.target.checked)}
              />
              <span className="slider"></span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
