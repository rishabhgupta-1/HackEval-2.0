export interface Evaluator {
  id: number;
  name: string;
}

export interface User {
  id: number;
  username: string;
  role: "admin" | "judge";
  evaluator_id?: number;
}

export interface Team {
  id: number;
  name: string;
  description: string;
  problem_statement_id?: number | null;
}

export interface ProblemStatement {
  id: number;
  title: string;
  theme?: string;
  description: string;
}

export interface Round {
  id: number;
  name: string;
  sequence: number;
  is_active: number; // 0 or 1
}

export interface Parameter {
  id: number;
  round_id: number;
  name: string;
  max_score: number;
}

export interface Evaluation {
  id?: number;
  team_id: number;
  round_id: number;
  evaluator_id: number;
  problem_statement_id: number;
  scores: Record<number, number>;
  feedback: string;
  total_score: number;
  team_name?: string;
  round_name?: string;
  evaluator_name?: string;
  ps_title?: string;
  created_at?: string;
}
