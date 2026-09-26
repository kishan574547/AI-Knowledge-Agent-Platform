import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GitMerge,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  FileText,
  Brain,
  ShieldCheck,
  FileCheck,
  Trash2,
  Copy,
  Check,
  ListTodo,
  Layers,
  History,
} from 'lucide-react';
import {
  researchService,
  ResearchSession,
} from '../services/researchService';

const AGENT_STAGES = [
  { id: 'planner', label: 'Research Planner', icon: ListTodo, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  { id: 'retriever', label: 'Retrieval Agent', icon: Search, color: 'text-amber-500', bg: 'bg-amber-500/10' },
  { id: 'analyzer', label: 'Analysis Agent', icon: Brain, color: 'text-purple-500', bg: 'bg-purple-500/10' },
  { id: 'verifier', label: 'Verification Agent', icon: ShieldCheck, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  { id: 'writer', label: 'Report Writer', icon: FileCheck, color: 'text-cyan-500', bg: 'bg-cyan-500/10' },
];

const PRESET_PROMPTS = [
  'Compare key architectural tradeoffs and limitations in my documents.',
  'Synthesize performance benchmarks, latency numbers, and hardware requirements.',
  'Analyze security safeguards, data isolation models, and compliance mechanisms.',
];

export const MultiAgentResearchPage: React.FC = () => {
  const [query, setQuery] = useState('');
  const [activeSession, setActiveSession] = useState<ResearchSession | null>(null);
  const [sessions, setSessions] = useState<ResearchSession[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'report' | 'verification' | 'analysis' | 'sources' | 'plan' | 'logs'>('report');
  const [copied, setCopied] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const pollIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    loadSessions();
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  const loadSessions = async () => {
    try {
      const res = await researchService.listSessions(0, 30);
      setSessions(res.items || []);
      if (res.items && res.items.length > 0 && !activeSession) {
        setActiveSession(res.items[0]);
      }
    } catch (err) {
      console.error('Failed to load research history:', err);
    }
  };

  const handleStartResearch = async (promptQuery?: string) => {
    const q = (promptQuery || query).trim();
    if (!q || isLoading) return;

    setIsLoading(true);
    try {
      const newSession = await researchService.startResearch(q);
      setActiveSession(newSession);
      setSessions((prev) => [newSession, ...prev.filter((s) => s.id !== newSession.id)]);
      setQuery('');
      setActiveTab('report');
    } catch (err: any) {
      console.error('Failed to run multi-agent research:', err);
      alert(err.message || 'Error running research workflow');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteSession = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await researchService.deleteSession(id);
      setSessions((prev) => prev.filter((s) => s.id !== id));
      if (activeSession?.id === id) {
        const remaining = sessions.filter((s) => s.id !== id);
        setActiveSession(remaining.length > 0 ? remaining[0] : null);
      }
    } catch (err) {
      console.error('Failed to delete research session:', err);
    }
  };

  const handleCopyMarkdown = () => {
    if (!activeSession?.final_report?.markdown_content) return;
    navigator.clipboard.writeText(activeSession.final_report.markdown_content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getStageStatus = (stageId: string) => {
    if (!activeSession) return 'pending';
    if (activeSession.status === 'completed') return 'completed';
    if (activeSession.status === 'failed') {
      return activeSession.failed_agent?.toLowerCase().includes(stageId) ? 'failed' : 'completed';
    }
    const map: Record<string, string> = {
      planner: 'planning',
      retriever: 'retrieving',
      analyzer: 'analyzing',
      verifier: 'verifying',
      writer: 'writing',
    };
    const currentActiveStage = map[stageId];
    if (activeSession.status === currentActiveStage) return 'running';
    
    // Check if subsequent stage has completed
    const stageOrder = ['planner', 'retriever', 'analyzer', 'verifier', 'writer'];
    const activeIndex = stageOrder.findIndex((s) => map[s] === activeSession.status);
    const thisIndex = stageOrder.indexOf(stageId);
    if (activeIndex > thisIndex) return 'completed';
    return 'pending';
  };

  return (
    <div className="flex h-full w-full bg-surface-2 overflow-hidden">
      {/* ─── MAIN CONTENT ─────────────────────────────────── */}
      <div className="flex-1 flex flex-col h-full overflow-y-auto p-4 md:p-6 lg:p-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
                <GitMerge className="w-4 h-4" />
              </div>
              <h1 className="font-heading text-xl md:text-2xl font-bold text-text-main">
                Multi-Agent Research System
              </h1>
            </div>
            <p className="text-xs md:text-sm text-text-muted mt-1">
              Autonomous orchestration across 5 specialized agents: Planner, Retriever, Analyzer, Verifier & Report Writer.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-surface border border-border text-text-main hover:bg-surface-2 transition-colors shadow-sm"
            >
              <History className="w-3.5 h-3.5 text-accent" />
              Research History ({sessions.length})
            </button>
          </div>
        </div>

        {/* Query Input Box */}
        <div className="p-4 md:p-5 rounded-2xl bg-surface border border-border shadow-sm space-y-3">
          <label className="block text-xs font-bold text-text-main uppercase tracking-wider">
            Research Topic or Complex Investigation
          </label>
          <div className="relative">
            <textarea
              rows={3}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. Compare the deployment architectures, retrieval mechanisms, and latency tradeoffs across my uploaded documents..."
              disabled={isLoading}
              className="w-full text-xs md:text-sm p-3.5 rounded-xl bg-surface-2 border border-border focus:border-accent focus:ring-1 focus:ring-accent outline-none text-text-main placeholder:text-text-muted resize-none transition-all"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  handleStartResearch();
                }
              }}
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-medium text-text-muted flex items-center gap-1 mr-1">
                <Sparkles className="w-3 h-3 text-accent" /> Presets:
              </span>
              {PRESET_PROMPTS.map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => handleStartResearch(prompt)}
                  disabled={isLoading}
                  className="text-[11px] px-2.5 py-1 rounded-md bg-surface-2 hover:bg-accent/10 hover:text-accent border border-border text-text-muted transition-colors truncate max-w-[260px] text-left"
                >
                  {prompt}
                </button>
              ))}
            </div>

            <button
              onClick={() => handleStartResearch()}
              disabled={isLoading || !query.trim()}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs text-white bg-accent hover:opacity-95 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm ml-auto"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Running Agents...
                </>
              ) : (
                <>
                  <GitMerge className="w-4 h-4" />
                  Start Multi-Agent Research
                </>
              )}
            </button>
          </div>
        </div>

        {/* ─── LIVE AGENT WORKFLOW VISUALIZER ─────────────── */}
        <div className="p-4 md:p-5 rounded-2xl bg-surface border border-border shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-text-main uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-accent" />
              Agent Workflow Pipeline
            </h2>
            {activeSession && (
              <span
                className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-full capitalize ${
                  activeSession.status === 'completed'
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                    : activeSession.status === 'failed'
                    ? 'bg-red-500/10 text-red-500 border border-red-500/20'
                    : 'bg-amber-500/10 text-amber-500 border border-amber-500/20 animate-pulse'
                }`}
              >
                {activeSession.status}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
            {AGENT_STAGES.map((stage, idx) => {
              const status = getStageStatus(stage.id);
              const Icon = stage.icon;

              return (
                <div
                  key={stage.id}
                  className={`relative p-3.5 rounded-xl border transition-all flex flex-col justify-between gap-2 ${
                    status === 'running'
                      ? 'border-accent bg-accent/5 shadow-md shadow-accent/5 ring-1 ring-accent'
                      : status === 'completed'
                      ? 'border-emerald-500/30 bg-emerald-500/5'
                      : status === 'failed'
                      ? 'border-red-500/30 bg-red-500/5'
                      : 'border-border bg-surface-2 opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className={`w-7 h-7 rounded-lg ${stage.bg} flex items-center justify-center ${stage.color}`}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      {status === 'completed' && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                      {status === 'running' && (
                        <div className="w-3.5 h-3.5 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
                      )}
                      {status === 'failed' && <AlertCircle className="w-4 h-4 text-red-500" />}
                      {status === 'pending' && <Clock className="w-3.5 h-3.5 text-text-muted" />}
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] font-mono text-text-muted uppercase">Stage 0{idx + 1}</span>
                    <h3 className="text-xs font-bold text-text-main truncate">{stage.label}</h3>
                  </div>

                  <div className="text-[10px] font-medium capitalize flex items-center gap-1">
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        status === 'completed'
                          ? 'bg-emerald-500'
                          : status === 'running'
                          ? 'bg-accent animate-ping'
                          : status === 'failed'
                          ? 'bg-red-500'
                          : 'bg-text-muted'
                      }`}
                    />
                    <span className="text-text-muted">{status}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ─── ARTIFACT TABS & DETAIL VIEW ────────────────── */}
        {activeSession ? (
          <div className="p-4 md:p-6 rounded-2xl bg-surface border border-border shadow-sm space-y-4">
            {/* Tab Navigation */}
            <div className="flex flex-wrap items-center gap-2 border-b border-border pb-3">
              {[
                { id: 'report', label: 'Final Report', icon: FileText, count: activeSession.final_report ? 1 : 0 },
                {
                  id: 'verification',
                  label: 'Verification Matrix',
                  icon: ShieldCheck,
                  count: activeSession.verification?.verified_claims?.length || 0,
                },
                {
                  id: 'analysis',
                  label: 'Evidence Categorization',
                  icon: Brain,
                  count: (activeSession.analysis?.facts?.length || 0) + (activeSession.analysis?.inferences?.length || 0),
                },
                {
                  id: 'sources',
                  label: 'Retrieved Sources',
                  icon: Search,
                  count: activeSession.retrieved_sources?.length || 0,
                },
                {
                  id: 'plan',
                  label: 'Research Plan',
                  icon: ListTodo,
                  count: activeSession.plan?.length || 0,
                },
                {
                  id: 'logs',
                  label: 'Agent Logs',
                  icon: Clock,
                  count: activeSession.execution_log?.length || 0,
                },
              ].map((tab) => {
                const TabIcon = tab.icon;
                const isActive = activeTab === tab.id;

                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                      isActive
                        ? 'bg-accent text-white shadow-sm'
                        : 'bg-surface-2 text-text-muted hover:text-text-main hover:bg-border/60'
                    }`}
                  >
                    <TabIcon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                    {tab.count > 0 && (
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                          isActive ? 'bg-white/20 text-white' : 'bg-surface text-text-muted'
                        }`}
                      >
                        {tab.count}
                      </span>
                    )}
                  </button>
                );
              })}

              {activeTab === 'report' && activeSession.final_report?.markdown_content && (
                <button
                  onClick={handleCopyMarkdown}
                  className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-surface-2 hover:bg-border/60 text-text-main border border-border transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copied' : 'Copy Markdown'}
                </button>
              )}
            </div>

            {/* TAB CONTENT: FINAL REPORT */}
            {activeTab === 'report' && (
              <div className="space-y-6 pt-2">
                {activeSession.final_report ? (
                  <div className="space-y-6">
                    {/* Executive Summary */}
                    <div className="p-4 rounded-xl bg-surface-2 border border-border space-y-2">
                      <h3 className="text-xs font-bold text-accent uppercase tracking-wider">Executive Summary</h3>
                      <p className="text-xs md:text-sm text-text-main leading-relaxed whitespace-pre-line">
                        {activeSession.final_report.executive_summary}
                      </p>
                    </div>

                    {/* Key Findings Grid */}
                    {activeSession.final_report.key_findings && activeSession.final_report.key_findings.length > 0 && (
                      <div className="space-y-3">
                        <h3 className="text-xs font-bold text-text-main uppercase tracking-wider">Key Findings</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {activeSession.final_report.key_findings.map((f, i) => (
                            <div key={i} className="p-3.5 rounded-xl bg-surface-2 border border-border space-y-1.5">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                                  {f.status || 'VERIFIED'}
                                </span>
                                {f.source && (
                                  <span className="text-[10px] text-text-muted truncate max-w-[180px]">
                                    Source: {f.source}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-text-main font-medium leading-relaxed">{f.finding}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Detailed Analysis */}
                    {activeSession.final_report.detailed_analysis && (
                      <div className="space-y-2">
                        <h3 className="text-xs font-bold text-text-main uppercase tracking-wider">Detailed Analysis</h3>
                        <div className="p-4 rounded-xl bg-surface-2 border border-border text-xs md:text-sm text-text-main leading-relaxed whitespace-pre-line">
                          {activeSession.final_report.detailed_analysis}
                        </div>
                      </div>
                    )}

                    {/* Limitations & Data Gaps */}
                    {activeSession.final_report.limitations && activeSession.final_report.limitations.length > 0 && (
                      <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 space-y-2">
                        <h3 className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5" />
                          Research Limitations & Document Gaps
                        </h3>
                        <ul className="list-disc list-inside space-y-1 text-xs text-text-muted">
                          {activeSession.final_report.limitations.map((lim, i) => (
                            <li key={i}>{lim}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-12 text-text-muted text-xs">
                    Report compilation will appear here once the workflow completes.
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT: VERIFICATION MATRIX */}
            {activeTab === 'verification' && (
              <div className="space-y-3 pt-2">
                {activeSession.verification?.verified_claims && activeSession.verification.verified_claims.length > 0 ? (
                  activeSession.verification.verified_claims.map((claim, idx) => (
                    <div
                      key={idx}
                      className={`p-3.5 rounded-xl border space-y-2 ${
                        claim.status === 'VERIFIED'
                          ? 'bg-emerald-500/5 border-emerald-500/20'
                          : 'bg-red-500/5 border-red-500/20'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md ${
                            claim.status === 'VERIFIED'
                              ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                              : 'bg-red-500/20 text-red-500'
                          }`}
                        >
                          {claim.status}
                        </span>
                        {claim.supporting_source_ids && claim.supporting_source_ids.length > 0 && (
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-text-muted">Sources:</span>
                            {claim.supporting_source_ids.map((sid, i) => (
                              <span key={i} className="text-[10px] font-mono bg-surface px-1.5 py-0.5 rounded border border-border">
                                {sid}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <p className="text-xs font-semibold text-text-main">{claim.claim}</p>
                      {claim.notes && <p className="text-[11px] text-text-muted italic">{claim.notes}</p>}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 text-text-muted text-xs">No verification claims generated.</div>
                )}
              </div>
            )}

            {/* TAB CONTENT: EVIDENCE CATEGORIZATION */}
            {activeTab === 'analysis' && (
              <div className="space-y-4 pt-2">
                {/* Facts */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Direct Facts (Grounded in Documents)
                  </h4>
                  {activeSession.analysis?.facts && activeSession.analysis.facts.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                      {activeSession.analysis.facts.map((f, i) => (
                        <div key={i} className="p-3 rounded-xl bg-surface-2 border border-border space-y-1">
                          <p className="text-xs text-text-main font-medium">{f.statement}</p>
                          <p className="text-[10px] text-text-muted font-mono truncate">Doc: {f.source_citation}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-text-muted italic">No direct facts extracted.</p>
                  )}
                </div>

                {/* Inferences */}
                <div className="space-y-2 pt-2">
                  <h4 className="text-xs font-bold text-purple-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Brain className="w-3.5 h-3.5" /> Logical Inferences & Deductions
                  </h4>
                  {activeSession.analysis?.inferences && activeSession.analysis.inferences.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                      {activeSession.analysis.inferences.map((inf, i) => (
                        <div key={i} className="p-3 rounded-xl bg-surface-2 border border-border space-y-1">
                          <p className="text-xs text-text-main font-medium">{inf.deduction}</p>
                          {inf.premise_citations && (
                            <p className="text-[10px] text-text-muted font-mono truncate">
                              Premises: {inf.premise_citations.join(', ')}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-text-muted italic">No derived inferences.</p>
                  )}
                </div>

                {/* Insufficient Info */}
                {activeSession.analysis?.insufficient_info && activeSession.analysis.insufficient_info.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <h4 className="text-xs font-bold text-amber-500 uppercase tracking-wider flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5" /> Missing / Insufficient Information
                    </h4>
                    <div className="p-3.5 rounded-xl bg-amber-500/5 border border-amber-500/20 space-y-1">
                      <ul className="list-disc list-inside text-xs text-text-muted space-y-1">
                        {activeSession.analysis.insufficient_info.map((info, i) => (
                          <li key={i}>{info}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT: RETRIEVED SOURCES */}
            {activeTab === 'sources' && (
              <div className="space-y-3 pt-2">
                {activeSession.retrieved_sources && activeSession.retrieved_sources.length > 0 ? (
                  activeSession.retrieved_sources.map((src, i) => (
                    <div key={i} className="p-3.5 rounded-xl bg-surface-2 border border-border space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileText className="w-3.5 h-3.5 text-accent" />
                          <span className="text-xs font-bold text-text-main">{src.filename}</span>
                          {src.page_number && (
                            <span className="text-[10px] font-mono bg-surface px-1.5 py-0.5 rounded border border-border text-text-muted">
                              Page {src.page_number}
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md font-bold">
                          Sim: {src.similarity}
                        </span>
                      </div>
                      <p className="text-xs text-text-muted leading-relaxed font-mono bg-surface p-2.5 rounded-lg border border-border">
                        {src.content}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 text-text-muted text-xs">No sources retrieved yet.</div>
                )}
              </div>
            )}

            {/* TAB CONTENT: RESEARCH PLAN */}
            {activeTab === 'plan' && (
              <div className="space-y-3 pt-2">
                {activeSession.plan && activeSession.plan.length > 0 ? (
                  activeSession.plan.map((task, i) => (
                    <div key={i} className="p-3.5 rounded-xl bg-surface-2 border border-border space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono font-bold text-accent bg-accent/10 px-2 py-0.5 rounded-md">
                          {task.id}
                        </span>
                        <span className="text-[10px] text-text-muted font-mono">Query: {task.search_query}</span>
                      </div>
                      <h4 className="text-xs font-bold text-text-main">{task.description}</h4>
                      {task.rationale && <p className="text-[11px] text-text-muted">{task.rationale}</p>}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 text-text-muted text-xs">No research tasks generated.</div>
                )}
              </div>
            )}

            {/* TAB CONTENT: EXECUTION LOGS */}
            {activeTab === 'logs' && (
              <div className="space-y-2 pt-2">
                {activeSession.execution_log && activeSession.execution_log.length > 0 ? (
                  activeSession.execution_log.map((log, i) => (
                    <div key={i} className="p-2.5 rounded-xl bg-surface-2 border border-border flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-text-main">{log.agent}:</span>
                        <span className="text-text-muted">{log.details || log.status}</span>
                      </div>
                      <span className="text-[10px] font-mono text-text-muted">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 text-text-muted text-xs">No execution logs available.</div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl bg-surface border border-border space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent text-xl">
              🤖
            </div>
            <h3 className="text-sm font-bold text-text-main">Ready for Autonomous Multi-Agent Investigation</h3>
            <p className="text-xs text-text-muted max-w-md">
              Ask a question above or click one of the preset topics. The Planner, Retrieval, Analysis, Verification, and Writer agents will orchestrate automatically.
            </p>
          </div>
        )}
      </div>

      {/* ─── RESEARCH HISTORY SIDEBAR ─────────────────────── */}
      <AnimatePresence>
        {showHistory && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 320, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="h-full bg-surface border-l border-border flex flex-col shrink-0 overflow-hidden shadow-xl"
          >
            <div className="p-4 border-b border-border flex items-center justify-between shrink-0">
              <h3 className="text-xs font-bold text-text-main uppercase tracking-wider flex items-center gap-1.5">
                <History className="w-3.5 h-3.5 text-accent" />
                Past Sessions
              </h3>
              <button
                onClick={() => setShowHistory(false)}
                className="text-xs text-text-muted hover:text-text-main p-1 rounded-md"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {sessions.map((sess) => {
                const isSelected = activeSession?.id === sess.id;
                return (
                  <div
                    key={sess.id}
                    onClick={() => setActiveSession(sess)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all space-y-1.5 group ${
                      isSelected
                        ? 'bg-accent-muted border-accent'
                        : 'bg-surface-2 border-border hover:border-accent/40'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold text-text-muted">
                        {new Date(sess.created_at).toLocaleDateString()}
                      </span>
                      <button
                        onClick={(e) => handleDeleteSession(e, sess.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-text-muted hover:text-red-500 transition-opacity"
                        title="Delete session"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                    <p className="text-xs font-semibold text-text-main line-clamp-2">{sess.query}</p>
                    <span
                      className={`inline-block text-[9px] font-mono font-bold px-1.5 py-0.2 rounded capitalize ${
                        sess.status === 'completed'
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          : sess.status === 'failed'
                          ? 'bg-red-500/10 text-red-500'
                          : 'bg-amber-500/10 text-amber-500'
                      }`}
                    >
                      {sess.status}
                    </span>
                  </div>
                );
              })}

              {sessions.length === 0 && (
                <div className="text-center py-10 text-text-muted text-xs">No research history yet.</div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
