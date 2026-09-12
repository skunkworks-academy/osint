import assert from 'node:assert/strict';
import {
  activeInvestigation,
  addInvestigation,
  appendCaseRecord,
  caseCompleteness,
  caseMetrics,
  createInvestigation,
  createWorkspace,
  evidenceCsv,
  parseWorkspace,
  reportMarkdown,
  unifiedTimeline,
  updateActiveInvestigation,
} from '../src/lib/workspace.mjs';

const workspace = createWorkspace();
assert.equal(workspace.cases.length, 1);
assert.ok(workspace.activeCaseId);
assert.equal(activeInvestigation(workspace).id, workspace.activeCaseId);

const twoCases = addInvestigation(workspace, {title: 'Second case', owner: 'Analyst A'});
assert.equal(twoCases.cases.length, 2);
assert.equal(activeInvestigation(twoCases).title, 'Second case');

const updated = updateActiveInvestigation(twoCases, {summary: 'Structured test summary'});
assert.equal(activeInvestigation(updated).summary, 'Structured test summary');

const withEvidence = appendCaseRecord(updated, 'evidence', {
  title: 'Message capture',
  type: 'Email',
  source: 'Mailbox',
  capturedAt: '2026-09-12T08:00:00.000Z',
  hash: 'a'.repeat(64),
  confidence: 'High',
  classification: 'Internal',
  summary: 'Captured message source',
}, 'EV');
const metrics = caseMetrics(activeInvestigation(withEvidence));
assert.equal(metrics.evidence, 1);
assert.match(evidenceCsv(activeInvestigation(withEvidence)), /Message capture/);
assert.match(reportMarkdown(activeInvestigation(withEvidence)), /Second case/);
assert.ok(unifiedTimeline(activeInvestigation(withEvidence)).some((item) => item.kind === 'evidence'));

const restored = parseWorkspace(JSON.stringify(withEvidence));
assert.equal(restored.cases.length, 2);
assert.equal(restored.activeCaseId, withEvidence.activeCaseId);
assert.ok(caseCompleteness(activeInvestigation(restored)) > 0);

const standalone = createInvestigation({title: 'Standalone'});
assert.equal(standalone.title, 'Standalone');
assert.ok(Array.isArray(standalone.entities));
assert.ok(Array.isArray(standalone.findings));

console.log('Analyst workspace model smoke tests passed.');
