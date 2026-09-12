import React from 'react';
import Layout from '@theme/Layout';
import AccessGate from '../components/AccessGate';

export default function Dashboard() {
  return (
    <Layout
      title="Learner dashboard"
      description="The OSINT-101 learner dashboard requires an Academy account and active enrolment."
    >
      <main className="section pageShell">
        <AccessGate mode="signin" />
      </main>
    </Layout>
  );
}
