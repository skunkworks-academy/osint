import React from 'react';
import Layout from '@theme/Layout';
import AccessGate from '../components/AccessGate';

export default function Enrol() {
  return (
    <Layout
      title="Enrol in OSINT-101"
      description="Create an Academy account and enrol before accessing OSINT-101 course lessons."
    >
      <main className="section pageShell">
        <AccessGate mode="enrol" />
      </main>
    </Layout>
  );
}
