# Skunkworks Academy OSINT

Public OSINT-101 course site and analyst workbench for structured, lawful open-source investigations.

## Analyst Workbench

The `/workbench` route provides a privacy-first browser workspace for:

- RFC-style email header parsing and routing inspection
- SPF, DKIM, DMARC and ARC result triage from `Authentication-Results`
- From / Reply-To / Return-Path mismatch detection
- `.eml` import for local analysis
- IOC extraction for email addresses, domains, URLs, IPv4 addresses and common hashes
- pre-open URL structure and suspicious-link heuristics
- public-source pivot links for search, ICANN lookup and reputation services
- relationship graphing between emails, domains, URLs and IP addresses
- local SHA-256 hashing for text and files using Web Crypto
- evidence logging with source, timestamp and confidence
- local case persistence and JSON export
- transparent triage scoring with explicit warning signals

The workbench is intentionally local-first. Imported files and pasted artefacts are processed in the browser. External lookups only occur when an analyst deliberately opens an external source.

## Guardrails

The project is designed for public-source and authorised analysis. It does not provide credential harvesting, access-control bypass, exploitation, covert tracking, or intrusive reconnaissance capabilities. Automated scores are triage aids and must not be treated as proof of maliciousness or identity attribution.

## Development

```bash
npm ci
npm run test:forensics
npm run validate
npm start
```

The production build is generated with Docusaurus 3.
