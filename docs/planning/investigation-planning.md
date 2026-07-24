---
title: Investigation Planning
sidebar_position: 1
---

# Investigation Planning

A defensible OSINT investigation begins before the first search. Planning reduces confirmation bias, prevents uncontrolled collection and establishes what evidence is required to answer the question.

## 1. Define the decision

Start with the decision the investigation is intended to support. Examples include whether to escalate an incident, whether two online identities are likely connected, whether a claim can be substantiated, or whether a digital asset belongs to a known organisation.

A clear decision statement prevents the investigation from becoming an open-ended search for interesting facts.

## 2. Frame the intelligence requirement

A useful intelligence requirement is specific, bounded and answerable.

**Weak:** Find everything about the actor.

**Stronger:** Determine whether the account that published the claim is credibly linked to the named group, and identify evidence supporting or contradicting that attribution.

Break the main requirement into:

- **PIRs:** Priority intelligence requirements that directly affect the decision.
- **SIRs:** Specific information requirements needed to answer each PIR.
- **Indicators:** Observable facts that would support, weaken or refute a hypothesis.

## 3. Establish scope and boundaries

Document:

- authorised objective;
- subjects and identifiers in scope;
- date range;
- geographic scope;
- permitted source classes;
- prohibited techniques;
- handling rules for personal or breach-derived information;
- escalation triggers;
- completion criteria.

## 4. Build competing hypotheses

Do not begin with a single explanation. Create at least two plausible hypotheses.

Example:

- H1: The publishing account is operated by the group named in the claim.
- H2: The account is an unaffiliated impersonator using the group’s identity.
- H3: The account is authentic, but the published material is fabricated or misattributed.

For each hypothesis, define expected indicators and disconfirming evidence.

## 5. Create a collection plan

| Collection question | Source class | Search terms or identifiers | Expected evidence | Risk or constraint |
|---|---|---|---|---|
| When did the account first appear? | Platform profile, archives | Username and variants | Creation or earliest-observed date | Platform data may be incomplete |
| Is the account linked to known infrastructure? | Domains, certificates, archives | URLs, domains, email addresses | Shared identifiers or infrastructure | Avoid active interaction |
| Is the material authentic? | Metadata, public records, corroborating sources | Names, dates, file attributes | Independent corroboration | Sensitive-data minimisation |

## 6. Set stop conditions

Stop or escalate when:

- the task requires access beyond public or authorised sources;
- collection would expose unnecessary personal data;
- breach-derived material is encountered;
- the investigation moves outside approved scope;
- evidence is sufficient to answer the requirement;
- further collection is unlikely to materially change the assessment.

## Practical activity

Create a one-page investigation plan for the controlled course scenario. Include one decision statement, two PIRs, at least three hypotheses, five collection questions and two stop conditions.

## Quality checklist

- Is the decision explicit?
- Can every planned collection action be linked to a requirement?
- Are alternative explanations represented?
- Are legal, privacy and evidential constraints recorded?
- Is there a clear definition of done?
