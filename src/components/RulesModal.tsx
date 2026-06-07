import React from 'react';

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const RulesModal: React.FC<RulesModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal rules-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">How to Play</h2>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close rules">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="var(--text-dark)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
        
        <div className="rules-content">
          <p className="rules-intro">
            Sudoku is a logic-based number puzzle. The objective is to fill a 9×9 grid with digits so that each column, row, and 3×3 subgrid contains all of the digits from 1 to 9.
          </p>

          <div className="rules-section">
            <h3>Basic Rules</h3>
            <div className="rule-card">
              <div className="rule-icon">1</div>
              <div className="rule-text">
                <strong>Every Row:</strong> Must contain numbers from 1 to 9, without repetition.
              </div>
            </div>
            <div className="rule-card">
              <div className="rule-icon">2</div>
              <div className="rule-text">
                <strong>Every Column:</strong> Must contain numbers from 1 to 9, without repetition.
              </div>
            </div>
            <div className="rule-card">
              <div className="rule-icon">3</div>
              <div className="rule-text">
                <strong>Every 3x3 Box:</strong> Must contain numbers from 1 to 9, without repetition.
              </div>
            </div>
          </div>

          <div className="rules-section">
            <h3>Useful Tips</h3>
            <div className="tips-list">
              <div className="tip-item">
                <strong>Pencil Marks (Notes):</strong> Toggle the <strong>Notes</strong> button to write down possibilities for a cell. This helps you narrow down candidates.
              </div>
              <div className="tip-item">
                <strong>Process of Elimination:</strong> Look for cells where only a single number can fit because all other numbers (1-9) are already present in its row, column, or 3x3 box.
              </div>
              <div className="tip-item">
                <strong>Only One Solution:</strong> Every valid Sudoku puzzle has exactly one correct solution. No guessing is required!
              </div>
            </div>
          </div>
        </div>

        <button className="modal-btn close-rules-btn" onClick={onClose}>
          Got it!
        </button>
      </div>
    </div>
  );
};

export default RulesModal;
