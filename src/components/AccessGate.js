import React from 'react';
import Link from '@docusaurus/Link';

const PORTAL_URL = 'https://portal.skunkworksacademy.com/';
const ENROLMENT_REQUEST_URL =
  'https://skunkworks.africa/products/osint-101-enrolment-request';
const SUPPORT_URL =
  'mailto:training@skunkworks.africa?subject=OSINT-101%20enrolment%20support';

export default function AccessGate({mode = 'enrol', compact = false}) {
  const signInFirst = mode === 'signin';

  return (
    <section className={`accessGate${compact ? ' accessGate--compact' : ''}`}>
      <div className="accessGate__status" role="status">
        <span className="statusDot" aria-hidden="true" />
        Protected learning area
      </div>

      <div className="accessGate__content">
        <p className="eyebrow">Account and enrolment required</p>
        <h1>{signInFirst ? 'Sign in to continue learning' : 'Enrol before opening the course'}</h1>
        <p className="accessGate__lead">
          OSINT-101 lessons, assessments and learner resources are available only to
          students with a Skunkworks Academy account and an active course enrolment.
        </p>

        <div className="accessSteps" aria-label="Course access process">
          <div className="accessStep">
            <span>1</span>
            <div>
              <strong>Create or use your Academy account</strong>
              <p>Your account provides the identity used for course access and completion records.</p>
            </div>
          </div>
          <div className="accessStep">
            <span>2</span>
            <div>
              <strong>Submit the OSINT-101 enrolment request</strong>
              <p>Use the same email address in Shopify and your Academy Portal account.</p>
            </div>
          </div>
          <div className="accessStep">
            <span>3</span>
            <div>
              <strong>Open the course from My Learning</strong>
              <p>Access is issued after Academy review and confirmation of the applicable entitlement.</p>
            </div>
          </div>
        </div>

        <div className="actionRow accessGate__actions">
          {signInFirst ? (
            <>
              <a className="button button--primary button--lg" href={PORTAL_URL}>
                Sign in to Academy Portal
              </a>
              <a className="button button--secondary button--lg" href={ENROLMENT_REQUEST_URL}>
                Submit enrolment request
              </a>
            </>
          ) : (
            <>
              <a className="button button--primary button--lg" href={ENROLMENT_REQUEST_URL}>
                Submit OSINT-101 enrolment request
              </a>
              <a className="button button--secondary button--lg" href={PORTAL_URL}>
                Create account or sign in
              </a>
            </>
          )}
          <a className="button button--ghost button--lg" href={SUPPORT_URL}>
            Get enrolment help
          </a>
          <Link className="button button--ghost button--lg" to="/">
            Return to overview
          </Link>
        </div>

        <div className="accessGate__assurance">
          <strong>Temporary enrolment route</strong>
          <p>
            The Academy subscription payment service is under maintenance. The Shopify request is
            free and records the learner details needed for manual enrolment review. It does not
            automatically grant access or charge a course fee.
          </p>
        </div>
      </div>
    </section>
  );
}
