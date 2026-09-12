import React, {useEffect, useMemo, useState} from 'react';
import Layout from '@theme/Layout';
import {
  analyzeEmailHeaders,
  analyzeUrl,
  buildRelationshipGraph,
  caseRiskScore,
  extractIOCs,
  observableSearchLinks,
  sha256File,
  sha256Text,
} from '../lib/forensics.mjs';
import styles from './workbench.module.css';

const STORAGE_KEY = 'skunkworks-osint-workbench-v1';
const EMPTY_CASE = {
  id: '',
  title: 'Untitled investigation',
  status: 'Open',
  createdAt: '',
  updatedAt: '',
  rawHeaders: '',
  corpus: '',
  urlInput: '',
  notes: '',
  evidence: [],
};

const exampleHeaders = `From: "SOFT SKILLS" <atsrecruiter7676@gmail.com>\nReply-To: atsrecruiter7676@gmail.com\nReturn-Path: <atsrecruiter7676@gmail.com>\nSubject: To Accounts Billable\nDate: Tue, 8 Sep 2026 10:14:00 +0000\nMessage-ID: <example-message-id@mail.gmail.com>\nAuthentication-Results: mx.example; spf=pass; dkim=pass; dmarc=pass\nReceived: from mail.example by mx.example with ESMTPS; Tue, 8 Sep 2026 10:14:01 +0000`;

function nowIso() {
  return new Date().toISOString();
}

function makeCase() {
  const createdAt = nowIso();
  return {
    ...EMPTY_CASE,
    id: `CASE-${createdAt.replace(/\D/g, '').slice(0, 14)}`,
    createdAt,
    updatedAt: createdAt,
  };
}

function Badge({children, tone = 'neutral'}) {
  return <span className={`${styles.badge} ${styles[`badge_${tone}`] ?? ''}`}>{children}</span>;
}

function SignalList({signals = []}) {
  if (!signals.length) return <p className={styles.muted}>No automated warning signals from the supplied artefact.</p>;
  return (
    <div className={styles.signalList}>
      {signals.map((signal, index) => (
        <div className={styles.signal} key={`${signal.code}-${index}`}>
          <Badge tone={signal.severity}>{signal.severity}</Badge>
          <div><strong>{signal.code}</strong><p>{signal.message}</p></div>
        </div>
      ))}
    </div>
  );
}

function Metric({label, value, sub}) {
  return (
    <div className={styles.metric}>
      <span>{label}</span>
      <strong>{value}</strong>
      {sub ? <small>{sub}</small> : null}
    </div>
  );
}

function GraphPanel({graph}) {
  const visibleNodes = graph.nodes.slice(0, 18);
  const nodeSignature = visibleNodes.map((node) => `${node.type}:${node.id}`).join('|');
  const positions = useMemo(() => {
    const count = Math.max(visibleNodes.length, 1);
    return visibleNodes.map((node, index) => {
      const angle = (Math.PI * 2 * index) / count - Math.PI / 2;
      return {node, x: 320 + Math.cos(angle) * 220, y: 210 + Math.sin(angle) * 145};
    });
  }, [nodeSignature]);

  const byId = new Map(positions.map((item) => [item.node.id, item]));
  const edges = graph.edges.filter((edge) => byId.has(edge.from) && byId.has(edge.to)).slice(0, 30);

  if (!visibleNodes.length) return <p className={styles.muted}>Extract indicators to populate the relationship graph.</p>;

  return (
    <div className={styles.graphWrap}>
      <svg viewBox="0 0 640 420" role="img" aria-label="Observable relationship graph" className={styles.graph}>
        {edges.map((edge, index) => {
          const from = byId.get(edge.from);
          const to = byId.get(edge.to);
          return <line key={`${edge.from}-${edge.to}-${index}`} x1={from.x} y1={from.y} x2={to.x} y2={to.y} className={styles.graphEdge} />;
        })}
        {positions.map(({node, x, y}) => (
          <g key={`${node.type}:${node.id}`} transform={`translate(${x} ${y})`}>
            <circle r="27" className={`${styles.graphNode} ${styles[`node_${node.type}`] ?? ''}`} />
            <text textAnchor="middle" dy="4" className={styles.graphType}>{node.type.slice(0, 3).toUpperCase()}</text>
            <text textAnchor="middle" y="43" className={styles.graphLabel}>{node.id.length > 30 ? `${node.id.slice(0, 27)}…` : node.id}</text>
          </g>
        ))}
      </svg>
      {graph.nodes.length > visibleNodes.length ? <p className={styles.muted}>Showing the first 18 of {graph.nodes.length} entities.</p> : null}
    </div>
  );
}

function DownloadButton({caseData, emailAnalysis, iocs, graph, urlAnalysis}) {
  const download = () => {
    const payload = {
      schema: 'skunkworks-osint-case/v1',
      exportedAt: nowIso(),
      case: caseData,
      analysis: {email: emailAnalysis, iocs, graph, url: urlAnalysis},
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${caseData.id || 'osint-case'}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  return <button className={styles.primaryButton} type="button" onClick={download}>Export case JSON</button>;
}

export default function Workbench() {
  const [caseData, setCaseData] = useState(EMPTY_CASE);
  const [storageReady, setStorageReady] = useState(false);
  const [activeTool, setActiveTool] = useState('email');
  const [observable, setObservable] = useState('');
  const [observableType, setObservableType] = useState('generic');
  const [hashResult, setHashResult] = useState('');
  const [hashBusy, setHashBusy] = useState(false);
  const [evidenceDraft, setEvidenceDraft] = useState({source: '', summary: '', confidence: 'Medium'});

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      setCaseData(saved ? {...makeCase(), ...JSON.parse(saved)} : makeCase());
    } catch {
      setCaseData(makeCase());
    } finally {
      setStorageReady(true);
    }
  }, []);

  useEffect(() => {
    if (!storageReady) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({...caseData, updatedAt: nowIso()}));
    } catch {
      // Ignore blocked storage or quota errors.
    }
  }, [caseData, storageReady]);

  const emailAnalysis = useMemo(() => analyzeEmailHeaders(caseData.rawHeaders), [caseData.rawHeaders]);
  const combinedCorpus = `${caseData.rawHeaders}\n${caseData.corpus}\n${caseData.notes}`;
  const iocs = useMemo(() => extractIOCs(combinedCorpus), [combinedCorpus]);
  const graph = useMemo(() => buildRelationshipGraph(iocs), [iocs]);
  const urlAnalysis = useMemo(() => caseData.urlInput.trim() ? analyzeUrl(caseData.urlInput) : null, [caseData.urlInput]);
  const risk = useMemo(() => caseRiskScore({emailAnalysis, urlAnalyses: urlAnalysis ? [urlAnalysis] : []}), [emailAnalysis, urlAnalysis]);
  const searchLinks = useMemo(() => observableSearchLinks(observable, observableType), [observable, observableType]);
  const totalIocs = Object.values(iocs).reduce((sum, items) => sum + items.length, 0);

  const updateCase = (patch) => setCaseData((current) => ({...current, ...patch, updatedAt: nowIso()}));

  const loadEml = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const headerEnd = text.search(/\r?\n\r?\n/);
    const headers = headerEnd > -1 ? text.slice(0, headerEnd) : text;
    setCaseData((current) => ({
      ...current,
      rawHeaders: headers,
      corpus: `${current.corpus}\n\n${text}`.trim(),
      updatedAt: nowIso(),
    }));
  };

  const hashText = async () => {
    setHashBusy(true);
    try {
      setHashResult(await sha256Text(caseData.corpus));
    } catch (error) {
      setHashResult(`Unable to hash text: ${error.message}`);
    } finally {
      setHashBusy(false);
    }
  };

  const hashFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setHashBusy(true);
    try {
      const digest = await sha256File(file);
      setHashResult(`${file.name}\nSHA-256: ${digest}`);
    } catch (error) {
      setHashResult(`Unable to hash file: ${error.message}`);
    } finally {
      setHashBusy(false);
    }
  };

  const addEvidence = () => {
    if (!evidenceDraft.source.trim() && !evidenceDraft.summary.trim()) return;
    updateCase({
      evidence: [
        ...caseData.evidence,
        {...evidenceDraft, id: `EV-${Date.now()}`, capturedAt: nowIso()},
      ],
    });
    setEvidenceDraft({source: '', summary: '', confidence: 'Medium'});
  };

  const tools = [
    ['email', 'Email forensics'],
    ['ioc', 'IOC extractor'],
    ['url', 'URL analyser'],
    ['lookup', 'OSINT lookup'],
    ['graph', 'Entity graph'],
    ['hash', 'Hashing'],
    ['evidence', 'Evidence log'],
    ['report', 'Case report'],
  ];

  return (
    <Layout title="Analyst Workbench" description="Privacy-first OSINT analyst workbench for email forensics, IOC extraction, link analysis, evidence handling and reporting.">
      <main className={styles.shell}>
        <section className={styles.topbar}>
          <div>
            <p className={styles.eyebrow}>SKUNKWORKS · OSINT ANALYST WORKBENCH</p>
            <h1>Investigation console</h1>
            <p>Local-first artefact triage, correlation, evidence logging and defensible reporting.</p>
          </div>
          <div className={styles.topActions}>
            <Badge tone={risk.band === 'high' ? 'high' : risk.band === 'elevated' ? 'medium' : 'neutral'}>Risk {risk.score}/100 · {risk.band}</Badge>
            <button type="button" className={styles.secondaryButton} onClick={() => setCaseData(makeCase())}>New case</button>
          </div>
        </section>

        <section className={styles.guardrail}>
          <strong>Public-source and authorised analysis only.</strong>
          <span>This browser-based workbench does not bypass access controls, harvest credentials, or perform intrusive reconnaissance. External lookups open in a new tab for analyst review.</span>
        </section>

        <section className={styles.caseHeader}>
          <label>Case ID<input value={caseData.id} onChange={(e) => updateCase({id: e.target.value})} /></label>
          <label>Case title<input value={caseData.title} onChange={(e) => updateCase({title: e.target.value})} /></label>
          <label>Status<select value={caseData.status} onChange={(e) => updateCase({status: e.target.value})}><option>Open</option><option>Monitoring</option><option>Escalated</option><option>Closed</option></select></label>
        </section>

        <section className={styles.metrics} aria-label="Case metrics">
          <Metric label="Header risk" value={`${emailAnalysis.riskScore}/100`} sub={emailAnalysis.riskBand} />
          <Metric label="Indicators" value={totalIocs} sub={`${iocs.domains.length} domains · ${iocs.ipv4.length} IPs`} />
          <Metric label="Evidence" value={caseData.evidence.length} sub="logged artefacts" />
          <Metric label="Routes" value={emailAnalysis.received.length} sub="Received headers" />
        </section>

        <div className={styles.workspace}>
          <nav className={styles.toolNav} aria-label="Investigation tools">
            {tools.map(([id, label]) => <button type="button" key={id} className={activeTool === id ? styles.activeTool : ''} onClick={() => setActiveTool(id)}>{label}</button>)}
          </nav>

          <section className={styles.panel}>
            {activeTool === 'email' ? (
              <>
                <div className={styles.panelHeading}><div><p className={styles.eyebrow}>EMAIL FORENSICS</p><h2>Header authentication and routing</h2></div><div className={styles.inlineActions}><button type="button" className={styles.textButton} onClick={() => updateCase({rawHeaders: exampleHeaders})}>Load example</button><label className={styles.fileButton}>Import .eml<input type="file" accept=".eml,message/rfc822,text/plain" onChange={loadEml} /></label></div></div>
                <textarea className={styles.codeArea} rows="13" value={caseData.rawHeaders} onChange={(e) => updateCase({rawHeaders: e.target.value})} placeholder="Paste complete Internet headers or import an .eml file…" spellCheck="false" />
                <div className={styles.authGrid}>
                  {['spf', 'dkim', 'dmarc', 'arc'].map((key) => <div key={key}><span>{key.toUpperCase()}</span><strong>{emailAnalysis.auth[key]}</strong></div>)}
                </div>
                <div className={styles.twoCol}>
                  <article className={styles.subpanel}><h3>Identity and transport</h3><dl className={styles.definitionList}><dt>From</dt><dd>{emailAnalysis.summary.from || '—'}</dd><dt>Reply-To</dt><dd>{emailAnalysis.summary.replyTo || '—'}</dd><dt>Return-Path</dt><dd>{emailAnalysis.summary.returnPath || '—'}</dd><dt>Message-ID</dt><dd>{emailAnalysis.summary.messageId || '—'}</dd><dt>Received hops</dt><dd>{emailAnalysis.received.length}</dd></dl></article>
                  <article className={styles.subpanel}><h3>Automated signals</h3><SignalList signals={emailAnalysis.signals} /></article>
                </div>
              </>
            ) : null}

            {activeTool === 'ioc' ? (
              <>
                <div className={styles.panelHeading}><div><p className={styles.eyebrow}>INDICATOR EXTRACTION</p><h2>Extract observables from investigation text</h2></div></div>
                <textarea className={styles.codeArea} rows="14" value={caseData.corpus} onChange={(e) => updateCase({corpus: e.target.value})} placeholder="Paste message bodies, notes, logs, URLs, hashes, domains or IP addresses…" />
                <div className={styles.iocGrid}>
                  {Object.entries(iocs).map(([type, values]) => <article className={styles.subpanel} key={type}><div className={styles.iocHeading}><h3>{type}</h3><Badge>{values.length}</Badge></div>{values.length ? <ul className={styles.monoList}>{values.map((value) => <li key={value}><button type="button" title="Use in OSINT lookup" onClick={() => {setObservable(value); setObservableType(type === 'ipv4' ? 'ip' : type.startsWith('sha') || type === 'md5' ? 'hash' : type.slice(0, -1)); setActiveTool('lookup');}}>{value}</button></li>)}</ul> : <p className={styles.muted}>None extracted.</p>}</article>)}
                </div>
              </>
            ) : null}

            {activeTool === 'url' ? (
              <>
                <div className={styles.panelHeading}><div><p className={styles.eyebrow}>LINK ANALYSIS</p><h2>Inspect a URL before opening it</h2></div></div>
                <input className={styles.largeInput} value={caseData.urlInput} onChange={(e) => updateCase({urlInput: e.target.value})} placeholder="https://example.com/path?query=value" />
                {urlAnalysis ? <div className={styles.twoCol}><article className={styles.subpanel}><h3>Parsed destination</h3>{urlAnalysis.valid ? <dl className={styles.definitionList}><dt>Hostname</dt><dd>{urlAnalysis.hostname}</dd><dt>Protocol</dt><dd>{urlAnalysis.protocol}</dd><dt>Port</dt><dd>{urlAnalysis.port}</dd><dt>Path</dt><dd>{urlAnalysis.pathname}</dd><dt>Query</dt><dd>{urlAnalysis.query || '—'}</dd></dl> : <p>Invalid absolute URL.</p>}</article><article className={styles.subpanel}><h3>Heuristic signals · {urlAnalysis.score}/100</h3><SignalList signals={urlAnalysis.findings} /></article></div> : <p className={styles.muted}>Enter a URL to inspect its destination, encoding, protocol and structural warning signals.</p>}
              </>
            ) : null}

            {activeTool === 'lookup' ? (
              <>
                <div className={styles.panelHeading}><div><p className={styles.eyebrow}>OSINT QUERY LAUNCHER</p><h2>Pivot on a public observable</h2></div></div>
                <div className={styles.lookupBar}><select value={observableType} onChange={(e) => setObservableType(e.target.value)}><option value="generic">Generic</option><option value="email">Email</option><option value="domain">Domain</option><option value="url">URL</option><option value="ip">IP address</option><option value="hash">File hash</option></select><input value={observable} onChange={(e) => setObservable(e.target.value)} placeholder="Email, domain, URL, IP, handle or hash…" /></div>
                <div className={styles.lookupGrid}>{searchLinks.map((link) => <a key={link.href} href={link.href} target="_blank" rel="noopener noreferrer" className={styles.lookupCard}><strong>{link.label}</strong><span>Open external source ↗</span></a>)}</div>
                <p className={styles.muted}>Use external results as leads, not facts. Record source, timestamp, corroboration and confidence in the evidence log.</p>
              </>
            ) : null}

            {activeTool === 'graph' ? (
              <>
                <div className={styles.panelHeading}><div><p className={styles.eyebrow}>ENTITY CORRELATION</p><h2>Relationship graph</h2></div></div>
                <GraphPanel graph={graph} />
                <div className={styles.edgeList}>{graph.edges.slice(0, 20).map((edge, index) => <div key={`${edge.from}-${edge.to}-${index}`}><code>{edge.from}</code><span>{edge.relation}</span><code>{edge.to}</code></div>)}</div>
              </>
            ) : null}

            {activeTool === 'hash' ? (
              <>
                <div className={styles.panelHeading}><div><p className={styles.eyebrow}>INTEGRITY</p><h2>SHA-256 hashing</h2></div></div>
                <p>Hash evidence locally in the browser. Files are not uploaded by this workbench.</p>
                <div className={styles.hashActions}><button className={styles.primaryButton} type="button" disabled={hashBusy || !caseData.corpus} onClick={hashText}>Hash investigation text</button><label className={styles.fileButton}>Hash a local file<input type="file" onChange={hashFile} /></label></div>
                <pre className={styles.hashOutput}>{hashBusy ? 'Calculating…' : hashResult || 'SHA-256 output will appear here.'}</pre>
              </>
            ) : null}

            {activeTool === 'evidence' ? (
              <>
                <div className={styles.panelHeading}><div><p className={styles.eyebrow}>EVIDENCE LOG</p><h2>Record provenance and confidence</h2></div></div>
                <div className={styles.evidenceForm}><input value={evidenceDraft.source} onChange={(e) => setEvidenceDraft({...evidenceDraft, source: e.target.value})} placeholder="Source URL, artefact name or reference" /><textarea value={evidenceDraft.summary} onChange={(e) => setEvidenceDraft({...evidenceDraft, summary: e.target.value})} placeholder="What does this evidence support or contradict?" rows="4" /><select value={evidenceDraft.confidence} onChange={(e) => setEvidenceDraft({...evidenceDraft, confidence: e.target.value})}><option>Low</option><option>Medium</option><option>High</option></select><button className={styles.primaryButton} type="button" onClick={addEvidence}>Add evidence</button></div>
                <div className={styles.evidenceList}>{caseData.evidence.length ? caseData.evidence.map((item) => <article key={item.id}><div><Badge>{item.confidence} confidence</Badge><time>{item.capturedAt}</time></div><strong>{item.source || 'Unlabelled source'}</strong><p>{item.summary}</p><button type="button" className={styles.textButton} onClick={() => updateCase({evidence: caseData.evidence.filter((entry) => entry.id !== item.id)})}>Remove</button></article>) : <p className={styles.muted}>No evidence entries logged.</p>}</div>
              </>
            ) : null}

            {activeTool === 'report' ? (
              <>
                <div className={styles.panelHeading}><div><p className={styles.eyebrow}>ANALYTIC PRODUCT</p><h2>Case summary and export</h2></div><DownloadButton caseData={caseData} emailAnalysis={emailAnalysis} iocs={iocs} graph={graph} urlAnalysis={urlAnalysis} /></div>
                <div className={styles.reportGrid}><article className={styles.subpanel}><h3>Assessment</h3><dl className={styles.definitionList}><dt>Case</dt><dd>{caseData.id || 'Initialising…'}</dd><dt>Status</dt><dd>{caseData.status}</dd><dt>Risk</dt><dd>{risk.score}/100 · {risk.band}</dd><dt>Email signals</dt><dd>{emailAnalysis.signals.length}</dd><dt>Indicators</dt><dd>{totalIocs}</dd><dt>Evidence items</dt><dd>{caseData.evidence.length}</dd></dl></article><article className={styles.subpanel}><h3>Analyst notes</h3><textarea rows="11" value={caseData.notes} onChange={(e) => updateCase({notes: e.target.value})} placeholder="Write a concise assessment. Separate verified facts, analytical judgements, assumptions and outstanding collection requirements." /></article></div>
                <article className={styles.subpanel}><h3>Reporting discipline</h3><p>State what is known, what is assessed, the evidence supporting each judgement, alternative explanations, confidence, limitations and recommended next collection steps. A risk score is triage support—not proof of maliciousness or identity attribution.</p></article>
              </>
            ) : null}
          </section>
        </div>
      </main>
    </Layout>
  );
}
