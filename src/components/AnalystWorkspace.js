import React, {useEffect, useMemo, useState} from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import {
  activeInvestigation,
  addInvestigation,
  appendCaseRecord,
  caseCompleteness,
  caseMetrics,
  createWorkspace,
  evidenceCsv,
  exportEnvelope,
  parseWorkspace,
  reportMarkdown,
  unifiedTimeline,
  updateActiveInvestigation,
  WORKSPACE_STORAGE_KEY,
} from '../lib/workspace.mjs';
import {
  analyzeEmailHeaders,
  analyzeUrl,
  buildRelationshipGraph,
  caseRiskScore,
  decodeMimeMessage,
  extractIOCs,
  observableSearchLinks,
  sha256File,
  sha256Text,
} from '../lib/forensics.mjs';
import styles from './AnalystWorkspace.module.css';

const NAV_GROUPS = [
  {
    label: 'Command',
    items: [
      ['overview', '/analyst/', 'Mission control', '⌂'],
      ['cases', '/analyst/cases/', 'Case registry', '▣'],
      ['intake', '/analyst/intake/', 'Evidence intake', '⇩'],
    ],
  },
  {
    label: 'Investigate',
    items: [
      ['email', '/analyst/email/', 'Email lab', '✉'],
      ['entities', '/analyst/entities/', 'Entity profiles', '◎'],
      ['infrastructure', '/analyst/infrastructure/', 'Infrastructure', '◇'],
      ['timeline', '/analyst/timeline/', 'Timeline', '◷'],
    ],
  },
  {
    label: 'Assess',
    items: [
      ['evidence', '/analyst/evidence/', 'Evidence vault', '▤'],
      ['analysis', '/analyst/analysis/', 'Analysis board', '△'],
      ['report', '/analyst/report/', 'Reporting', '≡'],
    ],
  },
  {
    label: 'Operations',
    items: [
      ['tools', '/analyst/tools/', 'Toolbox', '⌘'],
      ['settings', '/analyst/settings/', 'Workspace settings', '⚙'],
    ],
  },
];

const EMPTY_INTAKE = {title: '', type: 'Document', source: '', classification: 'Internal', confidence: 'Medium', summary: ''};
const EMPTY_ENTITY = {type: 'Person', name: '', value: '', aliases: '', confidence: 'Medium', notes: ''};
const EMPTY_TIMELINE = {timestamp: '', kind: 'Event', title: '', detail: '', source: ''};
const EMPTY_FINDING = {title: '', assessment: '', confidence: 'Medium', status: 'Working'};
const EMPTY_HYPOTHESIS = {statement: '', status: 'Open', confidence: 'Low', supporting: '', contradicting: ''};
const EMPTY_REQUIREMENT = {question: '', priority: 'P1', status: 'Open'};
const EMPTY_TASK = {title: '', priority: 'P2', status: 'Open', due: ''};

function downloadText(filename, content, type = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], {type});
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function Badge({children, tone = 'neutral'}) {
  return <span className={`${styles.badge} ${styles[`badge_${tone}`] || ''}`}>{children}</span>;
}

function Metric({label, value, detail, tone = 'neutral'}) {
  return (
    <article className={styles.metricCard}>
      <div className={styles.metricTop}><span>{label}</span><i className={`${styles.metricDot} ${styles[`dot_${tone}`] || ''}`} /></div>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}

function SectionTitle({eyebrow, title, copy, action}) {
  return (
    <div className={styles.sectionTitle}>
      <div><p>{eyebrow}</p><h2>{title}</h2>{copy ? <span>{copy}</span> : null}</div>
      {action || null}
    </div>
  );
}

function Field({label, children, hint}) {
  return <label className={styles.field}><span>{label}</span>{children}{hint ? <small>{hint}</small> : null}</label>;
}

function EmptyState({title, copy}) {
  return <div className={styles.emptyState}><strong>{title}</strong><p>{copy}</p></div>;
}

function Graph({graph}) {
  const visible = graph.nodes.slice(0, 24);
  if (!visible.length) return <EmptyState title="No graph yet" copy="Collect entities and observables to create a relationship graph." />;
  const positions = visible.map((node, index) => {
    const columns = Math.ceil(Math.sqrt(visible.length));
    const row = Math.floor(index / columns);
    const col = index % columns;
    return {node, x: 90 + col * 150, y: 75 + row * 115};
  });
  const lookup = new Map(positions.map((item) => [item.node.id, item]));
  const edges = graph.edges.filter((edge) => lookup.has(edge.from) && lookup.has(edge.to)).slice(0, 40);
  const width = Math.max(640, Math.ceil(Math.sqrt(visible.length)) * 150 + 80);
  const rows = Math.ceil(visible.length / Math.ceil(Math.sqrt(visible.length)));
  const height = Math.max(340, rows * 115 + 80);
  return (
    <div className={styles.graphFrame}>
      <svg viewBox={`0 0 ${width} ${height}`} className={styles.graph} role="img" aria-label="Case entity relationship graph">
        {edges.map((edge, index) => {
          const a = lookup.get(edge.from); const b = lookup.get(edge.to);
          return <line key={`${edge.from}-${edge.to}-${index}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} className={styles.graphEdge} />;
        })}
        {positions.map(({node, x, y}) => (
          <g key={`${node.type}:${node.id}`} transform={`translate(${x},${y})`}>
            <circle r="28" className={styles.graphNode} />
            <text textAnchor="middle" dy="4" className={styles.graphType}>{node.type.slice(0, 3).toUpperCase()}</text>
            <text textAnchor="middle" y="46" className={styles.graphLabel}>{node.id.length > 22 ? `${node.id.slice(0, 20)}…` : node.id}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}

function useWorkspace() {
  const [workspace, setWorkspace] = useState(null);
  const [persistState, setPersistState] = useState('loading');
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(WORKSPACE_STORAGE_KEY);
      setWorkspace(raw ? parseWorkspace(raw) : createWorkspace());
      setPersistState('saved');
    } catch {
      setWorkspace(createWorkspace());
      setPersistState('unsaved');
    }
  }, []);
  useEffect(() => {
    if (!workspace) return;
    try {
      window.localStorage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(workspace));
      setPersistState('saved');
    } catch {
      setPersistState('unsaved');
    }
  }, [workspace]);
  return {workspace, setWorkspace, persistState};
}

function Shell({view, workspace, setWorkspace, persistState, children}) {
  const active = activeInvestigation(workspace);
  const completeness = caseCompleteness(active);
  const exportWorkspace = () => downloadText(`osint-workspace-${active?.id || 'export'}.json`, JSON.stringify(exportEnvelope(workspace), null, 2), 'application/json');
  return (
    <Layout title="OSINT Analyst Workplace" description="Multi-interface OSINT case management, evidence, forensics, correlation and reporting workplace.">
      <div className={styles.app}>
        <aside className={styles.sidebar}>
          <Link to="/analyst/" className={styles.brand}><span>SW</span><div><strong>OSINT</strong><small>ANALYST WORKPLACE</small></div></Link>
          <div className={styles.caseMini}>
            <span>ACTIVE CASE</span>
            <strong>{active?.title || 'Loading…'}</strong>
            <small>{active?.id || '—'}</small>
          </div>
          <nav className={styles.nav} aria-label="Analyst workplace navigation">
            {NAV_GROUPS.map((group) => (
              <div key={group.label} className={styles.navGroup}>
                <span>{group.label}</span>
                {group.items.map(([id, href, label, icon]) => <Link key={id} to={href} className={view === id ? styles.navActive : ''}><i>{icon}</i>{label}</Link>)}
              </div>
            ))}
          </nav>
          <div className={styles.sidebarFooter}>
            <div><span className={persistState === 'saved' ? styles.saveOk : styles.saveWarn} />{persistState === 'saved' ? 'Saved locally' : 'UNSAVED — export now'}</div>
            {persistState !== 'saved' ? <button type="button" onClick={exportWorkspace}>Emergency export</button> : null}
            <small>Public-source & authorised analysis only</small>
          </div>
        </aside>

        <main className={styles.main}>
          <header className={styles.commandBar}>
            <div className={styles.breadcrumb}><span>Skunkworks / OSINT /</span><strong>{NAV_GROUPS.flatMap((g) => g.items).find(([id]) => id === view)?.[2] || 'Workplace'}</strong></div>
            <div className={styles.commandActions}>
              <select aria-label="Active investigation" value={workspace.activeCaseId} onChange={(event) => setWorkspace({...workspace, activeCaseId: event.target.value})}>
                {workspace.cases.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
              </select>
              <Badge tone={persistState === 'saved' ? 'good' : 'high'}>{persistState === 'saved' ? 'LOCAL' : 'UNSAVED'}</Badge>
              <button type="button" onClick={exportWorkspace}>Export</button>
            </div>
          </header>
          <div className={styles.contextStrip}>
            <div><strong>{active?.id}</strong><span>{active?.status}</span><span>{active?.priority}</span><span>{active?.classification}</span></div>
            <div><span>Case completeness</span><strong>{completeness}%</strong><div className={styles.progress}><i style={{width: `${completeness}%`}} /></div></div>
          </div>
          <div className={styles.content}>{children}</div>
        </main>
      </div>
    </Layout>
  );
}

function Overview({workspace, setWorkspace}) {
  const active = activeInvestigation(workspace);
  const metrics = caseMetrics(active);
  const timeline = unifiedTimeline(active).slice(0, 6);
  const [task, setTask] = useState(EMPTY_TASK);
  const addTask = () => {
    if (!task.title.trim()) return;
    setWorkspace(appendCaseRecord(workspace, 'tasks', task, 'TASK'));
    setTask(EMPTY_TASK);
  };
  return (
    <>
      <section className={styles.heroPanel}>
        <div><p>MISSION CONTROL</p><h1>Analyst operational picture</h1><span>One place to manage tasking, collection, evidence, correlation, assessment and reporting.</span></div>
        <div className={styles.heroButtons}><Link to="/analyst/intake/">New evidence</Link><Link to="/analyst/analysis/">Add finding</Link><Link to="/analyst/report/">Draft report</Link></div>
      </section>
      <section className={styles.metricsGrid}>
        <Metric label="Entities" value={metrics.entities} detail="profiled identities & organisations" />
        <Metric label="Observables" value={metrics.observables} detail="domains, URLs, IPs, hashes, handles" />
        <Metric label="Evidence" value={metrics.evidence} detail="chain-of-custody records" />
        <Metric label="Open tasks" value={metrics.openTasks} detail={`${metrics.openRequirements} intelligence requirements`} tone={metrics.openTasks ? 'warn' : 'good'} />
      </section>
      <div className={styles.dashboardGrid}>
        <section className={styles.panel}>
          <SectionTitle eyebrow="COLLECTION PLAN" title="Priority intelligence requirements" action={<Link to="/analyst/analysis/">Manage</Link>} />
          {(active.intelligenceRequirements || []).length ? <div className={styles.list}>{active.intelligenceRequirements.slice(0, 5).map((item) => <article key={item.id}><Badge tone={item.priority === 'P1' ? 'high' : 'neutral'}>{item.priority}</Badge><div><strong>{item.question}</strong><small>{item.status}</small></div></article>)}</div> : <EmptyState title="No requirements" copy="Define the questions the investigation must answer before collecting more data." />}
        </section>
        <section className={styles.panel}>
          <SectionTitle eyebrow="OPERATIONS" title="Analyst task queue" />
          <div className={styles.inlineForm}><input placeholder="Add task…" value={task.title} onChange={(e) => setTask({...task, title: e.target.value})} /><select value={task.priority} onChange={(e) => setTask({...task, priority: e.target.value})}><option>P1</option><option>P2</option><option>P3</option></select><button type="button" onClick={addTask}>Add</button></div>
          {(active.tasks || []).length ? <div className={styles.checkList}>{active.tasks.slice(0, 6).map((item) => <label key={item.id}><input type="checkbox" checked={item.status === 'Done'} onChange={() => setWorkspace(updateActiveInvestigation(workspace, {tasks: active.tasks.map((row) => row.id === item.id ? {...row, status: row.status === 'Done' ? 'Open' : 'Done'} : row)}))} /><span><strong>{item.title}</strong><small>{item.priority}{item.due ? ` · due ${item.due}` : ''}</small></span></label>)}</div> : <EmptyState title="Queue is clear" copy="Add collection, verification or reporting tasks here." />}
        </section>
        <section className={`${styles.panel} ${styles.spanTwo}`}>
          <SectionTitle eyebrow="ACTIVITY" title="Unified case timeline" action={<Link to="/analyst/timeline/">Open timeline</Link>} />
          {timeline.length ? <div className={styles.timeline}>{timeline.map((item) => <article key={`${item.kind}-${item.id}`}><time>{new Date(item.timestamp).toLocaleString()}</time><i /><div><Badge>{item.kind}</Badge><strong>{item.title}</strong><p>{item.detail}</p></div></article>)}</div> : <EmptyState title="No activity recorded" copy="Evidence, findings and analyst decisions automatically appear in the unified timeline." />}
        </section>
      </div>
    </>
  );
}

function Cases({workspace, setWorkspace}) {
  const active = activeInvestigation(workspace);
  const [query, setQuery] = useState('');
  const filtered = workspace.cases.filter((item) => `${item.title} ${item.id} ${item.tags?.join(' ')}`.toLowerCase().includes(query.toLowerCase()));
  const createCase = () => setWorkspace(addInvestigation(workspace, {owner: workspace.settings.analystName, classification: workspace.settings.defaultClassification}));
  return (
    <>
      <SectionTitle eyebrow="CASE MANAGEMENT" title="Investigation registry" copy="Separate investigations, preserve context, and switch between active cases without overwriting evidence." action={<button className={styles.primary} type="button" onClick={createCase}>+ New investigation</button>} />
      <div className={styles.toolbar}><input placeholder="Search cases, IDs or tags…" value={query} onChange={(e) => setQuery(e.target.value)} /><span>{filtered.length} cases</span></div>
      <div className={styles.caseGrid}>
        {filtered.map((item) => { const m = caseMetrics(item); return <button type="button" className={`${styles.caseCard} ${item.id === workspace.activeCaseId ? styles.caseCardActive : ''}`} key={item.id} onClick={() => setWorkspace({...workspace, activeCaseId: item.id})}><div><Badge tone={item.priority === 'P1' ? 'high' : 'neutral'}>{item.priority}</Badge><Badge>{item.status}</Badge></div><h3>{item.title}</h3><code>{item.id}</code><p>{item.summary || 'No case summary yet.'}</p><footer><span>{m.evidence} evidence</span><span>{m.entities} entities</span><span>{caseCompleteness(item)}% complete</span></footer></button>; })}
      </div>
      <section className={styles.panel}>
        <SectionTitle eyebrow="ACTIVE CASE" title="Case control sheet" />
        <div className={styles.formGrid}>
          <Field label="Title"><input value={active.title} onChange={(e) => setWorkspace(updateActiveInvestigation(workspace, {title: e.target.value}))} /></Field>
          <Field label="Owner"><input value={active.owner} onChange={(e) => setWorkspace(updateActiveInvestigation(workspace, {owner: e.target.value}))} /></Field>
          <Field label="Status"><select value={active.status} onChange={(e) => setWorkspace(updateActiveInvestigation(workspace, {status: e.target.value}))}><option>Open</option><option>Monitoring</option><option>Escalated</option><option>On hold</option><option>Closed</option></select></Field>
          <Field label="Priority"><select value={active.priority} onChange={(e) => setWorkspace(updateActiveInvestigation(workspace, {priority: e.target.value}))}><option>P1</option><option>P2</option><option>P3</option><option>P4</option></select></Field>
          <Field label="Classification"><select value={active.classification} onChange={(e) => setWorkspace(updateActiveInvestigation(workspace, {classification: e.target.value}))}><option>Public</option><option>Internal</option><option>Confidential</option><option>Restricted</option></select></Field>
          <Field label="Severity"><select value={active.severity} onChange={(e) => setWorkspace(updateActiveInvestigation(workspace, {severity: e.target.value}))}><option>Unknown</option><option>Low</option><option>Moderate</option><option>High</option><option>Critical</option></select></Field>
          <Field label="Case summary"><textarea rows="4" value={active.summary} onChange={(e) => setWorkspace(updateActiveInvestigation(workspace, {summary: e.target.value}))} /></Field>
          <Field label="Analyst notes"><textarea rows="4" value={active.notes} onChange={(e) => setWorkspace(updateActiveInvestigation(workspace, {notes: e.target.value}))} /></Field>
        </div>
      </section>
    </>
  );
}

function Intake({workspace, setWorkspace}) {
  const active = activeInvestigation(workspace);
  const [draft, setDraft] = useState({...EMPTY_INTAKE, classification: active.classification});
  const [paste, setPaste] = useState('');
  const [fileStatus, setFileStatus] = useState('');
  const addEvidence = async (extra = {}) => {
    if (!draft.title.trim() && !draft.source.trim() && !draft.summary.trim() && !extra.title) return;
    setWorkspace(appendCaseRecord(workspace, 'evidence', {...draft, capturedAt: new Date().toISOString(), ...extra}, 'EV'));
    setDraft({...EMPTY_INTAKE, classification: active.classification});
  };
  const handleFile = async (event) => {
    const file = event.target.files?.[0]; if (!file) return;
    setFileStatus('Hashing locally…');
    try {
      const hash = await sha256File(file);
      await addEvidence({title: draft.title || file.name, source: draft.source || 'Local file', type: file.type || 'File', hash, size: file.size, filename: file.name, summary: draft.summary || `Local artefact captured: ${file.name}`});
      setFileStatus(`Captured ${file.name} · SHA-256 ${hash.slice(0, 16)}…`);
    } catch (error) { setFileStatus(error.message); }
    event.target.value = '';
  };
  const harvestPaste = () => {
    const found = extractIOCs(paste);
    const observables = Object.entries(found).flatMap(([type, values]) => values.map((value) => ({id: `OBS-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, type, value, source: 'Pasted intake', confidence: 'Unverified', createdAt: new Date().toISOString()})));
    setWorkspace(updateActiveInvestigation(workspace, {observables: [...observables, ...(active.observables || [])]}));
  };
  return (
    <>
      <SectionTitle eyebrow="COLLECTION GATEWAY" title="Evidence and artefact intake" copy="Capture provenance first. Hash local files, record source context, and extract observables before analysis." />
      <div className={styles.dashboardGrid}>
        <section className={styles.panel}>
          <h3>Evidence record</h3>
          <div className={styles.formGridOne}>
            <Field label="Title"><input value={draft.title} onChange={(e) => setDraft({...draft, title: e.target.value})} placeholder="Phishing email screenshot" /></Field>
            <Field label="Evidence type"><select value={draft.type} onChange={(e) => setDraft({...draft, type: e.target.value})}><option>Document</option><option>Email</option><option>Screenshot</option><option>Web capture</option><option>File</option><option>Analyst note</option><option>External record</option></select></Field>
            <Field label="Source / provenance"><input value={draft.source} onChange={(e) => setDraft({...draft, source: e.target.value})} placeholder="Mailbox, URL, interview, public registry…" /></Field>
            <div className={styles.formGridTwo}><Field label="Classification"><select value={draft.classification} onChange={(e) => setDraft({...draft, classification: e.target.value})}><option>Public</option><option>Internal</option><option>Confidential</option><option>Restricted</option></select></Field><Field label="Source confidence"><select value={draft.confidence} onChange={(e) => setDraft({...draft, confidence: e.target.value})}><option>Low</option><option>Medium</option><option>High</option></select></Field></div>
            <Field label="Summary"><textarea rows="5" value={draft.summary} onChange={(e) => setDraft({...draft, summary: e.target.value})} /></Field>
            <div className={styles.buttonRow}><button className={styles.primary} type="button" onClick={() => addEvidence()}>Capture record</button><label className={styles.fileButton}>Hash + capture local file<input type="file" onChange={handleFile} /></label></div>
            {fileStatus ? <div className={styles.statusNote}>{fileStatus}</div> : null}
          </div>
        </section>
        <section className={styles.panel}>
          <h3>Rapid observable extraction</h3>
          <p className={styles.panelCopy}>Paste text, headers, logs or notes. Extraction stays in the browser.</p>
          <textarea className={styles.monoArea} rows="15" value={paste} onChange={(e) => setPaste(e.target.value)} placeholder="Paste investigation text…" />
          <div className={styles.buttonRow}><button type="button" className={styles.primary} onClick={harvestPaste}>Extract into case</button><button type="button" onClick={() => setPaste('')}>Clear</button></div>
          {paste ? <div className={styles.iocSummary}>{Object.entries(extractIOCs(paste)).map(([type, values]) => <span key={type}><strong>{values.length}</strong>{type}</span>)}</div> : null}
        </section>
      </div>
    </>
  );
}

function EmailLab({workspace, setWorkspace}) {
  const active = activeInvestigation(workspace);
  const [raw, setRaw] = useState('');
  const [decoded, setDecoded] = useState('');
  const [fileMeta, setFileMeta] = useState(null);
  const headers = useMemo(() => { const split = raw.search(/\r?\n\r?\n/); return split >= 0 ? raw.slice(0, split) : raw; }, [raw]);
  const analysis = useMemo(() => analyzeEmailHeaders(headers), [headers]);
  const bodyText = decoded || raw;
  const iocs = useMemo(() => extractIOCs(`${headers}\n${bodyText}`), [headers, bodyText]);
  const risk = useMemo(() => caseRiskScore({emailAnalysis: analysis}), [analysis]);
  const importEml = async (event) => {
    const file = event.target.files?.[0]; if (!file) return;
    if (file.size > 2 * 1024 * 1024) { setFileMeta({name: file.name, warning: 'Message is larger than 2 MiB. Raw content is not persisted; use hashing/evidence intake for preservation.'}); }
    const text = await file.text();
    const mime = decodeMimeMessage(text);
    setRaw(text);
    setDecoded(mime.text);
    const hash = await sha256Text(text);
    setFileMeta({name: file.name, size: file.size, hash, textParts: mime.textPartCount});
  };
  const commit = () => {
    const observations = Object.entries(iocs).flatMap(([type, values]) => values.map((value) => ({id: `OBS-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, type, value, source: fileMeta?.name || 'Email lab', confidence: 'Observed', createdAt: new Date().toISOString()})));
    let next = updateActiveInvestigation(workspace, {observables: [...observations, ...(active.observables || [])]});
    next = appendCaseRecord(next, 'evidence', {title: fileMeta?.name || 'Email artefact', type: 'Email', source: analysis.summary.from || 'Email lab', hash: fileMeta?.hash || '', summary: `Email forensic capture. Header risk ${analysis.riskScore}/100. ${mimeSummary(analysis)}`, capturedAt: new Date().toISOString(), classification: active.classification, confidence: 'High'}, 'EV');
    setWorkspace(next);
  };
  return (
    <>
      <SectionTitle eyebrow="EMAIL FORENSICS" title="Message authentication, routing and content laboratory" copy="Inspect headers, decode MIME text, extract indicators and promote verified artefacts into the active case." />
      <section className={styles.metricsGrid}>
        <Metric label="Triage risk" value={`${risk.score}/100`} detail={risk.band} tone={risk.score >= 40 ? 'warn' : 'good'} />
        <Metric label="SPF" value={analysis.auth.spf.toUpperCase()} detail="sender policy result" />
        <Metric label="DKIM" value={analysis.auth.dkim.toUpperCase()} detail="message signature result" />
        <Metric label="DMARC" value={analysis.auth.dmarc.toUpperCase()} detail={`${analysis.received.length} received hops`} />
      </section>
      <div className={styles.dashboardGrid}>
        <section className={`${styles.panel} ${styles.spanTwo}`}>
          <div className={styles.panelHead}><h3>Message source</h3><div className={styles.buttonRow}><label className={styles.fileButton}>Import .eml<input type="file" accept=".eml,message/rfc822,text/plain" onChange={importEml} /></label><button type="button" className={styles.primary} disabled={!raw} onClick={commit}>Promote to case</button></div></div>
          {fileMeta ? <div className={styles.statusNote}>{fileMeta.warning || `${fileMeta.name} · ${fileMeta.size} bytes · ${fileMeta.textParts} text parts · SHA-256 ${fileMeta.hash.slice(0, 20)}…`}</div> : null}
          <textarea className={styles.monoArea} rows="16" value={raw} onChange={(e) => { setRaw(e.target.value); setDecoded(decodeMimeMessage(e.target.value).text); }} placeholder="Paste full RFC 5322 message source or import .eml…" />
        </section>
        <section className={styles.panel}>
          <h3>Identity & transport</h3>
          <dl className={styles.definition}><dt>From</dt><dd>{analysis.summary.from || '—'}</dd><dt>Reply-To</dt><dd>{analysis.summary.replyTo || '—'}</dd><dt>Return-Path</dt><dd>{analysis.summary.returnPath || '—'}</dd><dt>Message-ID</dt><dd>{analysis.summary.messageId || '—'}</dd><dt>Date</dt><dd>{analysis.summary.date || '—'}</dd></dl>
        </section>
        <section className={styles.panel}>
          <h3>Automated signals</h3>
          {analysis.signals.length ? <div className={styles.signalList}>{analysis.signals.map((item, index) => <article key={`${item.code}-${index}`}><Badge tone={item.severity === 'high' ? 'high' : item.severity === 'medium' ? 'warn' : 'neutral'}>{item.severity}</Badge><div><strong>{item.code}</strong><p>{item.message}</p></div></article>)}</div> : <EmptyState title="No warning signals" copy="Load a message to begin header analysis." />}
        </section>
        <section className={`${styles.panel} ${styles.spanTwo}`}>
          <SectionTitle eyebrow="DECODED CONTENT" title="MIME text & extracted indicators" />
          <div className={styles.splitPane}><pre>{decoded || 'Decoded text/plain and text/html MIME parts appear here.'}</pre><div className={styles.iocColumns}>{Object.entries(iocs).map(([type, values]) => <div key={type}><strong>{type} <Badge>{values.length}</Badge></strong>{values.slice(0, 12).map((value) => <code key={value}>{value}</code>)}</div>)}</div></div>
        </section>
      </div>
    </>
  );
}

function mimeSummary(analysis) {
  const checks = ['spf', 'dkim', 'dmarc'].map((name) => `${name.toUpperCase()}=${analysis.auth[name]}`).join(', ');
  return `${checks}; ${analysis.received.length} routing hops.`;
}

function Entities({workspace, setWorkspace}) {
  const active = activeInvestigation(workspace);
  const [draft, setDraft] = useState(EMPTY_ENTITY);
  const add = () => {
    if (!draft.name.trim() && !draft.value.trim()) return;
    setWorkspace(appendCaseRecord(workspace, 'entities', {...draft, aliases: draft.aliases.split(',').map((v) => v.trim()).filter(Boolean)}, 'ENT'));
    setDraft(EMPTY_ENTITY);
  };
  const iocs = {emails: [], urls: [], domains: [], ipv4: []};
  for (const item of active.observables || []) {
    if (item.type === 'emails') iocs.emails.push(item.value);
    if (item.type === 'urls') iocs.urls.push(item.value);
    if (item.type === 'domains') iocs.domains.push(item.value);
    if (item.type === 'ipv4') iocs.ipv4.push(item.value);
  }
  const graph = buildRelationshipGraph(iocs);
  return (
    <>
      <SectionTitle eyebrow="ENTITY RESOLUTION" title="Identity and organisation profiles" copy="Maintain explicit, evidence-linked profiles instead of collapsing weak matches into identity claims." />
      <div className={styles.dashboardGrid}>
        <section className={styles.panel}>
          <h3>Add entity</h3>
          <div className={styles.formGridOne}>
            <Field label="Entity type"><select value={draft.type} onChange={(e) => setDraft({...draft, type: e.target.value})}><option>Person</option><option>Organisation</option><option>Email account</option><option>Username</option><option>Phone</option><option>Domain</option><option>Infrastructure</option><option>Location</option></select></Field>
            <Field label="Canonical name"><input value={draft.name} onChange={(e) => setDraft({...draft, name: e.target.value})} /></Field>
            <Field label="Primary value / identifier"><input value={draft.value} onChange={(e) => setDraft({...draft, value: e.target.value})} /></Field>
            <Field label="Aliases" hint="Comma-separated"><input value={draft.aliases} onChange={(e) => setDraft({...draft, aliases: e.target.value})} /></Field>
            <Field label="Confidence"><select value={draft.confidence} onChange={(e) => setDraft({...draft, confidence: e.target.value})}><option>Low</option><option>Medium</option><option>High</option></select></Field>
            <Field label="Analyst notes"><textarea rows="4" value={draft.notes} onChange={(e) => setDraft({...draft, notes: e.target.value})} /></Field>
            <button className={styles.primary} type="button" onClick={add}>Add entity profile</button>
          </div>
        </section>
        <section className={styles.panel}>
          <h3>Case entity directory</h3>
          {(active.entities || []).length ? <div className={styles.entityList}>{active.entities.map((item) => <article key={item.id}><div className={styles.avatar}>{item.type.slice(0, 2).toUpperCase()}</div><div><strong>{item.name || item.value}</strong><code>{item.value}</code><small>{item.type} · {item.confidence} confidence</small>{item.aliases?.length ? <p>Aliases: {item.aliases.join(', ')}</p> : null}{item.notes ? <p>{item.notes}</p> : null}</div></article>)}</div> : <EmptyState title="No entities profiled" copy="Create profiles only when the case contains enough evidence to justify a distinct entity record." />}
        </section>
        <section className={`${styles.panel} ${styles.spanTwo}`}><SectionTitle eyebrow="RELATIONSHIPS" title="Observable link graph" /><Graph graph={graph} /></section>
      </div>
    </>
  );
}

function Infrastructure({workspace, setWorkspace}) {
  const active = activeInvestigation(workspace);
  const [value, setValue] = useState('');
  const [type, setType] = useState('domain');
  const urlAnalysis = type === 'url' && value ? analyzeUrl(value) : null;
  const pivots = observableSearchLinks(value, type);
  const add = () => {
    if (!value.trim()) return;
    setWorkspace(appendCaseRecord(workspace, 'observables', {type: type === 'ip' ? 'ipv4' : `${type}s`, value: value.trim(), source: 'Infrastructure lab', confidence: 'Observed'}, 'OBS'));
  };
  return (
    <>
      <SectionTitle eyebrow="PASSIVE INFRASTRUCTURE" title="Domains, URLs, IPs and technical observables" copy="Structure technical indicators, assess link syntax before opening, and pivot only through deliberate public-source lookups." />
      <section className={styles.panel}>
        <div className={styles.lookupBar}><select value={type} onChange={(e) => setType(e.target.value)}><option value="domain">Domain</option><option value="url">URL</option><option value="ip">IP address</option><option value="hash">File hash</option><option value="email">Email</option><option value="generic">Generic</option></select><input value={value} onChange={(e) => setValue(e.target.value)} placeholder="Enter observable…" /><button type="button" className={styles.primary} onClick={add}>Add to case</button></div>
        {urlAnalysis ? <div className={styles.urlInspector}><div><span>Hostname</span><strong>{urlAnalysis.hostname || '—'}</strong></div><div><span>Protocol</span><strong>{urlAnalysis.protocol}</strong></div><div><span>Port</span><strong>{urlAnalysis.port}</strong></div><div><span>Risk hints</span><strong>{urlAnalysis.score}/100</strong></div></div> : null}
        {value ? <div className={styles.pivotGrid}>{pivots.map((pivot) => <a key={pivot.href} href={pivot.href} target="_blank" rel="noreferrer"><strong>{pivot.label}</strong><span>Open public-source pivot ↗</span></a>)}</div> : <EmptyState title="Enter an observable" copy="The workplace will create safe, explicit pivots without automatically visiting third-party services." />}
      </section>
      <section className={styles.panel}>
        <SectionTitle eyebrow="CASE OBSERVABLES" title="Technical indicator register" />
        {(active.observables || []).length ? <div className={styles.tableWrap}><table><thead><tr><th>Type</th><th>Value</th><th>Source</th><th>Confidence</th><th>Captured</th></tr></thead><tbody>{active.observables.map((item) => <tr key={item.id}><td><Badge>{item.type}</Badge></td><td><code>{item.value}</code></td><td>{item.source}</td><td>{item.confidence}</td><td>{new Date(item.createdAt).toLocaleString()}</td></tr>)}</tbody></table></div> : <EmptyState title="No observables" copy="Add indicators from email, intake, entity or infrastructure interfaces." />}
      </section>
    </>
  );
}

function Timeline({workspace, setWorkspace}) {
  const active = activeInvestigation(workspace);
  const [draft, setDraft] = useState(EMPTY_TIMELINE);
  const rows = unifiedTimeline(active);
  const add = () => {
    if (!draft.title.trim()) return;
    setWorkspace(appendCaseRecord(workspace, 'timeline', {...draft, timestamp: draft.timestamp ? new Date(draft.timestamp).toISOString() : new Date().toISOString()}, 'TIME'));
    setDraft(EMPTY_TIMELINE);
  };
  return (
    <>
      <SectionTitle eyebrow="CHRONOLOGY" title="Unified investigation timeline" copy="Correlate observed events with when evidence was captured, when assessments changed and when analysts made decisions." />
      <section className={styles.panel}>
        <div className={styles.timelineComposer}><input type="datetime-local" value={draft.timestamp} onChange={(e) => setDraft({...draft, timestamp: e.target.value})} /><select value={draft.kind} onChange={(e) => setDraft({...draft, kind: e.target.value})}><option>Event</option><option>Communication</option><option>Publication</option><option>Account activity</option><option>Infrastructure change</option><option>Analyst action</option></select><input placeholder="Event title" value={draft.title} onChange={(e) => setDraft({...draft, title: e.target.value})} /><input placeholder="Source" value={draft.source} onChange={(e) => setDraft({...draft, source: e.target.value})} /><textarea rows="2" placeholder="What happened and why it matters…" value={draft.detail} onChange={(e) => setDraft({...draft, detail: e.target.value})} /><button className={styles.primary} type="button" onClick={add}>Add event</button></div>
      </section>
      <section className={styles.panel}>
        {rows.length ? <div className={styles.timelineLarge}>{rows.map((item) => <article key={`${item.kind}-${item.id}`}><div><time>{new Date(item.timestamp).toLocaleDateString()}</time><small>{new Date(item.timestamp).toLocaleTimeString()}</small></div><i /><div><Badge>{item.kind}</Badge><h3>{item.title}</h3><p>{item.detail || 'No detail recorded.'}</p>{item.source ? <small>Source: {item.source}</small> : null}</div></article>)}</div> : <EmptyState title="No timeline data" copy="Create a manual event or capture evidence to populate chronology." />}
      </section>
    </>
  );
}

function Evidence({workspace}) {
  const active = activeInvestigation(workspace);
  const [query, setQuery] = useState('');
  const items = (active.evidence || []).filter((item) => JSON.stringify(item).toLowerCase().includes(query.toLowerCase()));
  return (
    <>
      <SectionTitle eyebrow="EVIDENCE VAULT" title="Provenance and chain-of-custody register" copy="Every material artefact should have a source, capture time, classification and integrity reference where possible." action={<button className={styles.primary} type="button" onClick={() => downloadText(`${active.id}-evidence.csv`, evidenceCsv(active), 'text/csv;charset=utf-8')}>Export CSV</button>} />
      <div className={styles.toolbar}><input placeholder="Filter evidence…" value={query} onChange={(e) => setQuery(e.target.value)} /><span>{items.length} records</span></div>
      <section className={styles.panel}>
        {items.length ? <div className={styles.tableWrap}><table><thead><tr><th>ID</th><th>Captured</th><th>Type</th><th>Title / source</th><th>Integrity</th><th>Confidence</th><th>Class.</th></tr></thead><tbody>{items.map((item) => <tr key={item.id}><td><code>{item.id}</code></td><td>{new Date(item.capturedAt || item.createdAt).toLocaleString()}</td><td>{item.type}</td><td><strong>{item.title || 'Evidence'}</strong><small>{item.source}</small></td><td>{item.hash ? <code title={item.hash}>{item.hash.slice(0, 16)}…</code> : '—'}</td><td>{item.confidence || '—'}</td><td><Badge>{item.classification || active.classification}</Badge></td></tr>)}</tbody></table></div> : <EmptyState title="Evidence vault is empty" copy="Use Evidence intake, Email lab or other collection interfaces to preserve provenance." />}
      </section>
    </>
  );
}

function AnalysisBoard({workspace, setWorkspace}) {
  const active = activeInvestigation(workspace);
  const [finding, setFinding] = useState(EMPTY_FINDING);
  const [hypothesis, setHypothesis] = useState(EMPTY_HYPOTHESIS);
  const [requirement, setRequirement] = useState(EMPTY_REQUIREMENT);
  const addFinding = () => { if (!finding.title.trim()) return; setWorkspace(appendCaseRecord(workspace, 'findings', finding, 'FIND')); setFinding(EMPTY_FINDING); };
  const addHypothesis = () => { if (!hypothesis.statement.trim()) return; setWorkspace(appendCaseRecord(workspace, 'hypotheses', hypothesis, 'HYP')); setHypothesis(EMPTY_HYPOTHESIS); };
  const addRequirement = () => { if (!requirement.question.trim()) return; setWorkspace(appendCaseRecord(workspace, 'intelligenceRequirements', requirement, 'IR')); setRequirement(EMPTY_REQUIREMENT); };
  return (
    <>
      <SectionTitle eyebrow="STRUCTURED ANALYSIS" title="Requirements, hypotheses and findings" copy="Separate observation from inference. Track what would support or contradict each hypothesis and state confidence explicitly." />
      <div className={styles.analysisColumns}>
        <section className={styles.panel}><h3>Intelligence requirements</h3><div className={styles.stackForm}><textarea rows="3" placeholder="Question the investigation must answer…" value={requirement.question} onChange={(e) => setRequirement({...requirement, question: e.target.value})} /><select value={requirement.priority} onChange={(e) => setRequirement({...requirement, priority: e.target.value})}><option>P1</option><option>P2</option><option>P3</option></select><button className={styles.primary} type="button" onClick={addRequirement}>Add requirement</button></div><div className={styles.cardStack}>{active.intelligenceRequirements.map((item) => <article key={item.id}><Badge tone={item.priority === 'P1' ? 'high' : 'neutral'}>{item.priority}</Badge><strong>{item.question}</strong><small>{item.status}</small></article>)}</div></section>
        <section className={styles.panel}><h3>Competing hypotheses</h3><div className={styles.stackForm}><textarea rows="3" placeholder="Hypothesis statement…" value={hypothesis.statement} onChange={(e) => setHypothesis({...hypothesis, statement: e.target.value})} /><input placeholder="Evidence that supports it" value={hypothesis.supporting} onChange={(e) => setHypothesis({...hypothesis, supporting: e.target.value})} /><input placeholder="Evidence that contradicts it" value={hypothesis.contradicting} onChange={(e) => setHypothesis({...hypothesis, contradicting: e.target.value})} /><select value={hypothesis.confidence} onChange={(e) => setHypothesis({...hypothesis, confidence: e.target.value})}><option>Low</option><option>Medium</option><option>High</option></select><button className={styles.primary} type="button" onClick={addHypothesis}>Add hypothesis</button></div><div className={styles.cardStack}>{active.hypotheses.map((item) => <article key={item.id}><Badge>{item.confidence}</Badge><strong>{item.statement}</strong><p>Supports: {item.supporting || '—'}</p><p>Contradicts: {item.contradicting || '—'}</p></article>)}</div></section>
        <section className={styles.panel}><h3>Analytical findings</h3><div className={styles.stackForm}><input placeholder="Finding title" value={finding.title} onChange={(e) => setFinding({...finding, title: e.target.value})} /><textarea rows="4" placeholder="Assessment — distinguish fact from inference…" value={finding.assessment} onChange={(e) => setFinding({...finding, assessment: e.target.value})} /><div className={styles.formGridTwo}><select value={finding.confidence} onChange={(e) => setFinding({...finding, confidence: e.target.value})}><option>Low</option><option>Medium</option><option>High</option></select><select value={finding.status} onChange={(e) => setFinding({...finding, status: e.target.value})}><option>Working</option><option>Corroborated</option><option>Disputed</option><option>Superseded</option></select></div><button className={styles.primary} type="button" onClick={addFinding}>Add finding</button></div><div className={styles.cardStack}>{active.findings.map((item) => <article key={item.id}><div><Badge>{item.status}</Badge><Badge>{item.confidence} confidence</Badge></div><strong>{item.title}</strong><p>{item.assessment}</p></article>)}</div></section>
      </div>
    </>
  );
}

function Report({workspace, setWorkspace}) {
  const active = activeInvestigation(workspace);
  const markdown = reportMarkdown(active);
  const updateReport = (patch) => setWorkspace(updateActiveInvestigation(workspace, {report: {...active.report, ...patch}}));
  return (
    <>
      <SectionTitle eyebrow="INTELLIGENCE PRODUCT" title="Assessment and reporting studio" copy="Turn the case record into a concise, confidence-qualified intelligence product with traceable evidence." action={<div className={styles.buttonRow}><button type="button" onClick={() => downloadText(`${active.id}-report.md`, markdown, 'text/markdown;charset=utf-8')}>Download Markdown</button><button className={styles.primary} type="button" onClick={() => downloadText(`${active.id}-case.json`, JSON.stringify(exportEnvelope(workspace), null, 2), 'application/json')}>Export case JSON</button></div>} />
      <div className={styles.dashboardGrid}>
        <section className={styles.panel}><div className={styles.formGridOne}><Field label="Executive summary"><textarea rows="7" value={active.report.executiveSummary} onChange={(e) => updateReport({executiveSummary: e.target.value})} /></Field><Field label="Assessment"><textarea rows="10" value={active.report.assessment} onChange={(e) => updateReport({assessment: e.target.value})} /></Field><Field label="Analytical confidence"><select value={active.report.confidence} onChange={(e) => updateReport({confidence: e.target.value})}><option>Low</option><option>Medium</option><option>High</option></select></Field><Field label="Recommendations"><textarea rows="6" value={active.report.recommendations} onChange={(e) => updateReport({recommendations: e.target.value})} /></Field></div></section>
        <section className={styles.panel}><h3>Live report preview</h3><pre className={styles.reportPreview}>{markdown}</pre></section>
      </div>
    </>
  );
}

function Tools({workspace, setWorkspace}) {
  const [value, setValue] = useState('');
  const [type, setType] = useState('generic');
  const [hash, setHash] = useState('');
  const pivots = observableSearchLinks(value, type);
  const hashValue = async () => setHash(await sha256Text(value));
  const addWatch = () => {
    if (!value.trim()) return;
    setWorkspace({...workspace, watchlist: [{id: `WATCH-${Date.now()}`, type, value: value.trim(), createdAt: new Date().toISOString()}, ...(workspace.watchlist || [])]});
  };
  return (
    <>
      <SectionTitle eyebrow="ANALYST TOOLBOX" title="Pivot, transform and verification utilities" copy="Utilities are designed to make deliberate analyst actions explicit rather than silently querying external services." />
      <div className={styles.dashboardGrid}>
        <section className={styles.panel}><h3>Observable pivot launcher</h3><div className={styles.formGridOne}><Field label="Observable type"><select value={type} onChange={(e) => setType(e.target.value)}><option value="generic">Generic</option><option value="email">Email</option><option value="domain">Domain</option><option value="url">URL</option><option value="ip">IP</option><option value="hash">Hash</option></select></Field><Field label="Observable"><input value={value} onChange={(e) => setValue(e.target.value)} /></Field><div className={styles.buttonRow}><button className={styles.primary} type="button" onClick={addWatch}>Add to watchlist</button><button type="button" onClick={hashValue}>SHA-256 text</button></div>{hash ? <code className={styles.hashBox}>{hash}</code> : null}</div><div className={styles.pivotGrid}>{pivots.map((pivot) => <a href={pivot.href} key={pivot.href} target="_blank" rel="noreferrer"><strong>{pivot.label}</strong><span>Open ↗</span></a>)}</div></section>
        <section className={styles.panel}><h3>Watchlist</h3>{workspace.watchlist?.length ? <div className={styles.watchList}>{workspace.watchlist.map((item) => <article key={item.id}><Badge>{item.type}</Badge><code>{item.value}</code><small>{new Date(item.createdAt).toLocaleString()}</small></article>)}</div> : <EmptyState title="Watchlist empty" copy="Pin observables you expect to revisit during an investigation." />}</section>
      </div>
      <section className={styles.panel}><SectionTitle eyebrow="REFERENCE" title="Capability matrix" /><div className={styles.capabilityGrid}>{[
        ['Email forensics', 'SPF, DKIM, DMARC, ARC, routing chain, MIME decoding, IOC extraction'],
        ['Identity analysis', 'Entity profiles, aliases, confidence labels, case-linked notes'],
        ['Infrastructure', 'URL parsing, passive public-source pivots, indicator registry'],
        ['Evidence', 'Local SHA-256 hashing, provenance, classification, CSV/JSON export'],
        ['Analysis', 'Intelligence requirements, competing hypotheses, findings, confidence'],
        ['Reporting', 'Executive summary, assessment, recommendations, Markdown/JSON export'],
      ].map(([title, copy]) => <article key={title}><strong>{title}</strong><p>{copy}</p></article>)}</div></section>
    </>
  );
}

function Settings({workspace, setWorkspace}) {
  const settings = workspace.settings;
  const set = (patch) => setWorkspace({...workspace, settings: {...settings, ...patch}});
  const importWorkspace = async (event) => {
    const file = event.target.files?.[0]; if (!file) return;
    try { setWorkspace(parseWorkspace(await file.text())); } catch { /* parseWorkspace provides fallback */ }
    event.target.value = '';
  };
  const reset = () => {
    if (window.confirm('Reset the local analyst workspace? Export first if you need to retain any case data.')) setWorkspace(createWorkspace());
  };
  return (
    <>
      <SectionTitle eyebrow="WORKSPACE CONTROL" title="Analyst preferences and local data" copy="Case data stays in this browser unless you explicitly export it or open a third-party pivot." />
      <div className={styles.dashboardGrid}>
        <section className={styles.panel}><h3>Analyst profile</h3><div className={styles.formGridOne}><Field label="Analyst name"><input value={settings.analystName} onChange={(e) => set({analystName: e.target.value})} /></Field><Field label="Organisation"><input value={settings.organisation} onChange={(e) => set({organisation: e.target.value})} /></Field><Field label="Default classification"><select value={settings.defaultClassification} onChange={(e) => set({defaultClassification: e.target.value})}><option>Public</option><option>Internal</option><option>Confidential</option><option>Restricted</option></select></Field></div></section>
        <section className={styles.panel}><h3>Data portability</h3><p className={styles.panelCopy}>Export regularly. Browser storage can be cleared by device policies, privacy controls or quota limits.</p><div className={styles.buttonRow}><button className={styles.primary} type="button" onClick={() => downloadText('osint-workspace-backup.json', JSON.stringify(exportEnvelope(workspace), null, 2), 'application/json')}>Export workspace</button><label className={styles.fileButton}>Import workspace<input type="file" accept="application/json,.json" onChange={importWorkspace} /></label><button className={styles.danger} type="button" onClick={reset}>Reset local data</button></div></section>
      </div>
    </>
  );
}

export default function AnalystWorkspace({view = 'overview'}) {
  const {workspace, setWorkspace, persistState} = useWorkspace();
  if (!workspace) return <Layout title="OSINT Analyst Workplace"><div className={styles.loading}>Loading analyst workplace…</div></Layout>;
  const props = {workspace, setWorkspace};
  const views = {
    overview: <Overview {...props} />,
    cases: <Cases {...props} />,
    intake: <Intake {...props} />,
    email: <EmailLab {...props} />,
    entities: <Entities {...props} />,
    infrastructure: <Infrastructure {...props} />,
    timeline: <Timeline {...props} />,
    evidence: <Evidence {...props} />,
    analysis: <AnalysisBoard {...props} />,
    report: <Report {...props} />,
    tools: <Tools {...props} />,
    settings: <Settings {...props} />,
  };
  return <Shell view={view} workspace={workspace} setWorkspace={setWorkspace} persistState={persistState}>{views[view] || views.overview}</Shell>;
}
