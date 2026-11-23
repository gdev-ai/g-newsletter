// Generates the Sudoku for an edition's G Challenge and prints the SQL that installs it.
//
//   node scripts/new-sudoku.mjs q1-2027 medium "Closes 31 January 2027"
//
// Paste the output into Supabase -> SQL Editor (after supabase/engagement.sql has been run once).
// The solution only ever lives in the database: the site receives the puzzle when a player starts,
// and the server checks the finished grid, so nobody can read the answer from the page.
import sudokuGen from 'sudoku-gen'

const { getSudoku } = sudokuGen
const [edition = 'q1-2027', difficulty = 'medium', closesNote = ''] = process.argv.slice(2)
if (!['easy', 'medium', 'hard', 'expert'].includes(difficulty)) {
  console.error('difficulty must be easy, medium, hard or expert')
  process.exit(1)
}

// Counts solutions (stopping at 2), so we only ship puzzles with exactly one answer.
function countSolutions(grid, limit = 2) {
  const g = grid.split('').map((c) => (c === '-' ? 0 : Number(c)))
  let found = 0
  const ok = (i, v) => {
    const r = Math.floor(i / 9), c = i % 9, br = r - (r % 3), bc = c - (c % 3)
    for (let k = 0; k < 9; k++) {
      if (g[r * 9 + k] === v || g[k * 9 + c] === v) return false
      if (g[(br + Math.floor(k / 3)) * 9 + bc + (k % 3)] === v) return false
    }
    return true
  }
  const solve = () => {
    const i = g.indexOf(0)
    if (i < 0) { found++; return }
    for (let v = 1; v <= 9 && found < limit; v++) if (ok(i, v)) { g[i] = v; solve(); g[i] = 0 }
  }
  solve()
  return found
}

let s
for (let tries = 0; tries < 20; tries++) {
  s = getSudoku(difficulty)
  if (countSolutions(s.puzzle) === 1) break
  s = null
}
if (!s) { console.error('Could not generate a puzzle with a unique solution.'); process.exit(1) }

const puzzle = s.puzzle.replace(/-/g, '0')
const q = (v) => `'${String(v).replace(/'/g, "''")}'`
console.log(`-- ${edition}: ${difficulty} Sudoku, ${puzzle.replace(/0/g, '').length} givens`)
console.log(`insert into challenges (edition, kind, puzzle, solution, note)
values (${q(edition)}, 'sudoku', ${q(puzzle)}, ${q(s.solution)}, ${q(closesNote)})
on conflict (edition) do update set puzzle = excluded.puzzle, solution = excluded.solution, note = excluded.note;`)
