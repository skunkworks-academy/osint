import React from 'react';
import Layout from '@theme/Layout';
import AccessGate from '../components/AccessGate';

export default function Login() {
  return (
    <Layout
      title="Learner sign-in"
      description="Sign in to the Skunkworks Academy Portal to access enrolled OSINT-101 learning."
    >
      <main className="section pageShell">
        <AccessGate mode="signin" />
      </main>
    </Layout>
  );
}
