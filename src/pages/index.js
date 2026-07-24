import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';

const features=[
  ['Methodology first','Apply a stable 12-step operating model instead of relying on individual tools.'],
  ['Legal by design','Build authority, boundaries, proportionality and privacy into every collection decision.'],
  ['Evidence-ready','Record source, time, relevance, sensitivity and confidence from the first artefact.']
];

export default function Home(){return <Layout title="OSINT Investigation Methodology" description="Self-paced OSINT investigation training from Skunkworks Academy">
  <header className="heroBanner"><div className="heroGrid"><div>
    <div className="eyebrow">Skunkworks Academy · Self-paced course</div>
    <h1 className="heroTitle">FIND WHAT IS ALREADY THERE.</h1>
    <p className="heroCopy">Move from ad-hoc searching to structured intelligence work. Learn a lawful, ethical and defensible OSINT investigation methodology built around requirements, verification and restrained reporting.</p>
    <div className="actionRow"><Link className="button button--primary button--lg" to="/course/welcome">Start course</Link><Link className="button button--secondary button--lg" to="/course/guardrails">Review guardrails</Link></div>
  </div><div className="panel radar"><strong>OSINT<br/>SKUNKWORKS</strong></div></div></header>
  <main><section className="section"><div className="eyebrow">Course operating standard</div><h2>Methodology first. Legal by design. Evidence-ready.</h2><div className="cardGrid">{features.map(([t,d])=><article className="featureCard" key={t}><h3>{t}</h3><p>{d}</p></article>)}</div><div className="metricGrid"><div className="metric"><strong>12</strong>workflow steps</div><div className="metric"><strong>5</strong>learning stages</div><div className="metric"><strong>1</strong>controlled case study</div><div className="metric"><strong>0</strong>unauthorised access</div></div></section>
  <section className="section"><div className="guardrail"><strong>Public sources only.</strong> No credential testing, access-control bypass, evasion, exploitation, harassment or doxxing.</div></section></main>
</Layout>}
