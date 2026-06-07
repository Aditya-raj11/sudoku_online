export type Difficulty = 'easy' | 'medium' | 'hard' | 'expert' | 'master' | 'extreme';

export interface CellData {
  value: number; // 0 = empty
  solution: number;
  isGiven: boolean;
  notes: Set<number>;
  isError: boolean;
}

export type Board = CellData[][];

export interface HistoryEntry {
  row: number;
  col: number;
  prevValue: number;
  prevNotes: Set<number>;
  prevIsError: boolean;
  type: 'value' | 'note' | 'erase' | 'hint';
}

export interface GameState {
  board: Board;
  selectedCell: { row: number; col: number } | null;
  difficulty: Difficulty;
  mistakes: number;
  maxMistakes: number;
  hintsRemaining: number;
  isNotesMode: boolean;
  isPaused: boolean;
  isGameOver: boolean;
  isGameWon: boolean;
  timer: number; // seconds
  score: number;
  history: HistoryEntry[];
}

export interface SudokuSettings {
  mistakesLimit: boolean;
  autoClearNotes: boolean;
  highlightAreas: boolean;
  highlightIdentical: boolean;
  highlightMistakes: boolean;
  timerEnabled: boolean;
  darkTheme: boolean;
}

