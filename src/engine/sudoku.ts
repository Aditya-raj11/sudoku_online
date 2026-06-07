import type { Difficulty, Board, CellData } from './types';


// ============================================================
// Fast Sudoku Solver using constraint propagation + backtracking
// ============================================================

// Bitmask helpers: represent possible values as bits (bit 0 = value 1, etc.)
const ALL_BITS = 0x1ff; // bits 0-8 set = values 1-9

function bitCount(n: number): number {
  n = n - ((n >> 1) & 0x55555555);
  n = (n & 0x33333333) + ((n >> 2) & 0x33333333);
  return (((n + (n >> 4)) & 0x0f0f0f0f) * 0x01010101) >> 24;
}

function lowestBit(n: number): number {
  return n & (-n);
}

function bitToVal(bit: number): number {
  // Convert a single set bit to value 1-9
  let v = 0;
  while (bit > 1) { bit >>= 1; v++; }
  return v + 1;
}

function valToBit(v: number): number {
  return 1 << (v - 1);
}

// Peers: for each cell, list of indices that share row/col/box
const PEERS: number[][] = [];
const ROW_PEERS: number[][] = [];
const COL_PEERS: number[][] = [];
const BOX_PEERS: number[][] = [];

for (let i = 0; i < 81; i++) {
  const r = Math.floor(i / 9);
  const c = i % 9;
  const boxR = Math.floor(r / 3) * 3;
  const boxC = Math.floor(c / 3) * 3;
  const peers = new Set<number>();
  const rowP: number[] = [];
  const colP: number[] = [];
  const boxP: number[] = [];

  for (let j = 0; j < 9; j++) {
    if (j !== c) { const idx = r * 9 + j; peers.add(idx); rowP.push(idx); }
    if (j !== r) { const idx = j * 9 + c; peers.add(idx); colP.push(idx); }
  }
  for (let dr = 0; dr < 3; dr++) {
    for (let dc = 0; dc < 3; dc++) {
      const idx = (boxR + dr) * 9 + (boxC + dc);
      if (idx !== i) { peers.add(idx); boxP.push(idx); }
    }
  }
  PEERS.push([...peers]);
  ROW_PEERS.push(rowP);
  COL_PEERS.push(colP);
  BOX_PEERS.push(boxP);
}

// Units: each cell belongs to 3 units (row, col, box)
const UNITS: number[][][] = [];
for (let i = 0; i < 81; i++) {
  UNITS.push([ROW_PEERS[i].concat(i), COL_PEERS[i].concat(i), BOX_PEERS[i].concat(i)]);
}

// Propagate constraint: eliminate val from cell i's possibilities
function eliminate(possible: Int16Array, i: number, val: number): boolean {
  const bit = valToBit(val);
  if (!(possible[i] & bit)) return true; // already eliminated
  possible[i] &= ~bit;
  const remaining = possible[i];
  if (remaining === 0) return false; // contradiction

  // If only one value left, eliminate from all peers
  if (bitCount(remaining) === 1) {
    const v = bitToVal(remaining);
    for (const peer of PEERS[i]) {
      if (!eliminate(possible, peer, v)) return false;
    }
  }

  // Check each unit: if val can only go in one place, assign it
  for (const unit of UNITS[i]) {
    let places = 0;
    let lastPlace = -1;
    for (const idx of unit) {
      if (possible[idx] & bit) {
        places++;
        lastPlace = idx;
        if (places > 1) break;
      }
    }
    if (places === 0) return false;
    if (places === 1) {
      // val must go in lastPlace
      if (bitCount(possible[lastPlace]) > 1) {
        // Assign: eliminate all other values
        const others = possible[lastPlace] & ~bit;
        let o = others;
        while (o) {
          const ob = lowestBit(o);
          if (!eliminate(possible, lastPlace, bitToVal(ob))) return false;
          o &= ~ob;
        }
      }
    }
  }

  return true;
}

function assign(possible: Int16Array, i: number, val: number): boolean {
  const others = possible[i] & ~valToBit(val);
  let o = others;
  while (o) {
    const bit = lowestBit(o);
    if (!eliminate(possible, i, bitToVal(bit))) return false;
    o &= ~bit;
  }
  return true;
}

// Solve using constraint propagation + backtracking
// Returns number of solutions found (stops at limit)
function solveCount(possible: Int16Array, limit: number): number {
  // Find unresolved cell with fewest possibilities (MRV heuristic)
  let minBits = 10;
  let minIdx = -1;
  for (let i = 0; i < 81; i++) {
    const bc = bitCount(possible[i]);
    if (bc === 0) return 0; // contradiction
    if (bc > 1 && bc < minBits) {
      minBits = bc;
      minIdx = i;
    }
  }
  if (minIdx === -1) return 1; // all cells resolved

  let count = 0;
  let bits = possible[minIdx];
  while (bits) {
    const bit = lowestBit(bits);
    const val = bitToVal(bit);
    const copy = new Int16Array(possible);
    if (assign(copy, minIdx, val)) {
      count += solveCount(copy, limit - count);
      if (count >= limit) return count;
    }
    bits &= ~bit;
  }
  return count;
}

// Create initial possible array from a grid
function gridToPossible(grid: number[]): Int16Array | null {
  const possible = new Int16Array(81).fill(ALL_BITS);
  for (let i = 0; i < 81; i++) {
    if (grid[i] !== 0) {
      if (!assign(possible, i, grid[i])) return null;
    }
  }
  return possible;
}


// Shuffle array
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Check if placing num at position is valid (simple check for generation)
function isValid(grid: number[], pos: number, num: number): boolean {
  const r = Math.floor(pos / 9);
  const c = pos % 9;
  for (let j = 0; j < 9; j++) {
    if (grid[r * 9 + j] === num) return false;
    if (grid[j * 9 + c] === num) return false;
  }
  const boxR = Math.floor(r / 3) * 3;
  const boxC = Math.floor(c / 3) * 3;
  for (let dr = 0; dr < 3; dr++) {
    for (let dc = 0; dc < 3; dc++) {
      if (grid[(boxR + dr) * 9 + (boxC + dc)] === num) return false;
    }
  }
  return true;
}

// Generate a complete valid grid
function generateFullGrid(): number[] {
  const grid = new Array(81).fill(0);

  function fill(pos: number): boolean {
    if (pos === 81) return true;
    const nums = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    for (const num of nums) {
      if (isValid(grid, pos, num)) {
        grid[pos] = num;
        if (fill(pos + 1)) return true;
        grid[pos] = 0;
      }
    }
    return false;
  }

  fill(0);
  return grid;
}

// Get clue count per difficulty
function getClueCount(difficulty: Difficulty): number {
  switch (difficulty) {
    case 'easy': return 36 + Math.floor(Math.random() * 6); // 36-41
    case 'medium': return 30 + Math.floor(Math.random() * 4); // 30-33
    case 'hard': return 26 + Math.floor(Math.random() * 4); // 26-29
    case 'expert': return 23 + Math.floor(Math.random() * 3); // 23-25
    case 'master': return 21 + Math.floor(Math.random() * 2); // 21-22
    case 'extreme': return 17 + Math.floor(Math.random() * 4); // 17-20
  }
}

// Generate a puzzle with unique solution
export function generatePuzzle(difficulty: Difficulty): { puzzle: number[][]; solution: number[][] } {
  const fullGrid = generateFullGrid();
  const solution1D = [...fullGrid];
  const puzzle1D = [...fullGrid];
  const targetClues = getClueCount(difficulty);
  let cellsToRemove = 81 - targetClues;

  const positions = shuffle(Array.from({ length: 81 }, (_, i) => i));

  for (const pos of positions) {
    if (cellsToRemove <= 0) break;
    const backup = puzzle1D[pos];
    puzzle1D[pos] = 0;

    // Check unique solution using fast solver
    const possible = gridToPossible(puzzle1D);
    if (!possible || solveCount(possible, 2) !== 1) {
      puzzle1D[pos] = backup; // restore if not unique
    } else {
      cellsToRemove--;
    }
  }

  // Convert 1D to 2D
  const puzzle: number[][] = [];
  const solution: number[][] = [];
  for (let r = 0; r < 9; r++) {
    puzzle.push(puzzle1D.slice(r * 9, r * 9 + 9));
    solution.push(solution1D.slice(r * 9, r * 9 + 9));
  }

  return { puzzle, solution };
}

// Convert raw grid to game Board
export function createBoard(puzzle: number[][], solution: number[][]): Board {
  return puzzle.map((row, r) =>
    row.map((val, c) => ({
      value: val,
      solution: solution[r][c],
      isGiven: val !== 0,
      notes: new Set<number>(),
      isError: false,
    } as CellData))
  );
}

// Check if the board is completely and correctly filled
export function isBoardComplete(board: Board): boolean {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (board[r][c].value !== board[r][c].solution) return false;
    }
  }
  return true;
}

// Check if a value matches the solution
export function isCorrectValue(board: Board, row: number, col: number, value: number): boolean {
  return board[row][col].solution === value;
}
