const HEADER_NAME = /^([!-9;-~]+):\s*(.*)$/;

export const MAX_HASH_FILE_BYTES = 64 * 1024 * 1024;

/** Unfold RFC-style continuation lines and return individual header lines. */
export function unfoldHeaders(raw = '') {
  return String(raw)
    .replace(/\r\n/g, '\n')
    .replace(/\n[\t ]+/g, ' ')
    .split('\n');
}

/** Parse an RFC-style header block into ordered and keyed representations. */
export function parseHeaderBlock(raw = '') {
  const headers = {};
  const ordered = [];

  for (const line of unfoldHeaders(raw)) {
    const match = line.match(HEADER_NAME);
    if (!match) continue;
    const [, name, value] = match;
    const key = name.toLowerCase();
    headers[key] ??= [];
    headers[key].push(value.trim());
    ordered.push({name, key, value: value.trim()});
  }

  return {headers, ordered};
}

/** Return the first value for a case-insensitive parsed header name. */
export function firstHeader(headers, name) {
  return headers?.[String(name).toLowerCase()]?.[0] ?? '';
}

/** Extract the first email address from a mailbox-style header value. */
export function addressFromHeader(value = '') {
  const angle = String(value).match(/<([^<>\s]+@[^<>\s]+)>/);
  if (angle) return angle[1].toLowerCase();
  const direct = String(value).match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return direct ? direct[0].toLowerCase() : '';
}

/** Extract and normalize the domain portion of an email address/header. */
export function domainFromEmail(value = '') {
  const email = addressFromHeader(value) || String(value).trim().toLowerCase();
  const at = email.lastIndexOf('@');
  return at > -1 ? email.slice(at + 1).replace(/[>),;\s]+$/g, '') : '';
}

/** Parse SPF, DKIM, DMARC and ARC outcomes from Authentication-Results. */
export function parseAuthenticationResults(value = '') {
  const normalized = String(value).toLowerCase();
  const status = (mechanism) => {
    const match = normalized.match(new RegExp(`(?:^|[;\\s])${mechanism}=([a-z0-9_-]+)`));
    return match ? match[1] : 'unknown';
  };

  return {
    spf: status('spf'),
    dkim: status('dkim'),
    dmarc: status('dmarc'),
    arc: status('arc'),
    raw: value,
  };
}

/** Map a signal severity to its triage contribution. */
function severityWeight(severity) {
  return {info: 0, low: 4, medium: 10, high: 18, critical: 28}[severity] ?? 0;
}

/** Analyze supplied email headers for authentication, identity and routing signals. */
export function analyzeEmailHeaders(raw = '') {
  const source = String(raw);
  if (!source.trim()) {
    return {
      summary: {from: '', replyTo: '', returnPath: '', subject: '', date: '', messageId: '', fromDomain: '', replyDomain: '', returnDomain: ''},
      auth: parseAuthenticationResults(''),
      received: [],
      signals: [],
      riskScore: 0,
      riskBand: 'low',
      headers: {},
      ordered: [],
    };
  }

  const {headers, ordered} = parseHeaderBlock(source);
  const from = firstHeader(headers, 'from');
  const replyTo = firstHeader(headers, 'reply-to');
  const returnPath = firstHeader(headers, 'return-path');
  const messageId = firstHeader(headers, 'message-id');
  const subject = firstHeader(headers, 'subject');
  const date = firstHeader(headers, 'date');
  const authRaw = firstHeader(headers, 'authentication-results');
  const auth = parseAuthenticationResults(authRaw);
  const received = headers.received ?? [];
  const signals = [];

  const fromDomain = domainFromEmail(from);
  const replyDomain = domainFromEmail(replyTo);
  const returnDomain = domainFromEmail(returnPath);

  if (replyDomain && fromDomain && replyDomain !== fromDomain) {
    signals.push({severity: 'high', code: 'reply-domain-mismatch', message: `Reply-To domain (${replyDomain}) differs from From domain (${fromDomain}).`});
  }
  if (returnDomain && fromDomain && returnDomain !== fromDomain) {
    signals.push({severity: 'medium', code: 'return-path-mismatch', message: `Return-Path domain (${returnDomain}) differs from From domain (${fromDomain}).`});
  }

  for (const mechanism of ['spf', 'dkim', 'dmarc']) {
    const result = auth[mechanism];
    if (['fail', 'softfail', 'permerror', 'temperror'].includes(result)) {
      signals.push({severity: mechanism === 'dmarc' ? 'high' : 'medium', code: `${mechanism}-${result}`, message: `${mechanism.toUpperCase()} result is ${result}.`});
    } else if (['none', 'neutral', 'unknown'].includes(result)) {
      signals.push({severity: 'low', code: `${mechanism}-${result}`, message: `${mechanism.toUpperCase()} did not produce a positive authentication result.`});
    }
  }

  if (!messageId) {
    signals.push({severity: 'low', code: 'missing-message-id', message: 'Message-ID header is missing.'});
  }
  if (!received.length) {
    signals.push({severity: 'medium', code: 'missing-received', message: 'No Received chain is present in the supplied header block.'});
  }

  const riskScore = Math.min(100, signals.reduce((sum, item) => sum + severityWeight(item.severity), 0));
  const riskBand = riskScore >= 70 ? 'high' : riskScore >= 35 ? 'elevated' : riskScore >= 15 ? 'guarded' : 'low';

  return {
    summary: {from, replyTo, returnPath, subject, date, messageId, fromDomain, replyDomain, returnDomain},
    auth,
    received,
    signals,
    riskScore,
    riskBand,
    headers,
    ordered,
  };
}

/** Validate a dotted-quad IPv4 string without accepting out-of-range octets. */
function validIPv4(value) {
  const octets = value.split('.');
  return octets.length === 4 && octets.every((part) => /^\d{1,3}$/.test(part) && Number(part) <= 255);
}

/** Normalize a domain-like value for correlation. */
function normalizeDomain(value) {
  return String(value).toLowerCase().replace(/^www\./, '').replace(/[).,;:!?]+$/g, '');
}

/** Extract common indicators of compromise from analyst-supplied text. */
export function extractIOCs(text = '') {
  const source = String(text);
  const emails = new Set((source.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) ?? []).map((v) => v.toLowerCase()));
  const urls = new Set((source.match(/https?:\/\/[^\s<>"']+/gi) ?? []).map((v) => v.replace(/[).,;]+$/g, '')));
  const ipv4 = new Set((source.match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g) ?? []).filter(validIPv4));
  const sha256 = new Set((source.match(/\b[a-f0-9]{64}\b/gi) ?? []).map((v) => v.toLowerCase()));
  const sha1 = new Set((source.match(/\b[a-f0-9]{40}\b/gi) ?? []).map((v) => v.toLowerCase()));
  const md5 = new Set((source.match(/\b[a-f0-9]{32}\b/gi) ?? []).map((v) => v.toLowerCase()));

  const domains = new Set();
  for (const email of emails) domains.add(normalizeDomain(email.split('@')[1]));
  for (const url of urls) {
    try {
      domains.add(normalizeDomain(new URL(url).hostname));
    } catch {
      // Invalid URLs are ignored here and can be reviewed manually.
    }
  }

  const nakedDomains = source.match(/\b(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}\b/gi) ?? [];
  for (const domain of nakedDomains) domains.add(normalizeDomain(domain));

  return {
    emails: [...emails].sort(),
    urls: [...urls].sort(),
    domains: [...domains].filter(Boolean).sort(),
    ipv4: [...ipv4].sort(),
    sha256: [...sha256].sort(),
    sha1: [...sha1].sort(),
    md5: [...md5].sort(),
  };
}

/** Inspect a URL structurally without requesting the destination. */
export function analyzeUrl(value = '') {
  const input = String(value).trim();
  const findings = [];
  let parsed;

  try {
    parsed = new URL(input);
  } catch {
    return {valid: false, input, findings: [{severity: 'high', code: 'invalid-url', message: 'The supplied value is not a valid absolute URL.'}], score: 25};
  }

  const host = parsed.hostname.toLowerCase();
  const labels = host.split('.').filter(Boolean);
  const isIpHost = validIPv4(host);

  if (parsed.protocol !== 'https:') findings.push({severity: 'medium', code: 'no-https', message: `URL uses ${parsed.protocol || 'an unknown protocol'} rather than HTTPS.`});
  if (isIpHost) findings.push({severity: 'high', code: 'ip-host', message: 'URL uses an IP address instead of a domain name.'});
  if (host.includes('xn--')) findings.push({severity: 'medium', code: 'punycode', message: 'Hostname contains Punycode and should be checked for homograph abuse.'});
  if (labels.length >= 5) findings.push({severity: 'low', code: 'deep-subdomain', message: 'Hostname has an unusually deep subdomain chain.'});
  if (parsed.port && !['80', '443'].includes(parsed.port)) findings.push({severity: 'low', code: 'nonstandard-port', message: `URL uses non-standard port ${parsed.port}.`});
  if (/%[0-9a-f]{2}/i.test(input)) findings.push({severity: 'low', code: 'encoding', message: 'URL contains percent-encoded characters; inspect the decoded form.'});
  if (parsed.username || parsed.password) findings.push({severity: 'high', code: 'userinfo', message: 'URL includes user-info credentials before the hostname.'});

  const score = Math.min(100, findings.reduce((sum, item) => sum + severityWeight(item.severity), 0));
  return {
    valid: true,
    input,
    normalized: parsed.href,
    protocol: parsed.protocol,
    hostname: host,
    port: parsed.port || '(default)',
    pathname: parsed.pathname,
    query: parsed.search,
    fragment: parsed.hash,
    findings,
    score,
  };
}

/** Build deliberate public-source pivot links for a selected observable. */
export function observableSearchLinks(value = '', type = 'generic') {
  const observable = String(value).trim();
  if (!observable) return [];
  const q = encodeURIComponent(`"${observable}"`);
  const raw = encodeURIComponent(observable);
  const links = [
    {label: 'Google exact search', href: `https://www.google.com/search?q=${q}`},
    {label: 'Bing exact search', href: `https://www.bing.com/search?q=${q}`},
    {label: 'GitHub search', href: `https://github.com/search?q=${raw}&type=code`},
  ];

  if (type === 'domain') {
    links.push(
      {label: 'ICANN Lookup', href: `https://lookup.icann.org/en/lookup?name=${raw}`},
      {label: 'VirusTotal domain search', href: `https://www.virustotal.com/gui/domain/${raw}`},
    );
  }
  if (type === 'url') links.push({label: 'VirusTotal URL search', href: `https://www.virustotal.com/gui/search/${raw}`});
  if (type === 'ip') links.push({label: 'VirusTotal IP search', href: `https://www.virustotal.com/gui/ip-address/${raw}`});
  if (type === 'hash') links.push({label: 'VirusTotal hash search', href: `https://www.virustotal.com/gui/file/${raw}`});
  if (type === 'email') links.push({label: 'Have I Been Pwned', href: 'https://haveibeenpwned.com/'});

  return links;
}

/** Hash an analyst-provided text value with SHA-256 using Web Crypto. */
export async function sha256Text(value = '') {
  const bytes = new TextEncoder().encode(String(value));
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

/** Hash a local file with SHA-256 after enforcing the 64 MiB in-memory limit. */
export async function sha256File(file) {
  if (!file?.arrayBuffer) throw new TypeError('A browser File object is required.');
  if (Number.isFinite(file.size) && file.size > MAX_HASH_FILE_BYTES) {
    throw new RangeError('File exceeds the 64 MiB local hashing limit.');
  }
  const digest = await globalThis.crypto.subtle.digest('SHA-256', await file.arrayBuffer());
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

/** Split a MIME entity into its header block and body. */
function splitMimeEntity(raw = '') {
  const source = String(raw).replace(/\r\n/g, '\n');
  const boundary = source.indexOf('\n\n');
  if (boundary < 0) return {headerText: '', body: source};
  return {headerText: source.slice(0, boundary), body: source.slice(boundary + 2)};
}

/** Extract a semicolon-delimited MIME header parameter such as boundary/charset. */
function mimeParameter(value = '', name = '') {
  const escaped = String(name).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = String(value).match(new RegExp(`(?:^|;)\\s*${escaped}\\s*=\\s*(?:"([^"]*)"|([^;\\s]+))`, 'i'));
  return (match?.[1] ?? match?.[2] ?? '').trim();
}

/** Decode bytes using a declared MIME charset with a UTF-8 fallback. */
function decodeBytes(bytes, charset = 'utf-8') {
  try {
    return new TextDecoder(charset || 'utf-8', {fatal: false}).decode(bytes);
  } catch {
    return new TextDecoder('utf-8', {fatal: false}).decode(bytes);
  }
}

/** Decode a base64 MIME body into text without network access. */
function decodeBase64Body(value = '', charset = 'utf-8') {
  const compact = String(value).replace(/\s+/g, '');
  if (!compact) return '';
  const binary = globalThis.atob(compact);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return decodeBytes(bytes, charset);
}

/** Decode quoted-printable text, including soft line breaks. */
function decodeQuotedPrintableBody(value = '', charset = 'utf-8') {
  const source = String(value).replace(/=\n/g, '');
  const bytes = [];
  const encoder = new TextEncoder();

  for (let index = 0; index < source.length; index += 1) {
    const hex = source.slice(index + 1, index + 3);
    if (source[index] === '=' && /^[A-F0-9]{2}$/i.test(hex)) {
      bytes.push(Number.parseInt(hex, 16));
      index += 2;
      continue;
    }
    bytes.push(...encoder.encode(source[index]));
  }

  return decodeBytes(new Uint8Array(bytes), charset);
}

/** Split a multipart MIME body into child entities by exact boundary lines. */
function splitMultipartBody(body = '', boundary = '') {
  if (!boundary) return [];
  const marker = `--${boundary}`;
  const closing = `--${boundary}--`;
  const parts = [];
  let current = null;

  for (const line of String(body).replace(/\r\n/g, '\n').split('\n')) {
    const trimmed = line.trimEnd();
    if (trimmed === marker) {
      if (current?.length) parts.push(current.join('\n'));
      current = [];
      continue;
    }
    if (trimmed === closing) {
      if (current?.length) parts.push(current.join('\n'));
      current = null;
      break;
    }
    if (current) current.push(line);
  }

  return parts;
}

/** Recursively decode text-bearing MIME entities while ignoring binary attachments. */
function decodeMimeEntity(raw = '', depth = 0) {
  if (depth > 12) return [];
  const {headerText, body} = splitMimeEntity(raw);
  const {headers} = parseHeaderBlock(headerText);
  const contentType = firstHeader(headers, 'content-type') || 'text/plain; charset=utf-8';
  const transferEncoding = firstHeader(headers, 'content-transfer-encoding').toLowerCase();
  const mediaType = contentType.split(';')[0].trim().toLowerCase();
  const charset = mimeParameter(contentType, 'charset') || 'utf-8';

  if (mediaType.startsWith('multipart/')) {
    const boundary = mimeParameter(contentType, 'boundary');
    return splitMultipartBody(body, boundary).flatMap((part) => decodeMimeEntity(part, depth + 1));
  }

  if (mediaType === 'message/rfc822') {
    return decodeMimeEntity(body, depth + 1);
  }

  if (!mediaType.startsWith('text/')) return [];

  try {
    if (transferEncoding === 'base64') return [decodeBase64Body(body, charset)];
    if (transferEncoding === 'quoted-printable') return [decodeQuotedPrintableBody(body, charset)];
    return [body];
  } catch {
    return [body];
  }
}

/** Decode text/plain and text/html bodies from a MIME message for IOC extraction. */
export function decodeMimeMessage(raw = '') {
  const parts = decodeMimeEntity(raw).map((part) => part.trim()).filter(Boolean);
  return {text: parts.join('\n\n'), textPartCount: parts.length};
}

/** Build a simple relationship graph between extracted public observables. */
export function buildRelationshipGraph(iocs = {}) {
  const nodes = [];
  const edges = [];
  const seen = new Set();
  const addNode = (id, type) => {
    if (!id || seen.has(`${type}:${id}`)) return;
    seen.add(`${type}:${id}`);
    nodes.push({id, type});
  };

  for (const email of iocs.emails ?? []) {
    addNode(email, 'email');
    const domain = domainFromEmail(email);
    if (domain) {
      addNode(domain, 'domain');
      edges.push({from: email, to: domain, relation: 'uses-domain'});
    }
  }
  for (const domain of iocs.domains ?? []) addNode(domain, 'domain');
  for (const ip of iocs.ipv4 ?? []) addNode(ip, 'ip');
  for (const url of iocs.urls ?? []) {
    addNode(url, 'url');
    try {
      const domain = normalizeDomain(new URL(url).hostname);
      addNode(domain, 'domain');
      edges.push({from: url, to: domain, relation: 'resolves-to-host'});
    } catch {
      // Ignore malformed URLs in graph construction.
    }
  }

  return {nodes, edges};
}

/** Calculate a normalized case triage score using only analysis types that are present. */
export function caseRiskScore({emailAnalysis, urlAnalyses = [], analystSignals = []} = {}) {
  const hasEmail = Boolean(
    emailAnalysis && (
      (emailAnalysis.ordered?.length ?? 0) > 0 ||
      (emailAnalysis.received?.length ?? 0) > 0 ||
      emailAnalysis.summary?.from
    ),
  );
  const hasUrls = urlAnalyses.length > 0;
  const hasAnalystSignals = analystSignals.length > 0;

  const emailScore = Math.max(0, Math.min(100, emailAnalysis?.riskScore ?? 0));
  const urlRaw = Math.min(50, urlAnalyses.reduce((sum, item) => sum + (item?.score ?? 0), 0));
  const analystRaw = Math.min(40, analystSignals.reduce((sum, item) => sum + severityWeight(item.severity), 0));
  const urlScore = (urlRaw / 50) * 100;
  const analystScore = (analystRaw / 40) * 100;

  const components = [
    hasEmail ? {score: emailScore, weight: 0.6} : null,
    hasUrls ? {score: urlScore, weight: 0.25} : null,
    hasAnalystSignals ? {score: analystScore, weight: 0.15} : null,
  ].filter(Boolean);

  const totalWeight = components.reduce((sum, component) => sum + component.weight, 0);
  const weighted = components.reduce((sum, component) => sum + component.score * component.weight, 0);
  const score = totalWeight ? Math.max(0, Math.min(100, Math.round(weighted / totalWeight))) : 0;

  return {score, band: score >= 70 ? 'high' : score >= 40 ? 'elevated' : score >= 20 ? 'guarded' : 'low'};
}
