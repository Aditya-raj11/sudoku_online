import React from 'react';
import type { Board as BoardType, SudokuSettings } from '../engine/types';

interface SudokuBoardProps {
  board: BoardType;
  selectedCell: { row: number; col: number } | null;
  onCellClick: (row: number, col: number) => void;
  isPaused: boolean;
  settings: SudokuSettings;
}

const SudokuBoard: React.FC<SudokuBoardProps> = ({
  board,
  selectedCell,
  onCellClick,
  isPaused,
  settings,
}) => {

  const getCellClasses = (row: number, col: number): string => {
    const classes: string[] = ['cell'];
    const cell = board[row][col];

    if (!selectedCell) {
      if (cell.isGiven) classes.push('given');
      if (cell.isError && settings.highlightMistakes) classes.push('error');
      return classes.join(' ');
    }

    const { row: sr, col: sc } = selectedCell;
    const isSelected = row === sr && col === sc;
    const isSameRow = row === sr;
    const isSameCol = col === sc;
    const isSameBox =
      Math.floor(row / 3) === Math.floor(sr / 3) &&
      Math.floor(col / 3) === Math.floor(sc / 3);
    const selectedValue = board[sr][sc].value;
    const isSameNumber = cell.value !== 0 && cell.value === selectedValue;

    if (isSelected) classes.push('selected');
    else if (isSameNumber && settings.highlightIdentical) classes.push('same-number');
    else if ((isSameRow || isSameCol || isSameBox) && settings.highlightAreas) classes.push('related');

    if (cell.isGiven) classes.push('given');
    else if (cell.value !== 0) classes.push('user-entered');
    if (cell.isError && settings.highlightMistakes) classes.push('error');

    // Border classes
    if (col % 3 === 0 && col !== 0) classes.push('box-left');
    if (row % 3 === 0 && row !== 0) classes.push('box-top');

    return classes.join(' ');
  };

  const renderNotes = (notes: Set<number>) => {
    return (
      <div className="notes-grid">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
          <span key={n} className={`note ${notes.has(n) ? 'visible' : ''}`}>
            {notes.has(n) ? n : ''}
          </span>
        ))}
      </div>
    );
  };

  if (isPaused) {
    return (
      <div className="board-container">
        <div className="board paused-board">
          <div className="pause-overlay">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
              <path d="M8 5v14l11-7z" fill="#4a90d9"/>
            </svg>
            <p>Game Paused</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="board-container">
      <div className="board">
        {board.map((row, r) => (
          <div key={r} className="board-row">
            {row.map((cell, c) => (
              <div
                key={`${r}-${c}`}
                className={getCellClasses(r, c)}
                onClick={() => onCellClick(r, c)}
              >
                {cell.value !== 0 ? (
                  <span className="cell-value">{cell.value}</span>
                ) : cell.notes.size > 0 ? (
                  renderNotes(cell.notes)
                ) : null}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export default SudokuBoard;
