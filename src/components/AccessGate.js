import React from 'react';
import Link from '@docusaurus/Link';

const PORTAL_URL = 'https://portal.skunkworksacademy.com/';
const CHECKOUT_URL =
  'https://portal.skunkworksacademy.com/checkout/?course=OSINT-101';

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
              <strong>Enrol in OSINT-101</strong>
              <p>Purchase, receive or confirm an active enrolment entitlement.</p>
            </div>
          </div>
          <div className="accessStep">
            <span>3</span>
            <div>
              <strong>Open the course from My Learning</strong>
              <p>Returning learners should sign in and launch the course from the Academy Portal.</p>
            </div>
          </div>
        </div>

        <div className="actionRow accessGate__actions">
          {signInFirst ? (
            <>
              <a className="button button--primary button--lg" href={PORTAL_URL}>
                Sign in to Academy Portal
              </a>
              <a className="button button--secondary button--lg" href={CHECKOUT_URL}>
                Enrol in OSINT-101
              </a>
            </>
          ) : (
            <>
              <a className="button button--primary button--lg" href={CHECKOUT_URL}>
                Enrol in OSINT-101
              </a>
              <a className="button button--secondary button--lg" href={PORTAL_URL}>
                Create account or sign in
              </a>
            </>
          )}
          <Link className="button button--ghost button--lg" to="/">
            Return to overview
          </Link>
        </div>

        <div className="accessGate__assurance">
          <strong>Why access is restricted</strong>
          <p>
            The public website contains only course information. Lesson bodies are not included in
            the public build. Access must be granted by the Academy identity and enrolment service.
          </p>
        </div>
      </div>
    </section>
  );
}
