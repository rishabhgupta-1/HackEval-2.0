
import Database from "better-sqlite3";

const db = new Database("hackathon.db");

// Check and Seed Round 2 Evaluations (Restoring missing data)
const r2Id = db.prepare("SELECT id FROM rounds WHERE sequence = 2").get() as { id: number };
console.log("Round 2 ID:", r2Id);

const r2EvalCount = db.prepare("SELECT COUNT(*) as count FROM evaluations WHERE round_id = ?").get(r2Id.id) as { count: number };
console.log("Round 2 Eval Count:", r2EvalCount);

if (r2EvalCount.count === 0) {
  console.log("Seeding Round 2 evaluations...");
  
  const insertEval = db.prepare(`
    INSERT INTO evaluations (team_id, round_id, evaluator_id, problem_statement_id, scores, feedback, total_score)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const rishabh = db.prepare("SELECT id FROM evaluators WHERE name = ?").get("Rishabh") as { id: number };
  const srijan = db.prepare("SELECT id FROM evaluators WHERE name = ?").get("Srijan") as { id: number };
  
  console.log("Rishabh ID:", rishabh);
  console.log("Srijan ID:", srijan);

  const r2Params = db.prepare("SELECT id FROM parameters WHERE round_id = ? ORDER BY id").all(r2Id.id) as { id: number }[];
  console.log("R2 Params:", r2Params);
  
  // Rishabh's R2 Evaluations
  const rishabhR2Data = [
    { team: "Code101", scores: [8, 4, 7, 3], total: 22 },
    { team: "4chan", scores: [8, 4, 8, 4], total: 24 },
    { team: "Tech Vengers", scores: [9, 5, 9, 5], total: 28 },
    { team: "D3CODE", scores: [9, 4, 9, 5], total: 27 },
    { team: "Hackoholics", scores: [4, 2, 4, 2], total: 12 },
    { team: "Code Catalyst", scores: [5, 2, 5, 2], total: 14 },
    { team: "Phoenix", scores: [3, 1, 3, 1], total: 8 },
    { team: "CodeQuad", scores: [4, 2, 3, 1], total: 10 },
    { team: "TokenX", scores: [8, 4, 7, 4], total: 23 },
    { team: "Alpha developer", scores: [2, 1, 1, 1], total: 5 },
    { team: "Team Invictus", scores: [5, 2, 4, 2], total: 13 }
  ];

  rishabhR2Data.forEach(data => {
    const team = db.prepare("SELECT id, problem_statement_id FROM teams WHERE name = ?").get(data.team) as { id: number, problem_statement_id: number };
    if (team) {
      const scoreMap: Record<number, number> = {};
      data.scores.forEach((s, idx) => {
        if (r2Params[idx]) {
             scoreMap[r2Params[idx].id] = s;
        }
      });
      insertEval.run(team.id, r2Id.id, rishabh.id, team.problem_statement_id, JSON.stringify(scoreMap), "Round 2 Evaluation", data.total);
      console.log(`Inserted eval for ${data.team} (Rishabh)`);
    } else {
        console.log(`Team not found: ${data.team}`);
    }
  });

  // Srijan's R2 Evaluations
  const srijanR2Data = [
    { team: "DeCoders", scores: [3, 1, 3, 2], total: 9 },
    { team: "Code Fusion", scores: [5, 3, 5, 2], total: 15 },
    { team: "4 CLOVER", scores: [4, 2, 3, 2], total: 11 },
    { team: "Avengers", scores: [5, 2, 5, 2], total: 14 },
    { team: "TEAM SHOURYANGA", scores: [2, 1, 2, 1], total: 6 },
    { team: "TriNova Coders", scores: [5, 2, 4, 2], total: 13 },
    { team: "Team Titans", scores: [6, 3, 6, 3], total: 18 },
    { team: "Central C", scores: [9, 4, 9, 4], total: 26 },
    { team: "Code Wave", scores: [8, 4, 8, 4], total: 24 },
    { team: "Binary Architects", scores: [3, 1, 3, 1], total: 8 },
    { team: "Mind Spark", scores: [3, 1, 2, 1], total: 7 }
  ];

  srijanR2Data.forEach(data => {
    const team = db.prepare("SELECT id, problem_statement_id FROM teams WHERE name = ?").get(data.team) as { id: number, problem_statement_id: number };
    if (team) {
      const scoreMap: Record<number, number> = {};
      data.scores.forEach((s, idx) => {
        if (r2Params[idx]) {
            scoreMap[r2Params[idx].id] = s;
        }
      });
      insertEval.run(team.id, r2Id.id, srijan.id, team.problem_statement_id, JSON.stringify(scoreMap), "Round 2 Evaluation", data.total);
      console.log(`Inserted eval for ${data.team} (Srijan)`);
    } else {
        console.log(`Team not found: ${data.team}`);
    }
  });
}
