import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("hackathon.db");
db.pragma('journal_mode = WAL');

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS evaluators (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    role TEXT NOT NULL, -- 'admin' or 'judge'
    evaluator_id INTEGER, -- Linked evaluator if judge
    FOREIGN KEY (evaluator_id) REFERENCES evaluators(id)
  );

  CREATE TABLE IF NOT EXISTS teams (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    problem_statement_id INTEGER,
    FOREIGN KEY (problem_statement_id) REFERENCES problem_statements(id)
  );

  CREATE TABLE IF NOT EXISTS problem_statements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    theme TEXT,
    description TEXT
  );

  CREATE TABLE IF NOT EXISTS rounds (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    sequence INTEGER NOT NULL,
    is_active INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS parameters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    round_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    max_score INTEGER DEFAULT 10,
    FOREIGN KEY (round_id) REFERENCES rounds(id)
  );

  CREATE TABLE IF NOT EXISTS evaluations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    team_id INTEGER NOT NULL,
    round_id INTEGER NOT NULL,
    evaluator_id INTEGER NOT NULL,
    problem_statement_id INTEGER,
    scores TEXT NOT NULL, -- JSON string of {parameter_id: score}
    feedback TEXT,
    total_score REAL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (team_id) REFERENCES teams(id),
    FOREIGN KEY (round_id) REFERENCES rounds(id),
    FOREIGN KEY (evaluator_id) REFERENCES evaluators(id),
    FOREIGN KEY (problem_statement_id) REFERENCES problem_statements(id)
  );
`);

// Seed initial data if empty
const teamCount = db.prepare("SELECT COUNT(*) as count FROM teams").get() as { count: number };
if (teamCount.count === 0) {
  // Evaluators
  const evaluators = ["Rishabh", "Srijan", "Ramana"];
  evaluators.forEach(name => db.prepare("INSERT INTO evaluators (name) VALUES (?)").run(name));

  // Teams
  const teamNames = [
    "Codestorm", "MARS", "Codecription", "Rebels", "Winners", 
    "Team Triverse", "CodeRed", "BitByBit", "Code101", "4chan", 
    "Tech Vengers", "D3CODE", "Hackoholics", "Code Catalyst", "Phoenix", 
    "CodeQuad", "TokenX", "Alpha developer", "Team Invictus", "DeCoders", 
    "Code Fusion", "4 CLOVER", "Avengers", "TEAM SHOURYANGA", "TriNova Coders", 
    "Team Titans", "Central C", "Code Wave", "Binary Architects", "Mind Spark"
  ];
  teamNames.forEach(name => db.prepare("INSERT INTO teams (name) VALUES (?)").run(name));
  
  // Problem Statements
  const pss = [
    { title: "PartySync", theme: "Productivity & Time-Saving Tools" },
    { title: "AcademiFlow", theme: "Productivity & Time-Saving Tools" },
    { title: "FlowSync", theme: "Smart Infrastructure & Urban Development" },
    { title: "AquaGuard", theme: "Smart Infrastructure & Urban Development" },
    { title: "Sound-Wave", theme: "Financial Inclusion" },
    { title: "FinTok Truth Detector", theme: "Financial Inclusion" },
    { title: "AlumniGraph", theme: "Future of Works and Careers" },
    { title: "The Skill Translator", theme: "Future of Works and Careers" },
    { title: "DrishtiNav", theme: "Health & Well-Being Technology" },
    { title: "Geo-Infect", theme: "Health & Well-Being Technology" },
    { title: "Svayam-Adhyayi", theme: "Learning & Skill Development" },
    { title: "GuardianLink", theme: "Learning & Skill Development" },
    { title: "DhartiSeva", theme: "Rural & Grassroots Innovation" },
    { title: "The Pocket Agronomist", theme: "Rural & Grassroots Innovation" },
    { title: "CarbonSync", theme: "Sustainable & Green Solutions" },
    { title: "Poseidon’s Pulse", theme: "Sustainable & Green Solutions" },
    { title: "PumpWatch", theme: "Safety, Trust & Responsible Technology" },
    { title: "Deepfake Defender", theme: "Safety, Trust & Responsible Technology" }
  ];
  pss.forEach(ps => db.prepare("INSERT INTO problem_statements (title, theme) VALUES (?, ?)").run(ps.title, ps.theme));

  // Rounds
  const r1 = db.prepare("INSERT INTO rounds (name, sequence) VALUES (?, ?)").run("Round 1: Ideation", 1).lastInsertRowid;
  const r2 = db.prepare("INSERT INTO rounds (name, sequence) VALUES (?, ?)").run("Round 2: Implementation", 2).lastInsertRowid;
  const r3 = db.prepare("INSERT INTO rounds (name, sequence) VALUES (?, ?)").run("Round 3: Final Pitch", 3).lastInsertRowid;

  // Parameters
  // Round 1
  db.prepare("INSERT INTO parameters (round_id, name, max_score) VALUES (?, ?, ?)").run(r1, "Problem Understanding & Requirement Clarity", 10);
  db.prepare("INSERT INTO parameters (round_id, name, max_score) VALUES (?, ?, ?)").run(r1, "Feasibility & Scope", 5);
  db.prepare("INSERT INTO parameters (round_id, name, max_score) VALUES (?, ?, ?)").run(r1, "Implementation Roadmap", 10);
  db.prepare("INSERT INTO parameters (round_id, name, max_score) VALUES (?, ?, ?)").run(r1, "Technical Approach", 5);

  // Round 2
  db.prepare("INSERT INTO parameters (round_id, name, max_score) VALUES (?, ?, ?)").run(r2, "Core Functionalities Implemented", 10);
  db.prepare("INSERT INTO parameters (round_id, name, max_score) VALUES (?, ?, ?)").run(r2, "Scalability & System Design", 5);
  db.prepare("INSERT INTO parameters (round_id, name, max_score) VALUES (?, ?, ?)").run(r2, "UI/UX & Usability", 10);
  db.prepare("INSERT INTO parameters (round_id, name, max_score) VALUES (?, ?, ?)").run(r2, "USP / Innovation", 5);

  // Round 3
  db.prepare("INSERT INTO parameters (round_id, name, max_score) VALUES (?, ?, ?)").run(r3, "Problem–Solution Fit", 10);
  db.prepare("INSERT INTO parameters (round_id, name, max_score) VALUES (?, ?, ?)").run(r3, "Demonstration Quality", 10);
  db.prepare("INSERT INTO parameters (round_id, name, max_score) VALUES (?, ?, ?)").run(r3, "Team Collaboration", 5);
  db.prepare("INSERT INTO parameters (round_id, name, max_score) VALUES (?, ?, ?)").run(r3, "Overall Impact & Viability", 15);
  // Users
  const userCount = db.prepare("SELECT COUNT(*) as count FROM users").get() as { count: number };
  if (userCount.count === 0) {
    // Admin
    db.prepare("INSERT INTO users (username, password, role) VALUES (?, ?, ?)").run("admin", "admin123", "admin");
    
    // Judges
    const evs = db.prepare("SELECT * FROM evaluators").all() as { id: number, name: string }[];
    evs.forEach(ev => {
      // Simple password generation: lowercase name + "123"
      const password = ev.name.toLowerCase() + "123";
      db.prepare("INSERT INTO users (username, password, role, evaluator_id) VALUES (?, ?, ?, ?)").run(ev.name, password, "judge", ev.id);
    });
  }

  // Update specific teams with PS assignments
  const assignments: Record<string, string[]> = {
    "GuardianLink": ['Codestorm', '4chan', 'Hackoholics', 'Code Catalyst', 'TriNova Coders', 'Central C', 'Code Wave'],
    "AcademiFlow": ['Winners', 'CodeQuad', 'Team Invictus', 'DeCoders', '4 CLOVER', 'Team Titans'],
    "Sound-Wave": ['Team Triverse', 'D3CODE', 'Mind Spark'],
    "FinTok Truth Detector": ['TEAM SHOURYANGA', 'Binary Architects'],
    "The Pocket Agronomist": ['Phoenix', 'Code Fusion'],
    "PumpWatch": ['Codecription', 'CodeRed'],
    "AlumniGraph": ['Tech Vengers'],
    "CarbonSync": ['BitByBit'],
    "Deepfake Defender": ['Code101'],
    "FlowSync": ['Avengers'],
    "Geo-Infect": ['Rebels'],
    "PartySync": ['TokenX'],
    "Svayam-Adhyayi": ['Alpha developer'],
    "The Skill Translator": ['MARS']
  };

  const getPsId = db.prepare("SELECT id FROM problem_statements WHERE title = ?");
  const updateTeamPs = db.prepare("UPDATE teams SET problem_statement_id = ? WHERE name = ?");

  Object.entries(assignments).forEach(([psTitle, teamNames]) => {
    const ps = getPsId.get(psTitle) as { id: number } | undefined;
    if (ps) {
      teamNames.forEach(teamName => {
        updateTeamPs.run(ps.id, teamName);
      });
    }
  });

  // Round 1 Evaluations by Rishabh
  const rishabh = db.prepare("SELECT id FROM evaluators WHERE name = ?").get("Rishabh") as { id: number };
  const r1Id = db.prepare("SELECT id FROM rounds WHERE sequence = 1").get() as { id: number };
  const r1Params = db.prepare("SELECT id FROM parameters WHERE round_id = ? ORDER BY id").all(r1Id.id) as { id: number }[];

  const r1Data = [
    { team: "Codestorm", scores: [8, 4, 8, 4], total: 24 },
    { team: "MARS", scores: [6, 3, 4, 1], total: 14 },
    { team: "Codecription", scores: [2, 1, 1, 1], total: 5 },
    { team: "Rebels", scores: [9, 5, 9, 5], total: 28 },
    { team: "Winners", scores: [10, 3, 6, 4], total: 23 },
    { team: "Team Triverse", scores: [10, 4, 9, 4], total: 27 },
    { team: "CodeRed", scores: [9, 4, 8, 4], total: 25 },
    { team: "BitByBit", scores: [6, 4, 4, 2], total: 16 },
    { team: "Code101", scores: [7, 2, 2, 2], total: 13 },
    { team: "4chan", scores: [7, 3, 6, 2], total: 18 },
    { team: "Tech Vengers", scores: [9, 5, 9, 4], total: 27 },
    { team: "D3CODE", scores: [9, 4, 9, 5], total: 27 },
    { team: "Hackoholics", scores: [5, 2, 4, 0], total: 11 },
    { team: "Code Catalyst", scores: [5, 4, 3, 1], total: 13 },
    { team: "Phoenix", scores: [3, 2, 2, 1], total: 8 },
    { team: "CodeQuad", scores: [4, 2, 3, 2], total: 11 },
    { team: "TokenX", scores: [8, 4, 5, 3], total: 20 },
    { team: "Alpha developer", scores: [3, 0, 0, 0], total: 3 },
    { team: "Team Invictus", scores: [4, 2, 4, 3], total: 13 },
    { team: "DeCoders", scores: [3, 1, 2, 1], total: 7 },
    { team: "Code Fusion", scores: [7, 2, 3, 2], total: 14 },
    { team: "4 CLOVER", scores: [5, 2, 3, 1], total: 11 },
    { team: "Avengers", scores: [5, 2, 3, 2], total: 12 },
    { team: "TEAM SHOURYANGA", scores: [2, 1, 1, 0], total: 4 },
    { team: "TriNova Coders", scores: [5, 2, 3, 1], total: 11 },
    { team: "Team Titans", scores: [6, 4, 5, 2], total: 17 },
    { team: "Central C", scores: [9, 4, 6, 3], total: 22 },
    { team: "Code Wave", scores: [8, 4, 5, 2], total: 19 },
    { team: "Binary Architects", scores: [4, 2, 1, 0], total: 7 },
    { team: "Mind Spark", scores: [4, 0, 1, 1], total: 6 },
  ];

  const insertEval = db.prepare(`
    INSERT INTO evaluations (team_id, round_id, evaluator_id, problem_statement_id, scores, feedback, total_score)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  r1Data.forEach(data => {
    const team = db.prepare("SELECT id, problem_statement_id FROM teams WHERE name = ?").get(data.team) as { id: number, problem_statement_id: number };
    if (team) {
      const scoreMap: Record<number, number> = {};
      data.scores.forEach((s, idx) => {
        scoreMap[r1Params[idx].id] = s;
      });
      insertEval.run(team.id, r1Id.id, rishabh.id, team.problem_statement_id, JSON.stringify(scoreMap), "Initial round evaluation", data.total);
    }
  });

  // Round 2 Evaluations by Rishabh
  const r2Id = db.prepare("SELECT id FROM rounds WHERE sequence = 2").get() as { id: number };
  const r2Params = db.prepare("SELECT id FROM parameters WHERE round_id = ? ORDER BY id").all(r2Id.id) as { id: number }[];

  const r2DataRishabh = [
    { team: "Team Invictus", scores: [10, 4, 9, 1], total: 24 },
    { team: "Tech Vengers", scores: [8, 4, 7, 5], total: 24 },
    { team: "Team Triverse", scores: [6, 3, 7, 2], total: 18 },
    { team: "Mind Spark", scores: [7, 2, 7, 2], total: 18 },
    { team: "Team Titans", scores: [8, 2, 7, 1], total: 18 },
    { team: "Code101", scores: [7, 2, 6, 2], total: 17 },
    { team: "D3CODE", scores: [7, 3, 2, 2], total: 14 },
    { team: "Central C", scores: [7, 1, 4, 2], total: 14 },
    { team: "CodeQuad", scores: [6, 1, 4, 1], total: 12 },
    { team: "Code Catalyst", scores: [4, 1, 4, 1], total: 10 },
    { team: "TriNova Coders", scores: [5, 1, 2, 2], total: 10 },
    { team: "Alpha developer", scores: [3, 1, 4, 1], total: 9 },
    { team: "4chan", scores: [2, 1, 2, 1], total: 6 },
    { team: "Code Wave", scores: [1, 1, 1, 1], total: 4 }
  ];

  r2DataRishabh.forEach(data => {
    const team = db.prepare("SELECT id, problem_statement_id FROM teams WHERE name = ?").get(data.team) as { id: number, problem_statement_id: number };
    if (team) {
      // Check if evaluation already exists to avoid duplicates on restart
      const existing = db.prepare("SELECT id FROM evaluations WHERE team_id = ? AND round_id = ? AND evaluator_id = ?").get(team.id, r2Id.id, rishabh.id);
      if (!existing) {
        const scoreMap: Record<number, number> = {};
        data.scores.forEach((s, idx) => {
          if (r2Params[idx]) {
            scoreMap[r2Params[idx].id] = s;
          }
        });
        insertEval.run(team.id, r2Id.id, rishabh.id, team.problem_statement_id, JSON.stringify(scoreMap), "Round 2 evaluation", data.total);
      }
    }
  });

  // Round 1 Evaluations by Srijan
  const srijan = db.prepare("SELECT id FROM evaluators WHERE name = ?").get("Srijan") as { id: number };
  const srijanData = [
    { team: "Codestorm", scores: [9, 5, 8, 4], total: 26 },
    { team: "MARS", scores: [7, 3, 5, 2], total: 17 },
    { team: "Codecription", scores: [4, 0, 1, 2], total: 7 },
    { team: "Rebels", scores: [10, 5, 10, 5], total: 30 },
    { team: "Winners", scores: [10, 3, 6, 4], total: 23 },
    { team: "Team Triverse", scores: [10, 3, 7, 5], total: 25 },
    { team: "CodeRed", scores: [9, 4, 9, 5], total: 27 },
    { team: "BitByBit", scores: [7, 4, 5, 0], total: 16 },
    { team: "Code101", scores: [8, 2, 3, 3], total: 16 },
    { team: "4chan", scores: [8, 3, 7, 2], total: 20 },
    { team: "Tech Vengers", scores: [10, 5, 8, 5], total: 28 },
    { team: "D3CODE", scores: [10, 3, 7, 4], total: 24 },
    { team: "Hackoholics", scores: [6, 2, 5, 0], total: 13 },
    { team: "Code Catalyst", scores: [6, 3, 4, 2], total: 15 },
    { team: "Phoenix", scores: [4, 2, 0, 0], total: 6 },
    { team: "CodeQuad", scores: [5, 2, 3, 1], total: 11 },
    { team: "TokenX", scores: [9, 5, 6, 2], total: 22 },
    { team: "Alpha developer", scores: [4, 0, 0, 0], total: 4 },
    { team: "Team Invictus", scores: [5, 2, 6, 2], total: 15 },
    { team: "DeCoders", scores: [5, 0, 3, 0], total: 8 },
    { team: "Code Fusion", scores: [8, 3, 4, 2], total: 17 },
    { team: "4 CLOVER", scores: [6, 2, 4, 0], total: 12 },
    { team: "Avengers", scores: [7, 2, 5, 3], total: 17 },
    { team: "TEAM SHOURYANGA", scores: [4, 2, 0, 2], total: 8 },
    { team: "TriNova Coders", scores: [7, 3, 5, 1], total: 16 },
    { team: "Team Titans", scores: [7, 4, 5, 3], total: 19 },
    { team: "Central C", scores: [8, 5, 8, 4], total: 25 },
    { team: "Code Wave", scores: [8, 4, 6, 3], total: 21 },
    { team: "Binary Architects", scores: [6, 3, 0, 0], total: 9 },
    { team: "Mind Spark", scores: [5, 0, 0, 1], total: 6 },
  ];

  srijanData.forEach(data => {
    const team = db.prepare("SELECT id, problem_statement_id FROM teams WHERE name = ?").get(data.team) as { id: number, problem_statement_id: number };
    if (team) {
      const scoreMap: Record<number, number> = {};
      data.scores.forEach((s, idx) => {
        scoreMap[r1Params[idx].id] = s;
      });
      insertEval.run(team.id, r1Id.id, srijan.id, team.problem_statement_id, JSON.stringify(scoreMap), "Initial round evaluation", data.total);
    }
  });
}

// Ensure Round 2 data for Rishabh exists (Migration/Fix)
function seedRound2Data() {
  try {
    const rishabh = db.prepare("SELECT id FROM evaluators WHERE name = ?").get("Rishabh") as { id: number } | undefined;
    const r2 = db.prepare("SELECT id FROM rounds WHERE sequence = 2").get() as { id: number } | undefined;
    
    if (!rishabh || !r2) {
      console.log("Skipping Round 2 seed: Evaluator or Round not found");
      return;
    }

    const r2Params = db.prepare("SELECT id FROM parameters WHERE round_id = ? ORDER BY id").all(r2.id) as { id: number }[];
    
    const r2DataRishabh = [
      { team: "Team Invictus", scores: [10, 4, 9, 1], total: 24 },
      { team: "Tech Vengers", scores: [8, 4, 7, 5], total: 24 },
      { team: "Team Triverse", scores: [6, 3, 7, 2], total: 18 },
      { team: "Mind Spark", scores: [7, 2, 7, 2], total: 18 },
      { team: "Team Titans", scores: [8, 2, 7, 1], total: 18 },
      { team: "Code101", scores: [7, 2, 6, 2], total: 17 },
      { team: "D3CODE", scores: [7, 3, 2, 2], total: 14 },
      { team: "Central C", scores: [7, 1, 4, 2], total: 14 },
      { team: "CodeQuad", scores: [6, 1, 4, 1], total: 12 },
      { team: "Code Catalyst", scores: [4, 1, 4, 1], total: 10 },
      { team: "TriNova Coders", scores: [5, 1, 2, 2], total: 10 },
      { team: "Alpha developer", scores: [3, 1, 4, 1], total: 9 },
      { team: "4chan", scores: [2, 1, 2, 1], total: 6 },
      { team: "Code Wave", scores: [1, 1, 1, 1], total: 4 }
    ];

    const insertEval = db.prepare(`
      INSERT INTO evaluations (team_id, round_id, evaluator_id, problem_statement_id, scores, feedback, total_score)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    let addedCount = 0;
    r2DataRishabh.forEach(data => {
      const team = db.prepare("SELECT id, problem_statement_id FROM teams WHERE name = ?").get(data.team) as { id: number, problem_statement_id: number };
      if (team) {
        // Check if evaluation already exists
        const existing = db.prepare("SELECT id FROM evaluations WHERE team_id = ? AND round_id = ? AND evaluator_id = ?").get(team.id, r2.id, rishabh.id);
        if (!existing) {
          const scoreMap: Record<number, number> = {};
          data.scores.forEach((s, idx) => {
            if (r2Params[idx]) {
              scoreMap[r2Params[idx].id] = s;
            }
          });
          insertEval.run(team.id, r2.id, rishabh.id, team.problem_statement_id, JSON.stringify(scoreMap), "Round 2 evaluation (Restored)", data.total);
          addedCount++;
        }
      }
    });
    
    if (addedCount > 0) {
      console.log(`Restored ${addedCount} Round 2 evaluations for Rishabh.`);
    }

    // Srijan Round 2 Data
    const srijan = db.prepare("SELECT id FROM evaluators WHERE name = ?").get("Srijan") as { id: number } | undefined;
    if (!srijan) {
      console.log("Skipping Round 2 seed for Srijan: Evaluator not found");
      return;
    }

    const r2DataSrijan = [
      { team: "Central C", scores: [10, 4, 8, 5], total: 27 },
      { team: "Tech Vengers", scores: [10, 5, 6, 5], total: 26 },
      { team: "Team Invictus", scores: [10, 4, 8, 3], total: 25 },
      { team: "Team Titans", scores: [8, 2, 10, 3], total: 23 },
      { team: "Code101", scores: [7, 3, 7, 3], total: 20 },
      { team: "Team Triverse", scores: [7, 3, 6, 1], total: 17 },
      { team: "Mind Spark", scores: [5, 2, 7, 2], total: 16 },
      { team: "TriNova Coders", scores: [6, 2, 6, 1], total: 15 },
      { team: "CodeQuad", scores: [6, 2, 5, 1], total: 14 },
      { team: "D3CODE", scores: [6, 3, 2, 2], total: 13 },
      { team: "Code Catalyst", scores: [4, 1, 3, 1], total: 9 },
      { team: "4chan", scores: [3, 1, 4, 1], total: 9 },
      { team: "Alpha developer", scores: [1, 1, 1, 1], total: 4 },
      { team: "Code Wave", scores: [1, 1, 1, 1], total: 4 }
    ];

    let addedCountSrijan = 0;
    r2DataSrijan.forEach(data => {
      const team = db.prepare("SELECT id, problem_statement_id FROM teams WHERE name = ?").get(data.team) as { id: number, problem_statement_id: number };
      if (team) {
        // Check if evaluation already exists
        const existing = db.prepare("SELECT id FROM evaluations WHERE team_id = ? AND round_id = ? AND evaluator_id = ?").get(team.id, r2.id, srijan.id);
        if (!existing) {
          const scoreMap: Record<number, number> = {};
          data.scores.forEach((s, idx) => {
            if (r2Params[idx]) {
              scoreMap[r2Params[idx].id] = s;
            }
          });
          insertEval.run(team.id, r2.id, srijan.id, team.problem_statement_id, JSON.stringify(scoreMap), "Round 2 evaluation (Restored)", data.total);
          addedCountSrijan++;
        }
      }
    });

    if (addedCountSrijan > 0) {
      console.log(`Restored ${addedCountSrijan} Round 2 evaluations for Srijan.`);
    }

  } catch (error) {
    console.error("Error seeding Round 2 data:", error);
  }
}

seedRound2Data();

async function startServer() {
  const app = express();
  app.use(express.json());

  // Request logging middleware
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
  });

  app.post("/api/login", (req, res) => {
    const { username, password } = req.body;
    const user = db.prepare("SELECT * FROM users WHERE username = ? AND password = ?").get(username, password);
    if (user) {
      res.json({ success: true, user });
    } else {
      res.status(401).json({ success: false, message: "Invalid credentials" });
    }
  });

  // API Routes
  app.get("/api/evaluators", (req, res) => {
    const evaluators = db.prepare("SELECT * FROM evaluators").all();
    res.json(evaluators);
  });

  app.get("/api/teams", (req, res) => {
    const teams = db.prepare("SELECT * FROM teams").all();
    res.json(teams);
  });

  app.post("/api/teams", (req, res) => {
    const { name, description } = req.body;
    const result = db.prepare("INSERT INTO teams (name, description) VALUES (?, ?)").run(name, description);
    res.json({ id: result.lastInsertRowid });
  });

  app.post("/api/teams/:id/assign-ps", (req, res) => {
    const { id } = req.params;
    const { problem_statement_id } = req.body;
    db.prepare("UPDATE teams SET problem_statement_id = ? WHERE id = ?").run(problem_statement_id, id);
    res.json({ success: true });
  });

  app.get("/api/problem-statements", (req, res) => {
    const ps = db.prepare("SELECT * FROM problem_statements").all();
    res.json(ps);
  });

  app.get("/api/rounds", (req, res) => {
    const rounds = db.prepare("SELECT * FROM rounds ORDER BY sequence").all();
    res.json(rounds);
  });

  app.post("/api/rounds", (req, res) => {
    const { name, sequence } = req.body;
    const result = db.prepare("INSERT INTO rounds (name, sequence, is_active) VALUES (?, ?, 0)").run(name, sequence);
    res.json({ id: result.lastInsertRowid });
  });

  app.post("/api/rounds/:id/toggle-active", (req, res) => {
    const { id } = req.params;
    const { is_active } = req.body;
    
    // Deactivate all other rounds if this one is being activated
    if (is_active) {
      db.prepare("UPDATE rounds SET is_active = 0").run();
    }
    
    db.prepare("UPDATE rounds SET is_active = ? WHERE id = ?").run(is_active ? 1 : 0, id);
    res.json({ success: true });
  });

  app.get("/api/parameters", (req, res) => {
    const { round_id } = req.query;
    let query = "SELECT * FROM parameters";
    let params: any[] = [];
    if (round_id) {
      query += " WHERE round_id = ?";
      params.push(round_id);
    }
    const p = db.prepare(query).all(...params);
    res.json(p);
  });

  app.get("/api/evaluations", (req, res) => {
    const evaluations = db.prepare(`
      SELECT e.*, t.name as team_name, r.name as round_name, ps.title as ps_title, ev.name as evaluator_name
      FROM evaluations e
      JOIN teams t ON e.team_id = t.id
      JOIN rounds r ON e.round_id = r.id
      JOIN evaluators ev ON e.evaluator_id = ev.id
      LEFT JOIN problem_statements ps ON e.problem_statement_id = ps.id
      ORDER BY e.created_at DESC
    `).all();
    res.json(evaluations);
  });

  app.post("/api/evaluations", (req, res) => {
    const { team_id, round_id, evaluator_id, problem_statement_id, scores, feedback, total_score } = req.body;
    const result = db.prepare(`
      INSERT INTO evaluations (team_id, round_id, evaluator_id, problem_statement_id, scores, feedback, total_score)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(team_id, round_id, evaluator_id, problem_statement_id, JSON.stringify(scores), feedback, total_score);
    res.json({ id: result.lastInsertRowid });
  });

  app.put("/api/evaluations/:id", (req, res) => {
    const { id } = req.params;
    const { scores, feedback, total_score } = req.body;
    db.prepare(`
      UPDATE evaluations 
      SET scores = ?, feedback = ?, total_score = ?, created_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(JSON.stringify(scores), feedback, total_score, id);
    res.json({ success: true });
  });

  app.delete("/api/evaluations/:id", (req, res) => {
    const { id } = req.params;
    console.log(`[DELETE] Request to delete evaluation with ID: ${id}`);
    
    if (!id || id === "undefined" || id === "null") {
      console.error(`[DELETE] Invalid ID: ${id}`);
      return res.status(400).json({ success: false, message: "Invalid ID" });
    }

    try {
      const result = db.prepare("DELETE FROM evaluations WHERE id = ?").run(id);
      console.log(`[DELETE] Result: ${result.changes} changes`);
      if (result.changes > 0) {
        res.json({ success: true });
      } else {
        res.status(404).json({ success: false, message: "Evaluation not found" });
      }
    } catch (error) {
      console.error(`[DELETE] Error:`, error);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  const PORT = 3000;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
