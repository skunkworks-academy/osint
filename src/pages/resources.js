import React from 'react';
import Layout from '@theme/Layout';
import AccessGate from '../components/AccessGate';

export default function Resources() {
  return (
    <Layout
      title="Learner resources"
      description="OSINT-101 templates and learner resources require an Academy account and active enrolment."
    >
      <main className="section pageShell">
        <AccessGate mode="signin" />
      </main>
    </Layout>
  );
}
