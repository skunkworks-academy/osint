import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';

const outcomes = [
  'Translate broad requests into intelligence requirements, priorities and collectable questions.',
  'Apply a repeatable 12-step OSINT workflow from tasking through defensible reporting.',
  'Evaluate source reliability, independence, corroboration and analytical confidence.',
  'Handle sensitive information with proportionality, redaction and evidential traceability.',
];

const curriculum = [
  ['01', 'Foundations and guardrails', 'OSINT boundaries, intelligence concepts and analyst responsibilities.'],
  ['02', 'Planning and requirements', 'Scope, authority, IRs, PIRs, SIRs and collection decision gates.'],
  ['03', 'Search and collection', 'Query engineering, source strategy, metadata and controlled monitoring.'],
  ['04', 'Verification and analysis', 'Corroboration, confidence, evidence logging and structured judgement.'],
  ['05', 'Applied investigation', 'Controlled case study, investigation sprint and final assessment.'],
];

const standards = [
  ['Methodology first', 'Use a stable operating model instead of depending on individual tools.'],
  ['Legal by design', 'Build authority, proportionality and privacy into every collection decision.'],
  ['Evidence-ready', 'Record source, time, relevance, sensitivity and confidence from the first artefact.'],
];

export default function Home() {
  return (
    <Layout
      title="OSINT Investigation Methodology"
      description="Explore OSINT-101 and enrol through Skunkworks Academy. Lessons require an Academy account and active enrolment."
    >
      <div className="accessBanner">
        <div className="accessBanner__inner">
          <span className="accessBanner__icon" aria-hidden="true">◆</span>
          <strong>Course access is protected.</strong>
          <span>Create an Academy account and enrol before opening lessons or assessments.</span>
          <Link to="/enrol">View access steps</Link>
        </div>
      </div>

      <header className="heroBanner">
        <div className="heroGrid">
          <div>
            <div className="courseBadge">OSINT-101 · Self-paced · Enrolment required</div>
            <p className="eyebrow">Skunkworks Academy Security</p>
            <h1 className="heroTitle">Find what is already there—lawfully and defensibly.</h1>
            <p className="heroCopy">
              Move from ad-hoc searching to structured intelligence work. Learn a disciplined OSINT
              investigation methodology built around requirements, verification, evidence handling
              and restrained reporting.
            </p>
            <div className="actionRow">
              <Link className="button button--primary button--lg" to="/enrol">
                Enrol in OSINT-101
              </Link>
              <Link className="button button--secondary button--lg" to="/login">
                Sign in to continue
              </Link>
            </div>
            <div className="heroTrust" aria-label="Course access assurances">
              <span>Account required</span>
              <span>Active enrolment required</span>
              <span>Public sources only</span>
            </div>
          </div>

          <aside className="heroPanel" aria-label="Course summary">
            <div className="heroPanel__grid" aria-hidden="true" />
            <div className="heroPanel__content">
              <span className="heroPanel__label">Operational learning path</span>
              <strong>OSINT</strong>
              <span>SKUNKWORKS</span>
              <div className="heroPanel__line" />
              <p>Methodology first.<br />Legal by design.<br />Evidence-ready.</p>
            </div>
          </aside>
        </div>
      </header>

      <main>
        <section className="section section--compact" aria-label="Course metrics">
          <div className="metricGrid metricGrid--hero">
            <div className="metric"><strong>12</strong><span>workflow steps</span></div>
            <div className="metric"><strong>5</strong><span>learning stages</span></div>
            <div className="metric"><strong>1</strong><span>controlled case study</span></div>
            <div className="metric"><strong>80%</strong><span>recommended pass standard</span></div>
          </div>
        </section>

        <section className="section" id="outcomes">
          <div className="sectionHeading">
            <div>
              <p className="eyebrow">Learning outcomes</p>
              <h2>Build an investigation practice that another analyst can audit.</h2>
            </div>
            <p>
              The course focuses on professional judgement, documentation and defensible outcomes—not
              tool collecting or unauthorised access.
            </p>
          </div>
          <div className="outcomeGrid">
            {outcomes.map((outcome, index) => (
              <article className="outcomeCard" key={outcome}>
                <span>{String(index + 1).padStart(2, '0')}</span>
                <p>{outcome}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="section section--surface" id="curriculum">
          <div className="sectionHeading">
            <div>
              <p className="eyebrow">Public curriculum overview</p>
              <h2>Five stages from tasking to evidence-ready reporting.</h2>
            </div>
            <p>Lesson bodies, labs and assessments become available after account and enrolment validation.</p>
          </div>
          <div className="curriculumList">
            {curriculum.map(([number, title, description]) => (
              <article className="curriculumItem" key={number}>
                <span className="curriculumItem__number">{number}</span>
                <div>
                  <h3>{title}</h3>
                  <p>{description}</p>
                </div>
                <span className="curriculumItem__lock" aria-label="Protected lesson stage">Locked</span>
              </article>
            ))}
          </div>
        </section>

        <section className="section" id="access">
          <div className="sectionHeading">
            <div>
              <p className="eyebrow">How access works</p>
              <h2>One clear route from visitor to enrolled learner.</h2>
            </div>
            <p>Your Academy account is used for course entitlement, progress and completion records.</p>
          </div>
          <div className="accessJourney">
            <article><span>1</span><h3>Create an account</h3><p>Register or sign in through the Skunkworks Academy Portal.</p></article>
            <article><span>2</span><h3>Enrol in OSINT-101</h3><p>Purchase the course or receive an approved learner entitlement.</p></article>
            <article><span>3</span><h3>Open My Learning</h3><p>Launch protected lessons, activities and assessments from your learner dashboard.</p></article>
          </div>
          <div className="actionRow actionRow--center">
            <Link className="button button--primary button--lg" to="/enrol">Start enrolment</Link>
            <Link className="button button--secondary button--lg" to="/login">Returning learner sign-in</Link>
          </div>
        </section>

        <section className="section section--surface">
          <div className="sectionHeading">
            <div>
              <p className="eyebrow">Course operating standard</p>
              <h2>Methodology first. Legal by design. Evidence-ready.</h2>
            </div>
          </div>
          <div className="cardGrid">
            {standards.map(([title, description]) => (
              <article className="featureCard" key={title}>
                <div className="featureCard__marker" aria-hidden="true" />
                <h3>{title}</h3>
                <p>{description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="section" id="guardrails">
          <div className="guardrailPanel">
            <div className="guardrailPanel__icon" aria-hidden="true">!</div>
            <div>
              <p className="eyebrow">Non-negotiable boundary</p>
              <h2>Public sources only.</h2>
              <p>
                The course does not authorise credential testing, access-control bypass, evasion,
                exploitation, harassment, doxxing or collection behind login walls.
              </p>
            </div>
          </div>
        </section>

        <section className="section section--cta">
          <div>
            <p className="eyebrow">Ready to begin?</p>
            <h2>Enrol first. Learn inside the protected Academy environment.</h2>
            <p>Course content is not published on the public website.</p>
          </div>
          <div className="actionRow">
            <Link className="button button--primary button--lg" to="/enrol">Enrol now</Link>
            <Link className="button button--secondary button--lg" to="/login">Sign in</Link>
          </div>
        </section>
      </main>
    </Layout>
  );
}
