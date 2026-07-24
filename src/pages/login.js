import React from 'react';
import Layout from '@theme/Layout';

export default function Login(){return <Layout title="Sign in"><main className="section"><div className="course-lock"><div className="eyebrow">Enrolment required</div><h1>Sign in to continue</h1><p>The course shell is ready for connection to the Skunkworks Academy identity and enrolment service.</p><a className="button button--primary button--lg" href="https://portal.skunkworksacademy.com/">Open Academy Portal</a><p style={{marginTop:'1rem'}}>Production access control must be enforced by the portal or hosting layer. Client-side route hiding alone is not secure content protection.</p></div></main></Layout>}
