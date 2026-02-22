
import Database from "better-sqlite3";

const db = new Database("hackathon.db");

// Check evaluations count per round
const evalCounts = db.prepare(`
  SELECT r.name, COUNT(e.id) as count 
  FROM rounds r 
  LEFT JOIN evaluations e ON r.id = e.round_id 
  GROUP BY r.id
`).all();
console.log("Evaluation Counts:", evalCounts);
