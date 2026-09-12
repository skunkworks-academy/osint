export const WORKSPACE_STORAGE_KEY = 'skunkworks-osint-analyst-workspace-v2';

/** Return an ISO timestamp for deterministic case records. */
export function isoNow() {
  return new Date().toISOString();
}

/** Create a stable analyst case identifier. */
export function makeCaseId(prefix = 'CASE') {
  const stamp = isoNow().replace(/\D/g, '').slice(0, 14);
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${prefix}-${stamp}-${suffix}`;
}

/** Create an empty investigation with structures used by every workspace interface. */
export function createInvestigation(overrides = {}) {
  const createdAt = isoNow();
  const id = overrides.id || makeCaseId();
  return {
    id,
    title: 'Untitled investigation',
    summary: '',
    status: 'Open',
    priority: 'P2',
    severity: 'Unknown',
    classification: 'Internal',
    owner: 'Analyst',
    tags: [],
    createdAt,
    updatedAt: createdAt,
    intelligenceRequirements: [],
    tasks: [],
    entities: [],
    observables: [],
    evidence: [],
    timeline: [],
    notes: '',
    hypotheses: [],
    findings: [],
    decisions: [],
    report: {
      executiveSummary: '',
      assessment: '',
      confidence: 'Medium',
      recommendations: '',
    },
    ...overrides,
  };
}

/** Return a workspace with one starter case so every page is immediately usable. */
export function createWorkspace() {
  const starter = createInvestigation({
    title: 'New analyst case',
    intelligenceRequirements: [
      {
        id: `IR-${Date.now()}-1`,
        question: 'What is known, what is assessed, and what remains unknown?',
        priority: 'P1',
        status: 'Open',
      },
    ],
  });
  return {
    version: 2,
    activeCaseId: starter.id,
    cases: [starter],
    watchlist: [],
    savedPivots: [],
    settings: {
      analystName: 'Analyst',
      organisation: 'Skunkworks Academy',
      defaultClassification: 'Internal',
    },
  };
}

/** Safely parse a persisted workspace, falling back to a fresh model. */
export function parseWorkspace(raw) {
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!parsed || !Array.isArray(parsed.cases)) return createWorkspace();
    if (!parsed.cases.length) return createWorkspace();
    const activeCaseId = parsed.cases.some((item) => item.id === parsed.activeCaseId)
      ? parsed.activeCaseId
      : parsed.cases[0].id;
    return {
      ...createWorkspace(),
      ...parsed,
      activeCaseId,
      cases: parsed.cases.map((item) => ({...createInvestigation({id: item.id}), ...item})),
    };
  } catch {
    return createWorkspace();
  }
}

/** Read the active investigation from a workspace. */
export function activeInvestigation(workspace) {
  return workspace?.cases?.find((item) => item.id === workspace.activeCaseId) ?? workspace?.cases?.[0] ?? null;
}

/** Replace the active case without mutating the original workspace. */
export function updateActiveInvestigation(workspace, patch) {
  const active = activeInvestigation(workspace);
  if (!active) return workspace;
  const updatedAt = isoNow();
  return {
    ...workspace,
    cases: workspace.cases.map((item) => item.id === active.id ? {...item, ...patch, updatedAt} : item),
  };
}

/** Add a new case and make it the active case. */
export function addInvestigation(workspace, overrides = {}) {
  const created = createInvestigation(overrides);
  return {...workspace, cases: [created, ...workspace.cases], activeCaseId: created.id};
}

/** Add a typed record to an array field on the active investigation. */
export function appendCaseRecord(workspace, field, record, prefix = 'REC') {
  const active = activeInvestigation(workspace);
  if (!active || !Array.isArray(active[field])) return workspace;
  const item = {
    id: record.id || `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
    createdAt: record.createdAt || isoNow(),
    ...record,
  };
  return updateActiveInvestigation(workspace, {[field]: [item, ...active[field]]});
}

/** Calculate case-level operational metrics for the dashboard. */
export function caseMetrics(caseData) {
  if (!caseData) return {entities: 0, evidence: 0, observables: 0, openTasks: 0, openRequirements: 0, findings: 0};
  return {
    entities: caseData.entities?.length ?? 0,
    evidence: caseData.evidence?.length ?? 0,
    observables: caseData.observables?.length ?? 0,
    openTasks: (caseData.tasks ?? []).filter((item) => item.status !== 'Done').length,
    openRequirements: (caseData.intelligenceRequirements ?? []).filter((item) => item.status !== 'Closed').length,
    findings: caseData.findings?.length ?? 0,
  };
}

/** Produce a defensibility-oriented completeness score, not a threat score. */
export function caseCompleteness(caseData) {
  if (!caseData) return 0;
  const checks = [
    Boolean(caseData.title && caseData.title !== 'Untitled investigation'),
    Boolean(caseData.summary?.trim()),
    (caseData.intelligenceRequirements?.length ?? 0) > 0,
    (caseData.entities?.length ?? 0) > 0,
    (caseData.evidence?.length ?? 0) > 0,
    (caseData.findings?.length ?? 0) > 0,
    Boolean(caseData.report?.assessment?.trim()),
    Boolean(caseData.report?.executiveSummary?.trim()),
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

/** Convert an investigation to a portable export envelope. */
export function exportEnvelope(workspace) {
  return {
    schema: 'skunkworks-osint-workspace/v2',
    exportedAt: isoNow(),
    activeCaseId: workspace.activeCaseId,
    workspace,
  };
}

/** Return a sorted event stream combining timeline, evidence, findings and decisions. */
export function unifiedTimeline(caseData) {
  if (!caseData) return [];
  const rows = [
    ...(caseData.timeline ?? []).map((item) => ({...item, kind: item.kind || 'event', timestamp: item.timestamp || item.createdAt})),
    ...(caseData.evidence ?? []).map((item) => ({id: item.id, kind: 'evidence', title: item.title || item.source || 'Evidence captured', detail: item.summary || '', timestamp: item.capturedAt || item.createdAt})),
    ...(caseData.findings ?? []).map((item) => ({id: item.id, kind: 'finding', title: item.title || 'Analytical finding', detail: item.assessment || item.summary || '', timestamp: item.createdAt})),
    ...(caseData.decisions ?? []).map((item) => ({id: item.id, kind: 'decision', title: item.title || 'Analyst decision', detail: item.rationale || '', timestamp: item.createdAt})),
  ];
  return rows.filter((item) => item.timestamp).sort((a, b) => String(b.timestamp).localeCompare(String(a.timestamp)));
}

/** Escape a value for CSV export. */
export function csvCell(value) {
  const text = String(value ?? '');
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** Build an evidence-register CSV suitable for handoff or audit. */
export function evidenceCsv(caseData) {
  const header = ['id', 'capturedAt', 'type', 'source', 'title', 'hash', 'confidence', 'classification', 'summary'];
  const rows = (caseData?.evidence ?? []).map((item) => header.map((field) => csvCell(item[field])).join(','));
  return [header.join(','), ...rows].join('\n');
}

/** Generate a compact human-readable case report from current case state. */
export function reportMarkdown(caseData) {
  if (!caseData) return '# No active investigation';
  const metrics = caseMetrics(caseData);
  const lines = [
    `# ${caseData.title}`,
    '',
    `**Case ID:** ${caseData.id}`,
    `**Status:** ${caseData.status}  `,
    `**Priority:** ${caseData.priority}  `,
    `**Classification:** ${caseData.classification}  `,
    `**Owner:** ${caseData.owner}`,
    '',
    '## Executive summary',
    caseData.report?.executiveSummary || caseData.summary || '_Not yet drafted._',
    '',
    '## Assessment',
    caseData.report?.assessment || '_Not yet drafted._',
    '',
    `**Analytical confidence:** ${caseData.report?.confidence || 'Not set'}`,
    '',
    '## Intelligence requirements',
    ...(caseData.intelligenceRequirements?.length ? caseData.intelligenceRequirements.map((item) => `- [${item.status === 'Closed' ? 'x' : ' '}] ${item.priority || 'P2'} — ${item.question}`) : ['- None recorded.']),
    '',
    '## Findings',
    ...(caseData.findings?.length ? caseData.findings.map((item) => `- **${item.title || 'Finding'}:** ${item.assessment || item.summary || ''} (${item.confidence || 'confidence not set'})`) : ['- None recorded.']),
    '',
    '## Recommendations',
    caseData.report?.recommendations || '_None recorded._',
    '',
    '## Case metrics',
    `- ${metrics.entities} entities`,
    `- ${metrics.observables} observables`,
    `- ${metrics.evidence} evidence records`,
    `- ${metrics.openTasks} open tasks`,
  ];
  return lines.join('\n');
}
