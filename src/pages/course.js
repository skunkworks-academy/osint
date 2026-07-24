import React from 'react';
import Layout from '@theme/Layout';
import AccessGate from '../components/AccessGate';

export default function CourseAccess() {
  return (
    <Layout
      title="Course access required"
      description="OSINT-101 lessons require an Academy account and active enrolment."
    >
      <main className="section pageShell">
        <AccessGate mode="signin" />
      </main>
    </Layout>
  );
}
