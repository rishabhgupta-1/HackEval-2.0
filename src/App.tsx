import { useState, useEffect, FormEvent, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  PieChart,
  Pie,
  Legend
} from "recharts";
import { 
  Users, 
  Trophy, 
  ClipboardCheck, 
  Plus, 
  ChevronRight, 
  Star, 
  LayoutDashboard,
  History,
  CheckCircle2,
  AlertCircle,
  BarChart3,
  PieChart as PieChartIcon,
  Medal
} from "lucide-react";
import { Team, ProblemStatement, Round, Parameter, Evaluation, Evaluator, User } from "./types";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  const [view, setView] = useState<"dashboard" | "evaluate" | "history" | "settings" | "analytics">("dashboard");
  const [selectedRoundFilter, setSelectedRoundFilter] = useState<number | "all">("all");
  const [teams, setTeams] = useState<Team[]>([]);
  const [problemStatements, setProblemStatements] = useState<ProblemStatement[]>([]);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [parameters, setParameters] = useState<Parameter[]>([]);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [evaluators, setEvaluators] = useState<Evaluator[]>([]);

  // Form State
  const [evalStep, setEvalStep] = useState<"evaluator" | "team" | "round" | "score">("evaluator");
  const [selectedTeam, setSelectedTeam] = useState<number | null>(null);
  const [selectedRound, setSelectedRound] = useState<number | null>(null);
  const [selectedEvaluator, setSelectedEvaluator] = useState<number | null>(null);
  const [scores, setScores] = useState<Record<number, number>>({});
  const [feedback, setFeedback] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Settings State
  const [newRoundName, setNewRoundName] = useState("");
  const [newRoundSeq, setNewRoundSeq] = useState(1);

  // History Filter State
  const [historySearchQuery, setHistorySearchQuery] = useState("");
  const [historyJudgeFilter, setHistoryJudgeFilter] = useState<number | "all">("all");
  const [historyPSFilter, setHistoryPSFilter] = useState<number | "all">("all");
  const [teamSearchTerm, setTeamSearchTerm] = useState("");
  const [showEvaluatedTeams, setShowEvaluatedTeams] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    evalId: number | null;
    teamName: string;
  }>({ isOpen: false, evalId: null, teamName: "" });

  const VIBRANT_COLORS = [
    "#6366f1", // Indigo
    "#10b981", // Emerald
    "#f59e0b", // Amber
    "#f43f5e", // Rose
    "#8b5cf6", // Violet
    "#0ea5e9", // Sky
    "#f97316", // Orange
    "#ec4899", // Pink
    "#06b6d4", // Cyan
    "#84cc16", // Lime
  ];

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (data.success) {
        setUser(data.user);
        if (data.user.role === "judge") {
          setSelectedEvaluator(data.user.evaluator_id);
        }
      } else {
        setLoginError(data.message);
      }
    } catch (error) {
      console.error("Login error:", error);
      setLoginError("An error occurred during login.");
    }
  };

  const fetchData = async () => {
    try {
      const [tRes, psRes, rRes, pRes, eRes, evRes] = await Promise.all([
        fetch("/api/teams"),
        fetch("/api/problem-statements"),
        fetch("/api/rounds"),
        fetch("/api/parameters"),
        fetch("/api/evaluations"),
        fetch("/api/evaluators"),
      ]);

      const teamsData = await tRes.json();
      const roundsData = await rRes.json();
      
      setTeams(teamsData);
      setProblemStatements(await psRes.json());
      setRounds(roundsData);
      setParameters(await pRes.json());
      setEvaluations(await eRes.json());
      setEvaluators(await evRes.json());

      // Set default round filter to the first round if not set
      if (selectedRoundFilter === "all" && roundsData.length > 0) {
        setSelectedRoundFilter(roundsData[0].id);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  const fetchParametersForRound = async (roundId: number) => {
    try {
      const res = await fetch(`/api/parameters?round_id=${roundId}`);
      const data = await res.json();
      setParameters(data);
    } catch (error) {
      console.error("Error fetching parameters:", error);
    }
  };

  useEffect(() => {
    if (selectedRound) {
      fetchParametersForRound(selectedRound);
    }
  }, [selectedRound]);

  const getEvaluationForTeamInRound = (teamId: number, roundId: number | "all") => {
    if (roundId === "all") return evaluations.find(e => e.team_id === teamId);
    return evaluations.find(e => e.team_id === teamId && e.round_id === roundId);
  };

  const handleScoreChange = (paramId: number, value: number) => {
    setScores(prev => ({ ...prev, [paramId]: value }));
  };

  const calculateTotal = () => {
    return Object.values(scores).reduce((acc: number, curr: number) => acc + curr, 0);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedTeam || !selectedRound || !selectedEvaluator) return;

    const team = teams.find(t => t.id === selectedTeam);
    if (!team?.problem_statement_id) {
      alert("Team must have a problem statement assigned first.");
      return;
    }

    setIsSubmitting(true);
    try {
      const existingEval = evaluations.find(e => 
        e.team_id === selectedTeam && 
        e.round_id === selectedRound && 
        e.evaluator_id === selectedEvaluator
      );

      let response;
      if (existingEval) {
        response = await fetch(`/api/evaluations/${existingEval.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            scores,
            feedback,
            total_score: calculateTotal(),
          }),
        });
      } else {
        response = await fetch("/api/evaluations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            team_id: selectedTeam,
            round_id: selectedRound,
            evaluator_id: selectedEvaluator,
            problem_statement_id: team.problem_statement_id,
            scores,
            feedback,
            total_score: calculateTotal(),
          }),
        });
      }

      if (response.ok) {
        await fetchData();
        setEvalStep("team");
        setSelectedTeam(null);
        setSelectedRound(null);
        setScores({});
        setFeedback("");
      }
    } catch (error) {
      console.error("Error submitting evaluation:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteEvaluation = async () => {
    console.log("handleDeleteEvaluation called");
    console.log("Current selection:", { selectedTeam, selectedRound, selectedEvaluator });
    
    if (!selectedTeam || !selectedRound || !selectedEvaluator) {
      console.error("Missing selection:", { selectedTeam, selectedRound, selectedEvaluator });
      alert("Please select a team, round, and evaluator first.");
      return;
    }
    
    const existingEval = evaluations.find(e => 
      e.team_id === selectedTeam && 
      e.round_id === selectedRound && 
      e.evaluator_id === selectedEvaluator
    );

    console.log("Found existing evaluation:", existingEval);

    if (!existingEval) {
      console.error("Evaluation not found for deletion");
      alert("Evaluation not found. Please refresh the page.");
      return;
    }

    // Open custom confirmation modal
    setDeleteConfirmation({
      isOpen: true,
      evalId: existingEval.id || null,
      teamName: teams.find(t => t.id === selectedTeam)?.name || "Unknown Team"
    });
  };

  const confirmDelete = async () => {
    if (!deleteConfirmation.evalId) return;

    setIsSubmitting(true);
    try {
      console.log(`Sending DELETE request for ID: ${deleteConfirmation.evalId}`);
      const res = await fetch(`/api/evaluations/${deleteConfirmation.evalId}`, {
        method: "DELETE",
      });
      
      console.log("Delete response status:", res.status);
      
      if (res.ok) {
        console.log("Delete successful, refreshing data...");
        await fetchData();
        setEvalStep("team");
        setSelectedTeam(null);
        setSelectedRound(null);
        setScores({});
        setFeedback("");
        // Close modal
        setDeleteConfirmation({ isOpen: false, evalId: null, teamName: "" });
      } else {
        const errorData = await res.json();
        console.error("Delete failed:", errorData);
        alert(`Failed to delete evaluation: ${errorData.message}`);
      }
    } catch (error) {
      console.error("Error deleting evaluation:", error);
      alert("An error occurred while deleting the evaluation.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAssignPS = async (teamId: number, psId: number) => {
    try {
      const res = await fetch(`/api/teams/${teamId}/assign-ps`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ problem_statement_id: psId }),
      });
      if (res.ok) {
        await fetchData();
      }
    } catch (error) {
      console.error("Error assigning PS:", error);
    }
  };

  const handleAddRound = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/rounds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newRoundName, sequence: newRoundSeq }),
      });
      if (res.ok) {
        setNewRoundName("");
        setNewRoundSeq(prev => prev + 1);
        await fetchData();
      }
    } catch (error) {
      console.error("Error adding round:", error);
    }
  };

  const handleToggleRoundActive = async (roundId: number, currentStatus: number) => {
    try {
      const res = await fetch(`/api/rounds/${roundId}/toggle-active`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !currentStatus }),
      });
      if (res.ok) {
        await fetchData();
      }
    } catch (error) {
      console.error("Error toggling round active status:", error);
    }
  };

  const resetForm = () => {
    setEvalStep("evaluator");
    setSelectedTeam(null);
    setSelectedRound(null);
    setSelectedEvaluator(null);
    setScores({});
    setFeedback("");
  };

  const handleLogout = () => {
    setUser(null);
    setUsername("");
    setPassword("");
    setLoginError("");
    setView("dashboard");
    resetForm();
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-[#E4E3E0] flex items-center justify-center p-4 font-sans text-[#141414]">
        <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-md border border-[#141414]/10">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-[#141414] rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Trophy className="text-white w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight uppercase italic font-serif">NM Hacks</h1>
            <p className="text-sm opacity-50 uppercase tracking-widest font-mono">Evaluation Portal</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-mono uppercase opacity-50 block">Username</label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full p-4 bg-[#141414]/5 border border-[#141414]/10 rounded-xl outline-none focus:ring-2 ring-[#141414]/20 transition-all"
                placeholder="Enter username"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-[10px] font-mono uppercase opacity-50 block">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-4 bg-[#141414]/5 border border-[#141414]/10 rounded-xl outline-none focus:ring-2 ring-[#141414]/20 transition-all"
                placeholder="Enter password"
              />
            </div>

            {loginError && (
              <div className="p-3 bg-red-50 text-red-600 text-xs rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {loginError}
              </div>
            )}

            <button
              type="submit"
              className="w-full py-4 bg-[#141414] text-white rounded-xl font-bold uppercase tracking-wide hover:opacity-90 transition-opacity"
            >
              Login
            </button>
          </form>
          
          <div className="mt-8 pt-8 border-t border-[#141414]/10 text-center">
            <p className="text-[10px] font-mono uppercase opacity-40">
              Authorized Personnel Only
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#E4E3E0] text-[#141414] font-sans">
      {/* Sidebar / Navigation (Desktop) */}
      <nav className="hidden md:flex fixed left-0 top-0 h-full w-20 bg-gradient-to-b from-[#141414] to-[#2a2a2a] flex-col items-center py-8 gap-8 z-50 shadow-2xl">
        <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/30 mb-4 group cursor-pointer hover:scale-110 transition-transform">
          <Trophy className="w-6 h-6 group-hover:rotate-12 transition-transform" />
        </div>
        
        <button 
          onClick={() => setView("dashboard")}
          className={`p-3 rounded-xl transition-all ${view === "dashboard" ? "bg-white text-[#141414]" : "text-white/50 hover:text-white"}`}
          title="Dashboard"
        >
          <LayoutDashboard className="w-6 h-6" />
        </button>
        
        <button 
          onClick={() => setView("evaluate")}
          className={`p-3 rounded-xl transition-all ${view === "evaluate" ? "bg-white text-[#141414]" : "text-white/50 hover:text-white"}`}
          title="Evaluate"
        >
          <ClipboardCheck className="w-6 h-6" />
        </button>
        
        <button 
          onClick={() => setView("history")}
          className={`p-3 rounded-xl transition-all ${view === "history" ? "bg-white text-[#141414]" : "text-white/50 hover:text-white"}`}
          title="History"
        >
          <History className="w-6 h-6" />
        </button>

        <button 
          onClick={() => setView("analytics")}
          className={`p-3 rounded-xl transition-all ${view === "analytics" ? "bg-white text-[#141414]" : "text-white/50 hover:text-white"}`}
          title="Analytics"
        >
          <Star className="w-6 h-6" />
        </button>

        {user.role === "admin" && (
          <button 
            onClick={() => setView("settings")}
            className={`p-3 rounded-xl transition-all ${view === "settings" ? "bg-white text-[#141414]" : "text-white/50 hover:text-white"}`}
            title="Settings"
          >
            <Plus className="w-6 h-6" />
          </button>
        )}

        <div className="mt-auto">
          <button 
            onClick={handleLogout}
            className="p-3 rounded-xl text-white/50 hover:text-red-400 transition-colors"
            title="Logout"
          >
            <Users className="w-6 h-6" />
          </button>
        </div>
      </nav>

      {/* Bottom Navigation (Mobile) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[#141414] flex justify-around items-center h-16 z-50 border-t border-white/10 px-2">
        <button 
          onClick={() => setView("dashboard")}
          className={`p-2 rounded-lg transition-all ${view === "dashboard" ? "text-indigo-400" : "text-white/50"}`}
        >
          <LayoutDashboard className="w-6 h-6" />
        </button>
        <button 
          onClick={() => setView("evaluate")}
          className={`p-2 rounded-lg transition-all ${view === "evaluate" ? "text-indigo-400" : "text-white/50"}`}
        >
          <ClipboardCheck className="w-6 h-6" />
        </button>
        <button 
          onClick={() => setView("history")}
          className={`p-2 rounded-lg transition-all ${view === "history" ? "text-indigo-400" : "text-white/50"}`}
        >
          <History className="w-6 h-6" />
        </button>
        <button 
          onClick={() => setView("analytics")}
          className={`p-2 rounded-lg transition-all ${view === "analytics" ? "text-indigo-400" : "text-white/50"}`}
        >
          <Star className="w-6 h-6" />
        </button>
        {user.role === "admin" && (
          <button 
            onClick={() => setView("settings")}
            className={`p-2 rounded-lg transition-all ${view === "settings" ? "text-indigo-400" : "text-white/50"}`}
          >
            <Plus className="w-6 h-6" />
          </button>
        )}
        <button 
          onClick={handleLogout}
          className="p-2 rounded-lg text-white/50"
        >
          <Users className="w-6 h-6" />
        </button>
      </nav>

      {/* Main Content */}
      <main className="md:pl-20 min-h-screen pb-20 md:pb-0">
        <header className="p-4 md:p-8 border-b border-[#141414]/10 flex justify-between items-center bg-white/50 backdrop-blur-sm sticky top-0 z-40">
          <div>
            <h1 className="text-lg md:text-2xl font-bold tracking-tight uppercase italic font-serif">NM Hacks</h1>
            <p className="text-[10px] md:text-sm opacity-50 uppercase tracking-widest font-mono">Judging Dashboard</p>
          </div>
          <div className="flex items-center gap-2 md:gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-[10px] font-mono opacity-50 uppercase">Logged in as</p>
              <p className="text-xs md:text-sm font-bold">{user.username}</p>
            </div>
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-[#141414] flex items-center justify-center text-white text-xs md:text-base font-bold uppercase shadow-lg">
              {user.username.substring(0, 2)}
            </div>
          </div>
        </header>

        <div className="p-4 md:p-8 max-w-6xl mx-auto">
          <AnimatePresence mode="wait">
            {view === "dashboard" && (
              <motion.div 
                key="dashboard"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8"
              >
                {/* Stats Row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-6">
                  <div className="bg-white p-4 md:p-6 border border-[#141414]/10 rounded-2xl relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500" />
                    <p className="text-[10px] md:text-xs font-mono opacity-50 uppercase mb-1 md:mb-2">Total Teams</p>
                    <p className="text-2xl md:text-4xl font-bold text-indigo-600">{teams.length}</p>
                    <Users className="absolute right-2 bottom-2 md:right-4 md:bottom-4 w-8 h-8 md:w-12 md:h-12 opacity-5 -rotate-12 group-hover:rotate-0 transition-transform" />
                  </div>
                  <div className="bg-white p-4 md:p-6 border border-[#141414]/10 rounded-2xl relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />
                    <p className="text-[10px] md:text-xs font-mono opacity-50 uppercase mb-1 md:mb-2">Evaluations</p>
                    <p className="text-2xl md:text-4xl font-bold text-emerald-600">{evaluations.length}</p>
                    <ClipboardCheck className="absolute right-2 bottom-2 md:right-4 md:bottom-4 w-8 h-8 md:w-12 md:h-12 opacity-5 -rotate-12 group-hover:rotate-0 transition-transform" />
                  </div>
                  <div className="bg-white p-4 md:p-6 border border-[#141414]/10 rounded-2xl relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-1 h-full bg-amber-500" />
                    <p className="text-[10px] md:text-xs font-mono opacity-50 uppercase mb-1 md:mb-2">Avg. Score</p>
                    <p className="text-2xl md:text-4xl font-bold text-amber-600">
                      {evaluations.length > 0 
                        ? (evaluations.reduce((a, b) => a + (b.total_score || 0), 0) / evaluations.length).toFixed(1)
                        : "0.0"}
                    </p>
                    <Star className="absolute right-2 bottom-2 md:right-4 md:bottom-4 w-8 h-8 md:w-12 md:h-12 opacity-5 -rotate-12 group-hover:rotate-0 transition-transform" />
                  </div>
                  <div className="bg-[#141414] text-white p-4 md:p-6 rounded-2xl flex flex-col justify-center relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-1 h-full bg-rose-500" />
                    <p className="text-[10px] md:text-xs font-mono opacity-50 uppercase mb-1 md:mb-2 text-white/50">Active Round</p>
                    <p className="text-sm md:text-xl font-bold italic font-serif text-rose-400">
                      {rounds.find(r => r.id === selectedRoundFilter)?.name || "All Rounds"}
                    </p>
                    <Trophy className="absolute right-2 bottom-2 md:right-4 md:bottom-4 w-8 h-8 md:w-12 md:h-12 opacity-10 -rotate-12 group-hover:rotate-0 transition-transform" />
                  </div>
                </div>

                {/* Filter & Parameters Section */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2 space-y-6">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <h2 className="text-xl font-bold italic font-serif">Project Submissions</h2>
                      <div className="flex items-center gap-3 bg-white p-1 rounded-xl border border-[#141414]/10">
                        <button 
                          onClick={() => setSelectedRoundFilter("all")}
                          className={`px-4 py-2 text-xs font-mono uppercase rounded-lg transition-all ${selectedRoundFilter === "all" ? "bg-[#141414] text-white" : "hover:bg-[#141414]/5"}`}
                        >
                          All
                        </button>
                        {rounds.map(round => (
                          <button 
                            key={round.id}
                            onClick={() => setSelectedRoundFilter(round.id)}
                            className={`px-4 py-2 text-xs font-mono uppercase rounded-lg transition-all ${selectedRoundFilter === round.id ? "bg-[#141414] text-white" : "hover:bg-[#141414]/5"}`}
                          >
                            R{round.sequence}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="bg-white border border-[#141414]/10 rounded-2xl overflow-x-auto">
                      <div className="min-w-[600px]">
                        <div className="grid grid-cols-12 p-4 bg-[#141414] text-white text-[10px] uppercase tracking-widest font-mono">
                          <div className="col-span-4">Team Name</div>
                          <div className="col-span-5">Problem Statement</div>
                          <div className="col-span-1 text-center">R1</div>
                          <div className="col-span-1 text-center">R2</div>
                          <div className="col-span-1 text-center">R3</div>
                        </div>
                        {teams.map((team) => {
                          const ps = problemStatements.find(p => p.id === team.problem_statement_id);
                          
                          return (
                            <div key={team.id} className="grid grid-cols-12 p-4 border-b border-[#141414]/5 items-center hover:bg-[#141414]/5 transition-colors group">
                              <div className="col-span-4">
                                <p className="font-bold text-sm">{team.name}</p>
                                <p className="text-[10px] opacity-50 uppercase font-mono">ID: {team.id}</p>
                              </div>
                              <div className="col-span-5">
                                <p className="text-[10px] font-mono uppercase font-bold">
                                  {ps ? ps.title : "Unassigned"}
                                </p>
                                {ps && <p className="text-[9px] opacity-40 uppercase font-mono">{ps.theme}</p>}
                              </div>
                              <div className="col-span-1 flex justify-center">
                                {rounds.find(r => r.sequence === 1) && (
                                  <div className={`w-2 h-2 rounded-full ${evaluations.some(e => e.team_id === team.id && e.round_id === rounds.find(r => r.sequence === 1)?.id) ? 'bg-emerald-500' : 'bg-amber-400 opacity-30'}`} title="Round 1" />
                                )}
                              </div>
                              <div className="col-span-1 flex justify-center">
                                {rounds.find(r => r.sequence === 2) && (
                                  <div className={`w-2 h-2 rounded-full ${evaluations.some(e => e.team_id === team.id && e.round_id === rounds.find(r => r.sequence === 2)?.id) ? 'bg-emerald-500' : 'bg-amber-400 opacity-30'}`} title="Round 2" />
                                )}
                              </div>
                              <div className="col-span-1 flex justify-center">
                                {rounds.find(r => r.sequence === 3) && (
                                  <div className={`w-2 h-2 rounded-full ${evaluations.some(e => e.team_id === team.id && e.round_id === rounds.find(r => r.sequence === 3)?.id) ? 'bg-emerald-500' : 'bg-amber-400 opacity-30'}`} title="Round 3" />
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <h2 className="text-xl font-bold italic font-serif">Scoring Parameters</h2>
                    <div className="bg-white p-6 border border-[#141414]/10 rounded-2xl space-y-4">
                      {parameters.map(param => (
                        <div key={param.id} className="flex justify-between items-center p-3 bg-[#141414]/5 rounded-xl border border-[#141414]/5">
                          <span className="text-sm font-bold">{param.name}</span>
                          <span className="text-[10px] font-mono uppercase bg-[#141414] text-white px-2 py-1 rounded">
                            Max: {param.max_score}
                          </span>
                        </div>
                      ))}
                      <div className="pt-4 border-t border-[#141414]/10">
                        <p className="text-[10px] font-mono uppercase opacity-50 mb-2">Total Possible</p>
                        <p className="text-2xl font-bold">{parameters.reduce((a, b) => a + b.max_score, 0)} Points</p>
                      </div>
                    </div>

                    <div className="bg-[#141414] text-white p-6 rounded-2xl space-y-4">
                      <h3 className="font-bold italic font-serif">Judging Tips</h3>
                      <ul className="text-xs space-y-2 opacity-70 list-disc pl-4">
                        <li>Focus on technical feasibility</li>
                        <li>Consider UI/UX consistency</li>
                        <li>Evaluate team collaboration</li>
                        <li>Check alignment with PS</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {view === "evaluate" && (
              <motion.div 
                key="evaluate"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="max-w-3xl mx-auto"
              >
                <div className="bg-white border border-[#141414]/10 rounded-3xl overflow-hidden shadow-2xl min-h-[500px] flex flex-col md:flex-row">
                  <div className="p-6 md:p-8 bg-[#141414] text-white md:w-80 flex flex-col justify-center">
                    <h2 className="text-2xl md:text-3xl font-bold italic font-serif mb-2">
                      {evalStep === "evaluator" && "Identify Yourself"}
                      {evalStep === "team" && "Select Team"}
                      {evalStep === "round" && "Select Round"}
                      {evalStep === "score" && (
                        <div className="flex items-center justify-between">
                          <div className="bg-white/10 px-4 py-2 rounded-xl backdrop-blur-md border border-white/20">
                            <p className="text-[10px] font-mono uppercase opacity-60">Live Score</p>
                            <p className="text-xl md:text-2xl font-bold italic font-serif">
                              {calculateTotal()} <span className="text-sm opacity-40 font-sans not-italic">/ {parameters.reduce((a, b) => a + b.max_score, 0)}</span>
                            </p>
                          </div>
                        </div>
                      )}
                    </h2>
                    <p className="text-xs md:text-sm opacity-60 font-mono uppercase tracking-widest">
                      {evalStep === "evaluator" && "Who is judging this session?"}
                      {evalStep === "team" && "Which team are you evaluating?"}
                      {evalStep === "round" && "Which stage of the hackathon?"}
                      {evalStep === "score" && `Scoring: ${teams.find(t => t.id === selectedTeam)?.name}`}
                    </p>
                  </div>

                  <div className="p-8 flex-1 flex flex-col">
                    {evalStep === "evaluator" && (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 flex-1 items-center">
                        {evaluators.map(ev => (
                          <button
                            key={ev.id}
                            onClick={() => {
                              setSelectedEvaluator(ev.id);
                              setEvalStep("team");
                            }}
                            disabled={user.role === "judge" && user.evaluator_id !== ev.id}
                            className={`p-6 border rounded-2xl transition-all group ${
                              user.role === "judge" && user.evaluator_id !== ev.id
                                ? "bg-gray-100 border-gray-200 opacity-50 cursor-not-allowed"
                                : "bg-[#141414]/5 border-[#141414]/10 hover:bg-[#141414] hover:text-white"
                            }`}
                          >
                            <Users className="w-8 h-8 mb-4 opacity-20 group-hover:opacity-100 mx-auto" />
                            <p className="font-bold text-center">{ev.name}</p>
                            {user.role === "judge" && user.evaluator_id === ev.id && (
                              <span className="text-[10px] font-mono uppercase bg-emerald-500 text-white px-2 py-1 rounded-full mt-2 inline-block">You</span>
                            )}
                          </button>
                        ))}
                      </div>
                    )}

                    {evalStep === "team" && (
                      <div className="space-y-4 flex-1">
                        <input
                          type="text"
                          placeholder="Search teams..."
                          value={teamSearchTerm}
                          onChange={(e) => setTeamSearchTerm(e.target.value)}
                          className="w-full p-3 bg-[#141414]/5 border border-[#141414]/10 rounded-xl outline-none focus:ring-2 ring-[#141414]/20 transition-all text-sm"
                        />
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto p-2">
                          {(() => {
                            const activeRound = rounds.find(r => r.is_active);
                            const filteredTeams = teams
                              .filter(t => t.problem_statement_id)
                              .filter(t => t.name.toLowerCase().includes(teamSearchTerm.toLowerCase()))
                              .sort((a, b) => a.name.localeCompare(b.name));

                            const evaluatedTeams = filteredTeams.filter(team => 
                              activeRound && evaluations.some(e => 
                                e.team_id === team.id && 
                                e.round_id === activeRound.id && 
                                e.evaluator_id === selectedEvaluator
                              )
                            );

                            const pendingTeams = filteredTeams.filter(team => 
                              !activeRound || !evaluations.some(e => 
                                e.team_id === team.id && 
                                e.round_id === activeRound.id && 
                                e.evaluator_id === selectedEvaluator
                              )
                            );

                            return (
                              <>
                                {pendingTeams.map(team => (
                                  <button
                                    key={team.id}
                                    onClick={() => {
                                      setSelectedTeam(team.id);
                                      setEvalStep("round");
                                    }}
                                    className="p-4 bg-[#141414]/5 border border-[#141414]/10 rounded-xl hover:bg-[#141414] hover:text-white transition-all text-left"
                                  >
                                    <p className="font-bold">{team.name}</p>
                                    <p className="text-[10px] opacity-50 uppercase font-mono">
                                      PS: {problemStatements.find(p => p.id === team.problem_statement_id)?.title}
                                    </p>
                                  </button>
                                ))}
                                
                                {evaluatedTeams.length > 0 && (
                                  <div className="col-span-full mt-4">
                                    <button 
                                      onClick={() => setShowEvaluatedTeams(!showEvaluatedTeams)}
                                      className="flex items-center gap-2 text-xs font-mono uppercase opacity-50 hover:opacity-100 transition-opacity w-full border-b border-[#141414]/10 pb-2 mb-2"
                                    >
                                      <ChevronRight className={`w-4 h-4 transition-transform ${showEvaluatedTeams ? "rotate-90" : ""}`} />
                                      Evaluated Teams ({evaluatedTeams.length})
                                    </button>
                                    
                                    {showEvaluatedTeams && (
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                                        {evaluatedTeams.map(team => (
                                          <button
                                            key={team.id}
                                            onClick={() => {
                                              setSelectedTeam(team.id);
                                              setEvalStep("round");
                                            }}
                                            className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl hover:bg-emerald-500 hover:text-white transition-all text-left"
                                          >
                                            <div className="flex justify-between items-start">
                                              <p className="font-bold">{team.name}</p>
                                              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                            </div>
                                            <p className="text-[10px] opacity-50 uppercase font-mono">
                                              PS: {problemStatements.find(p => p.id === team.problem_statement_id)?.title}
                                            </p>
                                          </button>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </>
                            );
                          })()}
                        </div>
                        {teams.filter(t => t.problem_statement_id).length === 0 && (
                          <div className="text-center py-8 opacity-50 italic">
                            No teams have problem statements assigned yet.
                          </div>
                        )}
                        <button 
                          onClick={() => setEvalStep("evaluator")}
                          className="text-xs font-mono uppercase opacity-50 hover:opacity-100 transition-opacity"
                        >
                          ← Back to Evaluator
                        </button>
                      </div>
                    )}

                    {evalStep === "round" && (
                      <div className="space-y-4 flex-1">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center flex-1">
                          {rounds.filter(r => r.is_active).length === 0 && (
                            <div className="col-span-full text-center py-8 opacity-50 italic">
                              No active rounds. Please contact the administrator.
                            </div>
                          )}
                          {rounds.filter(r => r.is_active).map(round => (
                            <button
                              key={round.id}
                              onClick={() => {
                                setSelectedRound(round.id);
                                const existingEval = evaluations.find(e => 
                                  e.team_id === selectedTeam && 
                                  e.round_id === round.id && 
                                  e.evaluator_id === selectedEvaluator
                                );
                                if (existingEval) {
                                  try {
                                    const parsedScores = typeof existingEval.scores === 'string' 
                                      ? JSON.parse(existingEval.scores) 
                                      : existingEval.scores;
                                    setScores(parsedScores);
                                    setFeedback(existingEval.feedback || "");
                                  } catch (e) {
                                    console.error("Error parsing scores:", e);
                                    setScores({});
                                    setFeedback("");
                                  }
                                } else {
                                  setScores({});
                                  setFeedback("");
                                }
                                setEvalStep("score");
                              }}
                              className="p-6 bg-[#141414]/5 border border-[#141414]/10 rounded-2xl hover:bg-[#141414] hover:text-white transition-all group"
                            >
                              <div className="w-10 h-10 bg-[#141414]/10 rounded-lg flex items-center justify-center font-mono font-bold mx-auto mb-4 group-hover:bg-white/20">
                                0{round.sequence}
                              </div>
                              <p className="font-bold text-center text-sm">{round.name}</p>
                            </button>
                          ))}
                        </div>
                        <button 
                          onClick={() => setEvalStep("team")}
                          className="text-xs font-mono uppercase opacity-50 hover:opacity-100 transition-opacity"
                        >
                          ← Back to Team
                        </button>
                      </div>
                    )}

                    {evalStep === "score" && (
                      <form onSubmit={handleSubmit} className="space-y-8 flex-1">
                        <div className="space-y-6">
                          <div className="grid grid-cols-1 gap-4">
                            {parameters.map((param) => (
                              <div key={param.id} className="flex items-center justify-between p-4 bg-[#141414]/5 rounded-2xl border border-[#141414]/5">
                                <div className="flex-1">
                                  <span className="font-bold text-sm block">{param.name}</span>
                                  <span className="text-[10px] font-mono uppercase opacity-50">Max Score: {param.max_score}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                  <input 
                                    type="number"
                                    min="0"
                                    max={param.max_score}
                                    required
                                    value={scores[param.id] || ""}
                                    onChange={(e) => handleScoreChange(param.id, Number(e.target.value))}
                                    className="w-20 p-3 bg-white border border-[#141414]/10 rounded-xl text-center font-bold focus:ring-2 ring-[#141414]/20 outline-none transition-all"
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] font-mono uppercase opacity-50">Feedback & Observations</label>
                          <textarea 
                            value={feedback}
                            onChange={(e) => setFeedback(e.target.value)}
                            placeholder="What stood out? Any technical concerns?"
                            className="w-full p-4 bg-[#141414]/5 border border-[#141414]/10 rounded-2xl h-24 focus:ring-2 ring-[#141414]/20 outline-none transition-all resize-none"
                          />
                        </div>

                        <div className="pt-6 border-t border-[#141414]/10 flex flex-col sm:flex-row items-center justify-between bg-white/50 -mx-4 md:-mx-8 px-4 md:px-8 mt-auto sticky bottom-0 backdrop-blur-sm py-4 gap-4">
                          <div className="text-center sm:text-left">
                            <p className="text-[10px] font-mono uppercase opacity-50">Grand Total</p>
                            <p className="text-2xl md:text-4xl font-bold">
                              {calculateTotal()}
                              <span className="text-sm md:text-lg opacity-30 font-normal ml-2">/ {parameters.reduce((a, b) => a + b.max_score, 0)}</span>
                            </p>
                          </div>
                          <div className="flex gap-2 md:gap-4 w-full sm:w-auto">
                            {evaluations.some(e => 
                              e.team_id === selectedTeam && 
                              e.round_id === selectedRound && 
                              e.evaluator_id === selectedEvaluator
                            ) && (
                              <button 
                                type="button"
                                onClick={handleDeleteEvaluation}
                                disabled={isSubmitting}
                                className="flex-1 sm:flex-none px-4 md:px-6 py-3 md:py-4 rounded-xl md:rounded-2xl font-bold border border-red-500/20 text-red-500 hover:bg-red-500/10 transition-all text-sm md:text-base"
                              >
                                Delete
                              </button>
                            )}
                            <button 
                              type="button"
                              onClick={() => setEvalStep("round")}
                              className="flex-1 sm:flex-none px-4 md:px-6 py-3 md:py-4 rounded-xl md:rounded-2xl font-bold border border-[#141414]/10 hover:bg-[#141414]/5 transition-all text-sm md:text-base"
                            >
                              Back
                            </button>
                            <button 
                              type="submit"
                              disabled={isSubmitting}
                              className="flex-[2] sm:flex-none bg-[#141414] text-white px-6 md:px-10 py-3 md:py-4 rounded-xl md:rounded-2xl font-bold hover:opacity-90 disabled:opacity-30 transition-all flex items-center justify-center gap-2 md:gap-3 text-sm md:text-base"
                            >
                              {isSubmitting ? "..." : (
                                <>
                                  Finish <ChevronRight className="w-4 h-4 md:w-5 md:h-5" />
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </form>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {view === "history" && (
              <motion.div 
                key="history"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <h2 className="text-xl md:text-3xl font-bold italic font-serif">Evaluation History</h2>
                  <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                    <input 
                      type="text"
                      placeholder="Search teams..."
                      value={historySearchQuery}
                      onChange={(e) => setHistorySearchQuery(e.target.value)}
                      className="w-full sm:w-48 md:w-64 pl-4 pr-4 py-2 bg-white border border-[#141414]/10 rounded-xl outline-none focus:ring-2 ring-[#141414]/20 transition-all text-xs"
                    />
                    <div className="flex gap-2">
                      <select 
                        value={historyJudgeFilter}
                        onChange={(e) => setHistoryJudgeFilter(e.target.value === "all" ? "all" : Number(e.target.value))}
                        className="flex-1 px-3 py-2 bg-white border border-[#141414]/10 rounded-xl outline-none focus:ring-2 ring-[#141414]/20 transition-all text-[10px] font-mono uppercase"
                      >
                        <option value="all">All Judges</option>
                        {evaluators.map(ev => (
                          <option key={ev.id} value={ev.id}>{ev.name}</option>
                        ))}
                      </select>
                      <select 
                        value={historyPSFilter}
                        onChange={(e) => setHistoryPSFilter(e.target.value === "all" ? "all" : Number(e.target.value))}
                        className="flex-1 px-3 py-2 bg-white border border-[#141414]/10 rounded-xl outline-none focus:ring-2 ring-[#141414]/20 transition-all text-[10px] font-mono uppercase"
                      >
                        <option value="all">All PS</option>
                        {problemStatements.map(ps => (
                          <option key={ps.id} value={ps.id}>{ps.title}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6">
                  {evaluations
                    .filter(e => {
                      const matchesSearch = e.team_name?.toLowerCase().includes(historySearchQuery.toLowerCase());
                      const matchesJudge = historyJudgeFilter === "all" || e.evaluator_id === historyJudgeFilter;
                      const matchesPS = historyPSFilter === "all" || e.problem_statement_id === historyPSFilter;
                      return matchesSearch && matchesJudge && matchesPS;
                    })
                    .length === 0 ? (
                    <div className="bg-white p-12 border border-[#141414]/10 rounded-3xl text-center space-y-4">
                      <div className="w-16 h-16 bg-[#141414]/5 rounded-full flex items-center justify-center mx-auto">
                        <AlertCircle className="w-8 h-8 opacity-20" />
                      </div>
                      <p className="opacity-50 font-mono uppercase text-sm">No matching evaluations found</p>
                    </div>
                  ) : (
                    evaluations
                      .filter(e => {
                        const matchesSearch = e.team_name?.toLowerCase().includes(historySearchQuery.toLowerCase());
                        const matchesJudge = historyJudgeFilter === "all" || e.evaluator_id === historyJudgeFilter;
                        const matchesPS = historyPSFilter === "all" || e.problem_statement_id === historyPSFilter;
                        return matchesSearch && matchesJudge && matchesPS;
                      })
                      .map((evalItem) => (
                      <div key={evalItem.id} className="bg-white border border-[#141414]/10 rounded-3xl overflow-hidden flex flex-col md:flex-row">
                        <div className="p-6 md:p-8 bg-[#141414] text-white md:w-64 flex flex-row md:flex-col justify-between items-center md:items-start relative overflow-hidden">
                          <div className={`absolute top-0 right-0 w-32 h-32 blur-3xl opacity-20 -mr-16 -mt-16 rounded-full`} style={{ backgroundColor: VIBRANT_COLORS[evalItem.id % VIBRANT_COLORS.length] }} />
                          <div className="relative z-10">
                            <p className="text-[10px] font-mono uppercase opacity-50 mb-1">Score</p>
                            <p className="text-3xl md:text-5xl font-bold" style={{ color: VIBRANT_COLORS[evalItem.id % VIBRANT_COLORS.length] }}>{evalItem.total_score}</p>
                          </div>
                          <div className="mt-0 md:mt-8 relative z-10 text-right md:text-left">
                            <p className="text-[10px] font-mono uppercase opacity-50 mb-1">Date</p>
                            <p className="text-[10px] md:text-xs font-mono">
                              {evalItem.created_at ? new Date(evalItem.created_at).toLocaleDateString() : "N/A"}
                            </p>
                          </div>
                        </div>
                        <div className="p-6 md:p-8 flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                          <div className="space-y-4">
                            <div>
                              <p className="text-[10px] font-mono uppercase opacity-50 mb-1">Team</p>
                              <p className="text-xl font-bold">{evalItem.team_name}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-mono uppercase opacity-50 mb-1">Round</p>
                              <p className="font-bold text-[#141414]/70">{evalItem.round_name}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-mono uppercase opacity-50 mb-1">Evaluator</p>
                              <p className="font-bold text-[#141414]/70">{evalItem.evaluator_name}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-mono uppercase opacity-50 mb-1">Problem Statement</p>
                              <p className="text-sm italic">{evalItem.ps_title}</p>
                            </div>
                            {(user.role === "admin" || (user.role === "judge" && user.evaluator_id === evalItem.evaluator_id)) && (
                              <div className="flex gap-2 mt-4">
                                <button
                                  onClick={() => {
                                    setSelectedEvaluator(evalItem.evaluator_id);
                                    setSelectedTeam(evalItem.team_id);
                                    setSelectedRound(evalItem.round_id);
                                    try {
                                      const parsedScores = typeof evalItem.scores === 'string' 
                                        ? JSON.parse(evalItem.scores) 
                                        : evalItem.scores;
                                      setScores(parsedScores);
                                      setFeedback(evalItem.feedback || "");
                                    } catch (e) {
                                      console.error("Error parsing scores:", e);
                                      setScores({});
                                      setFeedback("");
                                    }
                                    setView("evaluate");
                                    setEvalStep("score");
                                  }}
                                  className="px-3 py-1.5 bg-[#141414] text-white text-[10px] font-bold uppercase rounded-lg hover:opacity-80 transition-opacity"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => {
                                    if (evalItem.id) {
                                      setDeleteConfirmation({
                                        isOpen: true,
                                        evalId: evalItem.id,
                                        teamName: evalItem.team_name || "Unknown Team"
                                      });
                                    }
                                  }}
                                  className="px-3 py-1.5 border border-red-500 text-red-500 text-[10px] font-bold uppercase rounded-lg hover:bg-red-50 transition-colors"
                                >
                                  Delete
                                </button>
                              </div>
                            )}
                          </div>
                          <div className="space-y-4">
                            <div>
                              <p className="text-[10px] font-mono uppercase opacity-50 mb-1">Judge Feedback</p>
                              <p className="text-sm leading-relaxed opacity-80">
                                {evalItem.feedback || "No feedback provided."}
                              </p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {Object.entries(JSON.parse(String(evalItem.scores))).map(([id, score]) => {
                                const param = parameters.find(p => p.id === Number(id));
                                return (
                                  <div key={id} className="text-[10px] font-mono uppercase bg-[#141414]/5 px-2 py-1 rounded-md border border-[#141414]/10">
                                    {param?.name}: {score as number}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            )}
            {view === "analytics" && (
              <motion.div 
                key="analytics"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8"
              >
                <div className="flex justify-between items-center">
                  <h2 className="text-xl md:text-3xl font-bold italic font-serif">Analytics & Leaderboard</h2>
                </div>

                {/* Leaderboards Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-8">
                  {/* Individual Rounds Leaderboard */}
                  <div className="bg-white border border-[#141414]/10 rounded-3xl p-6 md:p-8 space-y-6">
                    <div className="flex items-center gap-3">
                      <Medal className="w-5 h-5 md:w-6 md:h-6 text-amber-500" />
                      <h3 className="text-lg md:text-xl font-bold italic font-serif">Round Leaderboards</h3>
                    </div>
                    
                    <div className="space-y-8">
                      {rounds.map(round => {
                        const roundLeaderboard = teams.map(team => {
                          const teamEvals = evaluations.filter(e => e.team_id === team.id && e.round_id === round.id);
                          const totalScore = teamEvals.reduce((sum, e) => sum + (e.total_score || 0), 0);
                          return { name: team.name, score: totalScore };
                        })
                        .filter(t => t.score > 0)
                        .sort((a, b) => b.score - a.score)
                        .slice(0, 5);

                        return (
                          <div key={round.id} className="space-y-4">
                            <p className="text-xs font-mono uppercase opacity-50 border-b border-[#141414]/10 pb-2">{round.name}</p>
                            {roundLeaderboard.length === 0 ? (
                              <p className="text-xs italic opacity-40">No evaluations yet.</p>
                            ) : (
                              <div className="space-y-2">
                                {roundLeaderboard.map((entry, idx) => (
                                  <div key={entry.name} className="flex justify-between items-center p-3 bg-[#141414]/5 rounded-xl border-l-4 border-l-indigo-500">
                                    <div className="flex items-center gap-3">
                                      <span className={`text-[10px] font-mono font-bold w-4 ${idx === 0 ? 'text-amber-500' : idx === 1 ? 'text-slate-400' : idx === 2 ? 'text-amber-700' : 'opacity-40'}`}>
                                        {idx + 1}.
                                      </span>
                                      <span className="text-sm font-bold">{entry.name}</span>
                                    </div>
                                    <span className="text-sm font-mono font-bold text-indigo-600">{entry.score} pts</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Overall Leaderboard */}
                  <div className="bg-[#141414] text-white border border-[#141414]/10 rounded-3xl p-6 md:p-8 space-y-6">
                    <div className="flex items-center gap-3">
                      <Trophy className="w-5 h-5 md:w-6 md:h-6 text-amber-400" />
                      <h3 className="text-lg md:text-xl font-bold italic font-serif">Overall Standings</h3>
                    </div>

                    <div className="space-y-4">
                      {teams.map(team => {
                        const teamEvals = evaluations.filter(e => e.team_id === team.id);
                        const totalScore = teamEvals.reduce((sum, e) => sum + (e.total_score || 0), 0);
                        return { name: team.name, score: totalScore };
                      })
                      .filter(t => t.score > 0)
                      .sort((a, b) => b.score - a.score)
                      .slice(0, 10)
                      .map((entry, idx) => (
                        <div key={entry.name} className="flex justify-between items-center p-4 bg-white/10 rounded-2xl border border-white/5 group hover:bg-white/20 transition-all relative overflow-hidden">
                          <div className="absolute left-0 top-0 w-1 h-full" style={{ backgroundColor: VIBRANT_COLORS[idx % VIBRANT_COLORS.length] }} />
                          <div className="flex items-center gap-4">
                            <span className={`text-xl font-serif italic`} style={{ color: idx < 3 ? VIBRANT_COLORS[idx] : 'rgba(255,255,255,0.3)' }}>
                              {idx + 1 < 10 ? `0${idx + 1}` : idx + 1}
                            </span>
                            <span className="font-bold">{entry.name}</span>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold font-serif" style={{ color: VIBRANT_COLORS[idx % VIBRANT_COLORS.length] }}>{entry.score}</p>
                            <p className="text-[8px] font-mono uppercase opacity-40">Total Points</p>
                          </div>
                        </div>
                      ))}
                      {evaluations.length === 0 && (
                        <div className="text-center py-12 opacity-30 italic">
                          Waiting for first evaluations...
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Visuals Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-8">
                  {/* PS Distribution */}
                  <div className="bg-white border border-[#141414]/10 rounded-3xl p-6 md:p-8 space-y-6">
                    <div className="flex items-center gap-3">
                      <PieChartIcon className="w-5 h-5 md:w-6 md:h-6 opacity-50" />
                      <h3 className="text-lg md:text-xl font-bold italic font-serif">PS Distribution</h3>
                    </div>
                    <div className="h-[250px] md:h-[300px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={problemStatements.map(ps => ({
                              name: ps.title,
                              value: teams.filter(t => t.problem_statement_id === ps.id).length
                            })).filter(d => d.value > 0)}
                            cx="50%"
                            cy="50%"
                            innerRadius={40}
                            outerRadius={60}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {problemStatements.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={VIBRANT_COLORS[index % VIBRANT_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip 
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                            itemStyle={{ fontSize: '10px', fontWeight: 'bold' }}
                          />
                          <Legend verticalAlign="bottom" height={36} iconSize={10} wrapperStyle={{ fontSize: '10px' }}/>
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Score Distribution */}
                  <div className="bg-white border border-[#141414]/10 rounded-3xl p-6 md:p-8 space-y-6">
                    <div className="flex items-center gap-3">
                      <BarChart3 className="w-5 h-5 md:w-6 md:h-6 opacity-50" />
                      <h3 className="text-lg md:text-xl font-bold italic font-serif">Avg Score per Round</h3>
                    </div>
                    <div className="h-[250px] md:h-[300px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={rounds.map(r => {
                          const roundEvals = evaluations.filter(e => e.round_id === r.id);
                          const avg = roundEvals.length > 0 
                            ? roundEvals.reduce((sum, e) => sum + (e.total_score || 0), 0) / roundEvals.length
                            : 0;
                          return { name: `R${r.sequence}`, avg: Number(avg.toFixed(1)) };
                        })}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#14141410" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 8, fontFamily: 'monospace' }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 8, fontFamily: 'monospace' }} />
                          <Tooltip 
                            cursor={{ fill: '#14141405' }}
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                          />
                          <Bar dataKey="avg" radius={[4, 4, 0, 0]} barSize={30}>
                            {rounds.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={VIBRANT_COLORS[index % VIBRANT_COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                {/* Detailed PS Assignments */}
                <div className="bg-white border border-[#141414]/10 rounded-3xl p-8 space-y-6">
                  <div className="flex items-center gap-3">
                    <LayoutDashboard className="w-6 h-6 opacity-50" />
                    <h3 className="text-xl font-bold italic font-serif">Team Assignments by Problem Statement</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {problemStatements.map(ps => {
                      const psTeams = teams.filter(t => t.problem_statement_id === ps.id);
                      if (psTeams.length === 0) return null;
                      return (
                        <div key={ps.id} className="p-6 bg-[#141414]/5 rounded-2xl border border-[#141414]/5 space-y-4">
                          <div className="border-b border-[#141414]/10 pb-2">
                            <p className="font-bold text-sm">{ps.title}</p>
                            <p className="text-[9px] font-mono uppercase opacity-40">{ps.theme}</p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {psTeams.map(team => (
                              <span key={team.id} className="text-[10px] font-mono bg-white border border-[#141414]/10 px-2 py-1 rounded-md">
                                {team.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}
            {view === "settings" && (
              <motion.div 
                key="settings"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="max-w-2xl mx-auto space-y-8"
              >
                <div className="bg-white border border-[#141414]/10 rounded-3xl p-6 md:p-8 space-y-6">
                  <h2 className="text-xl md:text-2xl font-bold italic font-serif">Manage Rounds</h2>
                  <form onSubmit={handleAddRound} className="flex flex-col sm:flex-row gap-3">
                    <input 
                      type="text"
                      required
                      placeholder="Round Name"
                      value={newRoundName}
                      onChange={(e) => setNewRoundName(e.target.value)}
                      className="flex-1 p-3 bg-[#141414]/5 border border-[#141414]/10 rounded-xl outline-none text-sm"
                    />
                    <div className="flex gap-3">
                      <input 
                        type="number"
                        required
                        placeholder="Seq"
                        value={newRoundSeq}
                        onChange={(e) => setNewRoundSeq(Number(e.target.value))}
                        className="w-20 p-3 bg-[#141414]/5 border border-[#141414]/10 rounded-xl outline-none text-sm"
                      />
                      <button type="submit" className="flex-1 sm:flex-none bg-[#141414] text-white px-6 py-3 rounded-xl font-bold hover:opacity-90 text-sm">
                        Add
                      </button>
                    </div>
                  </form>

                  <div className="space-y-2">
                    {rounds.map(r => (
                      <div key={r.id} className="flex justify-between items-center p-4 bg-[#141414]/5 rounded-xl">
                        <div>
                          <p className="font-bold">{r.name}</p>
                          <p className="text-xs font-mono opacity-50">Sequence: {r.sequence}</p>
                        </div>
                        <button
                          onClick={() => handleToggleRoundActive(r.id, r.is_active)}
                          className={`px-4 py-2 rounded-lg text-xs font-bold font-mono uppercase transition-all ${
                            r.is_active 
                              ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" 
                              : "bg-white border border-[#141414]/10 text-[#141414]/50 hover:bg-[#141414]/5"
                          }`}
                        >
                          {r.is_active ? "Active" : "Inactive"}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-[#141414] text-white p-8 rounded-3xl space-y-4">
                  <h2 className="text-2xl font-bold italic font-serif">Hackathon Info</h2>
                  <div className="space-y-2 opacity-70">
                    <p><strong>Name:</strong> NM Hacks 2026</p>
                    <p><strong>Evaluators:</strong> {evaluators.map(e => e.name).join(", ")}</p>
                    <p><strong>Teams:</strong> {teams.length} Registered</p>
                    <p><strong>Problem Statements:</strong> {problemStatements.length} Active</p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirmation.isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-[#141414]/10"
            >
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertCircle className="w-8 h-8 text-red-500" />
                </div>
                <h3 className="text-xl font-bold italic font-serif">Delete Evaluation?</h3>
                <p className="text-sm opacity-60">
                  Are you sure you want to delete the evaluation for <span className="font-bold text-[#141414]">{deleteConfirmation.teamName}</span>? This action cannot be undone.
                </p>
                <div className="flex gap-3 w-full pt-4">
                  <button
                    onClick={() => setDeleteConfirmation({ isOpen: false, evalId: null, teamName: "" })}
                    className="flex-1 py-3 rounded-xl font-bold border border-[#141414]/10 hover:bg-[#141414]/5 transition-all text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmDelete}
                    disabled={isSubmitting}
                    className="flex-1 py-3 rounded-xl font-bold bg-red-500 text-white hover:bg-red-600 transition-all text-sm flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer / Status Bar */}
      <footer className="fixed bottom-0 left-20 right-0 h-10 bg-white border-t border-[#141414]/10 flex items-center px-8 justify-between z-40">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-[10px] font-mono uppercase opacity-50">System Online</span>
          </div>
          <span className="text-[10px] font-mono uppercase opacity-20">|</span>
          <span className="text-[10px] font-mono uppercase opacity-50">v1.0.4-stable</span>
        </div>
        <div className="text-[10px] font-mono uppercase opacity-50">
          © 2026 HackEval Systems Inc.
        </div>
      </footer>
    </div>
  );
}
