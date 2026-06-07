// Server-side Sudoku puzzle generator
// Adapted from client engine for Node.js usage

export type Difficulty = 'easy' | 'medium' | 'hard' | 'expert' | 'master' | 'extreme';

// Bitmask helpers
const ALL_BITS = 0x1ff;

function bitCount(n: number): number {
  n = n - ((n >> 1) & 0x55555555);
  n = (n & 0x33333333) + ((n >> 2) & 0x33333333);
  return (((n + (n >> 4)) & 0x0f0f0f0f) * 0x01010101) >> 24;
}

function lowestBit(n: number): number {
  return n & (-n);
}

function bitToVal(bit: number): number {
  let v = 0;
  while (bit > 1) { bit >>= 1; v++; }
  return v + 1;
}

function valToBit(v: number): number {
  return 1 << (v - 1);
}

// Pre-compute peer tables
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

const UNITS: number[][][] = [];
for (let i = 0; i < 81; i++) {
  UNITS.push([ROW_PEERS[i].concat(i), COL_PEERS[i].concat(i), BOX_PEERS[i].concat(i)]);
}

function eliminate(possible: Int16Array, i: number, val: number): boolean {
  const bit = valToBit(val);
  if (!(possible[i] & bit)) return true;
  possible[i] &= ~bit;
  const remaining = possible[i];
  if (remaining === 0) return false;

  if (bitCount(remaining) === 1) {
    const v = bitToVal(remaining);
    for (const peer of PEERS[i]) {
      if (!eliminate(possible, peer, v)) return false;
    }
  }

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
      if (bitCount(possible[lastPlace]) > 1) {
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

function solveCount(possible: Int16Array, limit: number): number {
  let minBits = 10;
  let minIdx = -1;
  for (let i = 0; i < 81; i++) {
    const bc = bitCount(possible[i]);
    if (bc === 0) return 0;
    if (bc > 1 && bc < minBits) {
      minBits = bc;
      minIdx = i;
    }
  }
  if (minIdx === -1) return 1;

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

function gridToPossible(grid: number[]): Int16Array | null {
  const possible = new Int16Array(81).fill(ALL_BITS);
  for (let i = 0; i < 81; i++) {
    if (grid[i] !== 0) {
      if (!assign(possible, i, grid[i])) return null;
    }
  }
  return possible;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

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

function getClueCount(difficulty: Difficulty): number {
  switch (difficulty) {
    case 'easy': return 36 + Math.floor(Math.random() * 6);
    case 'medium': return 30 + Math.floor(Math.random() * 4);
    case 'hard': return 26 + Math.floor(Math.random() * 4);
    case 'expert': return 23 + Math.floor(Math.random() * 3);
    case 'master': return 21 + Math.floor(Math.random() * 2);
    case 'extreme': return 17 + Math.floor(Math.random() * 4);
  }
}

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

    const possible = gridToPossible(puzzle1D);
    if (!possible || solveCount(possible, 2) !== 1) {
      puzzle1D[pos] = backup;
    } else {
      cellsToRemove--;
    }
  }

  const puzzle: number[][] = [];
  const solution: number[][] = [];
  for (let r = 0; r < 9; r++) {
    puzzle.push(puzzle1D.slice(r * 9, r * 9 + 9));
    solution.push(solution1D.slice(r * 9, r * 9 + 9));
  }

  return { puzzle, solution };
}
