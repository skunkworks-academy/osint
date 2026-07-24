import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';

export default function Resources(){return <Layout title="Resources"><main className="section"><div className="eyebrow">Course resources</div><h1>Investigation templates</h1><div className="cardGrid"><article className="featureCard"><h3>Investigation log</h3><p>Record source, URL, timestamp, artefact, SIR relevance, sensitivity and confidence.</p></article><article className="featureCard"><h3>Findings matrix</h3><p>Structure each finding by SIR, sensitivity, confidence and handling.</p><Link to="/course/analysis/reporting">Open template guidance</Link></article><article className="featureCard"><h3>Release checklist</h3><p>Confirm redactions, traceability, confidence, review and action ownership.</p><Link to="/course/assessment/final-assessment">Open checklist</Link></article></div></main></Layout>}
