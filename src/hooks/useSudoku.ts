import { useState, useCallback, useEffect, useRef } from 'react';
import type { Difficulty, Board, GameState, HistoryEntry, SudokuSettings } from '../engine/types';
import { generatePuzzle, createBoard, isBoardComplete, isCorrectValue } from '../engine/sudoku';

function deepCloneBoard(board: Board): Board {
  return board.map(row =>
    row.map(cell => ({
      ...cell,
      notes: new Set(cell.notes),
    }))
  );
}

function createInitialState(difficulty: Difficulty): GameState {
  const { puzzle, solution } = generatePuzzle(difficulty);
  return {
    board: createBoard(puzzle, solution),
    selectedCell: null,
    difficulty,
    mistakes: 0,
    maxMistakes: 3,
    hintsRemaining: 3,
    isNotesMode: false,
    isPaused: false,
    isGameOver: false,
    isGameWon: false,
    timer: 0,
    score: 0,
    history: [],
  };
}

export function useSudoku(initialDifficulty: Difficulty = 'easy', settings?: SudokuSettings) {
  const [state, setState] = useState<GameState>(() => createInitialState(initialDifficulty));
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Timer
  useEffect(() => {
    if (state.isPaused || state.isGameOver || state.isGameWon) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    timerRef.current = setInterval(() => {
      setState(prev => ({ ...prev, timer: prev.timer + 1 }));
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [state.isPaused, state.isGameOver, state.isGameWon]);

  const selectCell = useCallback((row: number, col: number) => {
    setState(prev => {
      if (prev.isGameOver || prev.isGameWon || prev.isPaused) return prev;
      return { ...prev, selectedCell: { row, col } };
    });
  }, []);

  const placeNumber = useCallback((num: number) => {
    setState(prev => {
      if (!prev.selectedCell || prev.isGameOver || prev.isGameWon || prev.isPaused) return prev;
      const { row, col } = prev.selectedCell;
      const cell = prev.board[row][col];
      if (cell.isGiven) return prev;

      const newBoard = deepCloneBoard(prev.board);
      const historyEntry: HistoryEntry = {
        row,
        col,
        prevValue: cell.value,
        prevNotes: new Set(cell.notes),
        prevIsError: cell.isError,
        type: prev.isNotesMode ? 'note' : 'value',
      };

      if (prev.isNotesMode) {
        // Toggle note
        if (newBoard[row][col].value !== 0) return prev; // Can't add notes to filled cells
        const notes = newBoard[row][col].notes;
        if (notes.has(num)) {
          notes.delete(num);
        } else {
          notes.add(num);
        }
        return {
          ...prev,
          board: newBoard,
          history: [...prev.history, historyEntry],
        };
      }

      // Place number
      const correct = isCorrectValue(newBoard, row, col, num);
      newBoard[row][col].value = num;
      newBoard[row][col].notes.clear();
      newBoard[row][col].isError = !correct;

      // Remove this number from notes in same row, col, and box
      if (correct && (!settings || settings.autoClearNotes)) {
        for (let i = 0; i < 9; i++) {
          newBoard[row][i].notes.delete(num);
          newBoard[i][col].notes.delete(num);
        }
        const boxRow = Math.floor(row / 3) * 3;
        const boxCol = Math.floor(col / 3) * 3;
        for (let r = boxRow; r < boxRow + 3; r++) {
          for (let c = boxCol; c < boxCol + 3; c++) {
            newBoard[r][c].notes.delete(num);
          }
        }
      }

      const newMistakes = correct ? prev.mistakes : prev.mistakes + 1;
      const isGameOver = (!settings || settings.mistakesLimit) ? (newMistakes >= prev.maxMistakes) : false;
      const isGameWon = !isGameOver && isBoardComplete(newBoard);
      const scoreAdd = correct ? (prev.difficulty === 'easy' ? 10 : prev.difficulty === 'medium' ? 20 : prev.difficulty === 'hard' ? 30 : prev.difficulty === 'expert' ? 40 : prev.difficulty === 'master' ? 50 : 60) : 0;

      return {
        ...prev,
        board: newBoard,
        mistakes: newMistakes,
        isGameOver,
        isGameWon,
        score: prev.score + scoreAdd,
        history: [...prev.history, historyEntry],
      };
    });
  }, [settings]);

  const erase = useCallback(() => {
    setState(prev => {
      if (!prev.selectedCell || prev.isGameOver || prev.isGameWon || prev.isPaused) return prev;
      const { row, col } = prev.selectedCell;
      const cell = prev.board[row][col];
      if (cell.isGiven) return prev;
      if (cell.value === 0 && cell.notes.size === 0) return prev;

      const newBoard = deepCloneBoard(prev.board);
      const historyEntry: HistoryEntry = {
        row,
        col,
        prevValue: cell.value,
        prevNotes: new Set(cell.notes),
        prevIsError: cell.isError,
        type: 'erase',
      };

      newBoard[row][col].value = 0;
      newBoard[row][col].notes.clear();
      newBoard[row][col].isError = false;

      return {
        ...prev,
        board: newBoard,
        history: [...prev.history, historyEntry],
      };
    });
  }, []);

  const undo = useCallback(() => {
    setState(prev => {
      if (prev.history.length === 0 || prev.isGameOver || prev.isGameWon || prev.isPaused) return prev;
      const newHistory = [...prev.history];
      const entry = newHistory.pop()!;
      const newBoard = deepCloneBoard(prev.board);

      newBoard[entry.row][entry.col].value = entry.prevValue;
      newBoard[entry.row][entry.col].notes = new Set(entry.prevNotes);
      newBoard[entry.row][entry.col].isError = entry.prevIsError;

      // If we're undoing a mistake, decrement mistakes
      let newMistakes = prev.mistakes;
      if (entry.type === 'value' && prev.board[entry.row][entry.col].isError && !entry.prevIsError) {
        newMistakes = Math.max(0, newMistakes - 1);
      }

      return {
        ...prev,
        board: newBoard,
        history: newHistory,
        mistakes: newMistakes,
        selectedCell: { row: entry.row, col: entry.col },
      };
    });
  }, []);

  const toggleNotes = useCallback(() => {
    setState(prev => {
      if (prev.isGameOver || prev.isGameWon) return prev;
      return { ...prev, isNotesMode: !prev.isNotesMode };
    });
  }, []);

  const useHint = useCallback(() => {
    setState(prev => {
      if (!prev.selectedCell || prev.hintsRemaining <= 0 || prev.isGameOver || prev.isGameWon || prev.isPaused) return prev;
      const { row, col } = prev.selectedCell;
      const cell = prev.board[row][col];
      if (cell.isGiven) return prev;
      if (cell.value === cell.solution) return prev; // Already correct

      const newBoard = deepCloneBoard(prev.board);
      const historyEntry: HistoryEntry = {
        row,
        col,
        prevValue: cell.value,
        prevNotes: new Set(cell.notes),
        prevIsError: cell.isError,
        type: 'hint',
      };

      newBoard[row][col].value = cell.solution;
      newBoard[row][col].notes.clear();
      newBoard[row][col].isError = false;
      newBoard[row][col].isGiven = true; // Hints become "given"

      // Remove from notes in same row/col/box
      const num = cell.solution;
      if (!settings || settings.autoClearNotes) {
        for (let i = 0; i < 9; i++) {
          newBoard[row][i].notes.delete(num);
          newBoard[i][col].notes.delete(num);
        }
        const boxRow = Math.floor(row / 3) * 3;
        const boxCol = Math.floor(col / 3) * 3;
        for (let r = boxRow; r < boxRow + 3; r++) {
          for (let c = boxCol; c < boxCol + 3; c++) {
            newBoard[r][c].notes.delete(num);
          }
        }
      }

      const isGameWon = isBoardComplete(newBoard);

      return {
        ...prev,
        board: newBoard,
        hintsRemaining: prev.hintsRemaining - 1,
        isGameWon,
        history: [...prev.history, historyEntry],
      };
    });
  }, [settings]);

  const togglePause = useCallback(() => {
    setState(prev => {
      if (prev.isGameOver || prev.isGameWon) return prev;
      return { ...prev, isPaused: !prev.isPaused };
    });
  }, []);

  const newGame = useCallback((difficulty: Difficulty) => {
    setState(createInitialState(difficulty));
  }, []);

  // Keyboard handler
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    setState(prev => {
      if (prev.isGameOver || prev.isGameWon || prev.isPaused) return prev;
      if (!prev.selectedCell) return prev;
      const { row, col } = prev.selectedCell;

      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          return { ...prev, selectedCell: { row: Math.max(0, row - 1), col } };
        case 'ArrowDown':
          e.preventDefault();
          return { ...prev, selectedCell: { row: Math.min(8, row + 1), col } };
        case 'ArrowLeft':
          e.preventDefault();
          return { ...prev, selectedCell: { row, col: Math.max(0, col - 1) } };
        case 'ArrowRight':
          e.preventDefault();
          return { ...prev, selectedCell: { row, col: Math.min(8, col + 1) } };
        case 'Delete':
        case 'Backspace':
          e.preventDefault();
          // Handled by erase action
          return prev;
        default:
          return prev;
      }
    });

    // Handle number keys outside setState to use placeNumber
    const num = parseInt(e.key);
    if (num >= 1 && num <= 9) {
      e.preventDefault();
      placeNumber(num);
    }
    if (e.key === 'Delete' || e.key === 'Backspace') {
      erase();
    }
  }, [placeNumber, erase]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Helper: get counts of each number placed (for dimming completed numbers)
  const getNumberCounts = useCallback((): Map<number, number> => {
    const counts = new Map<number, number>();
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        const v = state.board[r][c].value;
        if (v !== 0) {
          counts.set(v, (counts.get(v) || 0) + 1);
        }
      }
    }
    return counts;
  }, [state.board]);

  return {
    state,
    selectCell,
    placeNumber,
    erase,
    undo,
    toggleNotes,
    useHint,
    togglePause,
    newGame,
    getNumberCounts,
  };
}
