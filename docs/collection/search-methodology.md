---
title: Search Methodology
sidebar_position: 1
---

# Search Methodology

Effective OSINT search is iterative. The investigator moves from broad discovery to precise validation while recording each query, source and result.

## Search preparation

Before opening a search engine, create an identifier table.

| Identifier type | Known value | Variants to test |
|---|---|---|
| Name | Supplied in scenario | Initials, reversed order, transliteration, spelling variants |
| Username | Primary handle | Prefixes, suffixes, separators, reused aliases |
| Domain | Known domain | Subdomains, historic domains, misspellings |
| Email | Known address | Domain-only searches, quoted address, local-part reuse |
| Date | Relevant event date | Before/after windows, month and year, archive ranges |

## Query construction

Build queries from four components:

1. **Entity:** person, organisation, account, domain or event.
2. **Attribute:** location, job title, email, date, document type or relationship.
3. **Constraint:** quotation marks, site restriction, file type, date range or exclusion.
4. **Purpose:** discovery, validation, contradiction or chronology.

Example patterns:

```text
"exact username"
"full name" organisation
site:example.org "full name"
filetype:pdf "project name"
"email@example.org" -site:example.org
after:2025-01-01 before:2025-03-01 "event phrase"
```

## Broad-to-narrow workflow

### Pass 1: Baseline discovery

Establish what is publicly visible using the primary identifiers. Record recurring names, domains, dates and phrases.

### Pass 2: Variant expansion

Search spelling variants, aliases, transliterations, historic names, abbreviations and related entities.

### Pass 3: Source targeting

Restrict searches to relevant source classes such as government sites, company domains, professional networks, repositories, public records or archives.

### Pass 4: Temporal analysis

Use date filters and archives to determine when information appeared, changed or disappeared.

### Pass 5: Contradiction search

Actively look for evidence that weakens the leading hypothesis. Search for corrections, impersonation warnings, conflicting dates, alternative ownership and unrelated reuse of identifiers.

## Search log

Record enough detail for another investigator to repeat the work.

| Time | Query | Engine/source | Result | Relevance | Follow-up |
|---|---|---|---|---|---|
| 09:10 | `"sample_handle"` | Search engine | Two profile references | Medium | Compare profile dates |

## Source evaluation

Assess each source against:

- proximity to the event;
- independence from other sources;
- authenticity and provenance;
- motive and possible bias;
- publication date and update history;
- internal consistency;
- corroboration by reliable sources.

## Common failure modes

- using one search engine only;
- treating search ranking as credibility;
- failing to preserve the exact query;
- collecting without linking results to an intelligence requirement;
- assuming identical usernames prove common ownership;
- ignoring dates and historic context;
- searching only for confirming evidence.

## Practical activity

Using the controlled case study, create a 12-query search plan containing:

- three baseline queries;
- three identifier-variant queries;
- two source-restricted queries;
- two date-bounded queries;
- two contradiction-seeking queries.

For each query, state the question it is intended to answer.
