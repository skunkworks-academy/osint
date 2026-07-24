import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';

const resources = [
  {
    title: 'Investigation log',
    description: 'Record source, URL, timestamp, artefact, SIR relevance, sensitivity and confidence.',
    label: 'Open log template',
    to: '/course/resources/investigation-templates',
  },
  {
    title: 'Findings matrix',
    description: 'Structure each finding by SIR, sensitivity, confidence and handling.',
    label: 'Open reporting guidance',
    to: '/course/analysis/reporting',
  },
  {
    title: 'Release checklist',
    description: 'Confirm redactions, traceability, confidence, review and action ownership.',
    label: 'Open final checklist',
    to: '/course/assessment/final-assessment',
  },
];

export default function Resources() {
  return (
    <Layout
      title="Investigation resources"
      description="OSINT investigation logs, findings matrices and release-checking resources."
    >
      <main className="section">
        <div className="eyebrow">Course resources</div>
        <h1>Investigation templates</h1>
        <p>
          Use these resources throughout the course to keep collection traceable,
          proportionate and evidence-ready.
        </p>
        <div className="cardGrid">
          {resources.map((resource) => (
            <article className="featureCard" key={resource.title}>
              <h3>{resource.title}</h3>
              <p>{resource.description}</p>
              <Link to={resource.to}>{resource.label}</Link>
            </article>
          ))}
        </div>
      </main>
    </Layout>
  );
}
