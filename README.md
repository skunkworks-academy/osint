# Skunkworks Academy OSINT

Public OSINT-101 course site and a multi-interface analyst workplace for structured, lawful open-source investigations.

## Analyst Workplace

The application now treats an investigation as a lifecycle rather than a single tool screen. The primary route is `/analyst/`; `/workbench` remains as a backward-compatible entry point.

### Interfaces

| Route | Interface | Primary use |
| --- | --- | --- |
| `/analyst/` | Mission control | Active-case operational picture, intelligence requirements, tasks, metrics and timeline |
| `/analyst/cases/` | Case registry | Multiple investigations, active-case switching, status/priority/severity/classification/owner controls |
| `/analyst/intake/` | Evidence intake | Provenance-first evidence capture, local file hashing and rapid IOC extraction |
| `/analyst/email/` | Email laboratory | Header authentication, routing, MIME decoding, indicator extraction and case promotion |
| `/analyst/entities/` | Entity profiles | People, organisations, accounts, handles, aliases, confidence and relationship context |
| `/analyst/infrastructure/` | Infrastructure analysis | Domains, URLs, IPs, hashes, URL triage and deliberate public-source pivots |
| `/analyst/timeline/` | Timeline | Manual chronology plus evidence/finding/decision correlation |
| `/analyst/evidence/` | Evidence vault | Chain-of-custody-oriented evidence register and CSV export |
| `/analyst/analysis/` | Analysis board | Intelligence requirements, competing hypotheses, findings and confidence |
| `/analyst/report/` | Reporting studio | Executive summary, assessment, recommendations, Markdown and JSON export |
| `/analyst/tools/` | Toolbox | Observable pivots, SHA-256 text hashing, watchlist and utility matrix |
| `/analyst/settings/` | Workspace settings | Analyst profile, defaults, backup/import and local reset |

## Core capabilities

The workplace provides:

- versioned multi-case browser storage with explicit active-case state
- visible persistence status and emergency export when browser storage fails
- RFC-style email header parsing and routing inspection
- SPF, DKIM, DMARC and ARC result triage from `Authentication-Results`
- From / Reply-To / Return-Path mismatch detection
- `.eml` import with MIME text decoding, including base64 and quoted-printable content
- IOC extraction for email addresses, domains, URLs, IPv4 addresses and common hashes
- pre-open URL structure and suspicious-link heuristics
- deliberate public-source pivots for search, ICANN lookup and reputation services
- relationship graphing between technical observables
- local SHA-256 hashing for text and files using Web Crypto, with a 64 MiB in-memory file limit
- provenance, classification, confidence and integrity fields for evidence
- entity profiles with aliases and confidence labels
- intelligence requirements, analyst tasks, competing hypotheses and findings
- unified case timeline
- case completeness metrics that measure documentation maturity rather than threat level
- Markdown, CSV and JSON exports for handoff and audit

## Data model

`src/lib/workspace.mjs` defines the versioned workspace envelope. A workspace contains multiple investigations and an `activeCaseId`. Each investigation includes:

- case metadata: ID, title, owner, status, priority, severity and classification
- intelligence requirements and analyst tasks
- entities and observables
- evidence records with provenance and optional hashes
- timeline events
- hypotheses and findings
- analyst decisions and notes
- report content and confidence

The data model is intentionally serialisable so it can move from browser-local storage to a future authenticated API/database without changing the user-facing investigation workflow.

## Privacy and operational boundaries

Imported artefacts are processed locally in the browser. External lookups occur only when an analyst deliberately opens a third-party public-source pivot. The workplace does not automatically transmit case content to external reputation services.

The project is designed for public-source and authorised analysis. It does not provide credential harvesting, access-control bypass, exploitation, covert tracking, harassment, or intrusive reconnaissance capabilities. Automated scores are triage aids and must not be treated as proof of maliciousness or identity attribution.

## Development and validation

```bash
npm ci
npm run test
npm run validate
npm start
```

Validation includes forensic utility tests, workspace-model tests, responsive checks, Docusaurus production build checks and route assertions for every analyst interface.

The production build is generated with Docusaurus 3.
