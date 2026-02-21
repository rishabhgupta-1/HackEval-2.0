
import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3000';

async function testDelete() {
  console.log("Creating a test evaluation...");
  // First create a dummy evaluation
  const createRes = await fetch(`${BASE_URL}/api/evaluations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      team_id: 1, // Assuming team 1 exists
      round_id: 1, // Assuming round 1 exists
      evaluator_id: 1, // Assuming evaluator 1 exists
      problem_statement_id: 1, // Assuming ps 1 exists
      scores: { 1: 5, 2: 5 },
      feedback: "Test delete",
      total_score: 10
    })
  });
  
  const createData = await createRes.json();
  const evalId = createData.id;
  console.log(`Created evaluation with ID: ${evalId}`);

  // Verify it exists
  let res = await fetch(`${BASE_URL}/api/evaluations`);
  let evals = await res.json();
  let found = evals.find((e: any) => e.id === evalId);
  console.log("Evaluation exists before delete:", !!found);

  if (!found) {
    console.error("Failed to create evaluation properly.");
    return;
  }

  // Delete it
  console.log(`Deleting evaluation ${evalId}...`);
  const deleteRes = await fetch(`${BASE_URL}/api/evaluations/${evalId}`, {
    method: 'DELETE'
  });
  
  console.log("Delete response status:", deleteRes.status);
  const deleteData = await deleteRes.json();
  console.log("Delete response body:", deleteData);

  // Verify it's gone
  res = await fetch(`${BASE_URL}/api/evaluations`);
  evals = await res.json();
  found = evals.find((e: any) => e.id === evalId);
  console.log("Evaluation exists after delete:", !!found);
}

testDelete().catch(console.error);
