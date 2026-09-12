import assert from 'node:assert/strict';
import {
  analyzeEmailHeaders,
  analyzeUrl,
  buildRelationshipGraph,
  extractIOCs,
} from '../src/lib/forensics.mjs';

const headers = `From: Analyst <analyst@example.com>\nReply-To: redirect@other.example\nReturn-Path: <bounce@example.com>\nMessage-ID: <abc@example.com>\nAuthentication-Results: mx.example; spf=pass; dkim=pass; dmarc=fail\nReceived: from relay.example by mx.example with ESMTPS; Tue, 8 Sep 2026 10:14:01 +0000`;

const email = analyzeEmailHeaders(headers);
assert.equal(email.summary.fromDomain, 'example.com');
assert.equal(email.summary.replyDomain, 'other.example');
assert.equal(email.auth.spf, 'pass');
assert.equal(email.auth.dkim, 'pass');
assert.equal(email.auth.dmarc, 'fail');
assert.ok(email.signals.some((signal) => signal.code === 'reply-domain-mismatch'));
assert.ok(email.signals.some((signal) => signal.code === 'dmarc-fail'));

const iocs = extractIOCs('Email analyst@example.com URL https://example.com/a IP 203.0.113.10 hash 0123456789abcdef0123456789abcdef');
assert.deepEqual(iocs.emails, ['analyst@example.com']);
assert.deepEqual(iocs.domains, ['example.com']);
assert.deepEqual(iocs.ipv4, ['203.0.113.10']);
assert.deepEqual(iocs.md5, ['0123456789abcdef0123456789abcdef']);

const url = analyzeUrl('http://203.0.113.10:8080/login');
assert.equal(url.valid, true);
assert.ok(url.findings.some((finding) => finding.code === 'no-https'));
assert.ok(url.findings.some((finding) => finding.code === 'ip-host'));
assert.ok(url.findings.some((finding) => finding.code === 'nonstandard-port'));

const graph = buildRelationshipGraph(iocs);
assert.ok(graph.nodes.some((node) => node.id === 'analyst@example.com' && node.type === 'email'));
assert.ok(graph.nodes.some((node) => node.id === 'example.com' && node.type === 'domain'));
assert.ok(graph.edges.some((edge) => edge.from === 'analyst@example.com' && edge.to === 'example.com'));

console.log('Forensic utility smoke tests passed.');
