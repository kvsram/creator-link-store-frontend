import React, {useEffect, useLayoutEffect, useState} from 'react';
import {
  authFailureMessage,
  handleAvailabilityRequest,
  loginNoticeFromSearch,
  signupPlanFromSearch,
  validateSignupDetails
} from './signup.js';
import {
  failureCode,
  needsEmailVerification,
  pendingVerificationDetails,
  recoveryEmailPayload,
  requestV1WithFallback,
  resetPasswordPayload,
  scrubAuthTokenFromHistory,
  tokenFromSearch,
  validateNewPassword,
  validateRecoveryEmail,
  verificationRequired
} from './identityAuth.js';

const planOptions = {
  starter: {name: 'Starter', price: 'Free', description: 'Core storefront, offers, design, and basic analytics.'},
  pro: {name: 'Creator Pro', price: '₹999 / month', description: 'Premium growth tools. Proposed test-stage pricing; no charge is made yet.'}
};

function AuthBrand() {
  return <a className="auth-brand" href="/"><span>CS</span><b>Creator Store</b></a>;
}

function AuthHeader({action}) {
  return <header><AuthBrand/>{action}</header>;
}

function SignupSteps({step}) {
  return <ol className="signup-steps" aria-label={`Signup progress: step ${step} of 3`}>{['Choose plan', 'Your details', 'Review'].map((label, index) => {
    const number = index + 1;
    return <li className={step >= number ? 'active' : ''} aria-current={step === number ? 'step' : undefined} key={label}><span>{number}</span>{label}</li>;
  })}</ol>;
}

function TestEnvironmentWarning() {
  return <div className="auth-test-warning" role="note" aria-label="HTTP test environment warning">
    <b>HTTP TEST ENVIRONMENT</b>
    <span>Use synthetic names, email addresses, phone numbers, and passwords only. Do not reuse personal or production credentials until TLS is enabled.</span>
  </div>;
}

function PendingVerification({details, compact = false}) {
  return <section className={`verification-state ${compact ? 'compact' : ''}`}>
    <span className="verification-icon" aria-hidden="true">✉</span>
    <span className="marketing-kicker">CHECK YOUR INBOX</span>
    <h1>Verify your email</h1>
    <p>We sent a one-time verification link to <b>{details.emailHint}</b>. Open it to activate your creator account.</p>
    {details.expiresAt && <small>The link expires {new Date(details.expiresAt).toLocaleString()}.</small>}
    <div className="verification-actions">
      <a className="marketing-button" href="/login">Back to sign in</a>
      <a className="marketing-button ghost" href="/signup">Start again</a>
    </div>
    <small>For your security, this page never displays the verification token.</small>
  </section>;
}

export function Signup({request}) {
  const [plan, setPlan] = useState(signupPlanFromSearch(location.search));
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({handle: '', displayName: '', email: '', phone: '', password: ''});
  const [message, setMessage] = useState('');
  const [working, setWorking] = useState(false);
  const [pending, setPending] = useState(null);

  const update = (key, value) => setForm(current => ({...current, [key]: value}));
  const continueFromDetails = async () => {
    const error = validateSignupDetails(form);
    setMessage(error);
    if (error) return;
    setWorking(true);
    try {
      const availability = await request('/api/v1/authentication/check-unique-taken', {
        method: 'POST', body: JSON.stringify(handleAvailabilityRequest(form))
      });
      if (availability.username_taken) {setMessage('That public store address is already used or reserved.'); return}
      setStep(3);
    } catch (failure) {setMessage(authFailureMessage('availability', failure.status))} finally {setWorking(false)}
  };
  const submit = async event => {
    event.preventDefault();
    const invalid = validateSignupDetails(form);
    if (invalid) {setMessage(invalid); setStep(2); return}
    setMessage(''); setWorking(true);
    try {
      const options = {method: 'POST', body: JSON.stringify(form)};
      const response = await requestV1WithFallback(
        request, '/api/v1/auth/registrations', '/api/auth/register', options
      );
      if (verificationRequired(response)) {
        setPending(pendingVerificationDetails(response, form.email));
        return;
      }
      location.assign(plan === 'pro' ? '/dashboard/settings?tab=billing&plan=pro' : '/dashboard/');
    } catch (error) {setMessage(authFailureMessage('registration', error.status))} finally {setWorking(false)}
  };

  if (pending) return <main className="auth-page login-page"><AuthHeader action={<a href="/login">Already verified? <b>Sign in</b></a>}/><div className="login-wrap"><section className="auth-card"><TestEnvironmentWarning/><PendingVerification details={pending}/></section></div></main>;

  return <main className="auth-page">
    <AuthHeader action={<a href="/login">Already have an account? <b>Sign in</b></a>}/>
    <div className="auth-layout">
      <aside><span className="marketing-kicker">CREATE YOUR STORE</span><h1>A professional creator business starts here.</h1><p>Claim your address, build your storefront, and make every promotion easier to discover.</p><div className="auth-mini-preview"><span>yourstore.test/{form.handle || 'yourname'}</span><article>📌 <b>Your featured offer</b><em>→</em></article><article>🏷 <b>Your partner promotion</b><em>→</em></article></div></aside>
      <section className="auth-card">
        <TestEnvironmentWarning/>
        <SignupSteps step={step}/>
        <form onSubmit={submit} noValidate>
          {step === 1 && <div className="signup-stage"><span className="stage-label">STEP 1 OF 3</span><h2>Choose how you want to start</h2><p>You can change plans later.</p><div className="signup-plan-options" role="group" aria-label="Choose a plan">{Object.entries(planOptions).map(([id, option]) => <button type="button" aria-pressed={plan === id} className={plan === id ? 'selected' : ''} onClick={() => setPlan(id)} key={id}><span>{id === 'pro' ? '✦' : '◇'}</span><div><b>{option.name}</b><small>{option.description}</small></div><strong>{option.price}</strong></button>)}</div><button type="button" className="marketing-button full" onClick={() => setStep(2)}>Continue with {planOptions[plan].name}</button></div>}
          {step === 2 && <div className="signup-stage"><span className="stage-label">STEP 2 OF 3</span><h2>Tell us about your store</h2><p>These details create your test account and public profile.</p><div className="auth-fields"><label>Creator or business name<input autoComplete="name" maxLength="80" required placeholder="Alex Creates" value={form.displayName} onChange={event => update('displayName', event.target.value)}/></label><label>Public store address<div className="handle-field"><span>/</span><input autoCapitalize="none" autoComplete="username" maxLength="40" required placeholder="alex_creates" value={form.handle} onChange={event => update('handle', event.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}/></div><small>Letters, numbers, and underscores only.</small></label><label>Email<input autoComplete="email" type="email" required placeholder="alex@example.com" value={form.email} onChange={event => update('email', event.target.value)}/></label><label>Phone <small>(optional)</small><input autoComplete="tel" type="tel" maxLength="32" placeholder="+91 98765 43210" value={form.phone} onChange={event => update('phone', event.target.value)}/></label><label>Password<input autoComplete="new-password" type="password" minLength="15" required placeholder="At least 15 characters" value={form.password} onChange={event => update('password', event.target.value)}/></label></div>{message && <p className="auth-error" role="alert">{message}</p>}<div className="auth-buttons"><button type="button" className="marketing-button ghost" disabled={working} onClick={() => {setMessage(''); setStep(1)}}>Back</button><button type="button" className="marketing-button" disabled={working} onClick={continueFromDetails}>{working ? 'Checking store address…' : 'Review account'}</button></div></div>}
          {step === 3 && <div className="signup-stage"><span className="stage-label">STEP 3 OF 3</span><h2>Review and create</h2><div className="signup-review"><div><span>Plan</span><b>{planOptions[plan].name}</b><small>{planOptions[plan].price}</small></div><div><span>Store</span><b>/{form.handle}</b><small>{form.displayName}</small></div><div><span>Login</span><b>{form.email}</b><small>{form.phone || 'No phone added'}</small></div></div>{plan === 'pro' && <div className="secure-billing-note"><b>🔒 Premium billing boundary</b><p>After account creation, Billing will show the hosted Razorpay/Stripe subscription step. This test build does not request a card or activate Premium until that backend subscription flow is configured and verified.</p></div>}{plan === 'starter' && <div className="secure-billing-note"><b>No card required</b><p>Starter creates the account after email verification. You can choose Premium later from Billing.</p></div>}{message && <p className="auth-error" role="alert">{message}</p>}<div className="auth-buttons"><button type="button" className="marketing-button ghost" disabled={working} onClick={() => setStep(2)}>Back</button><button className="marketing-button" disabled={working}>{working ? 'Creating account…' : 'Create account'}</button></div></div>}
        </form>
      </section>
    </div>
  </main>;
}

export function Login({request, onSuccess}) {
  const [form, setForm] = useState({handleOrEmail: '', password: ''});
  const [error, setError] = useState('');
  const [working, setWorking] = useState(false);
  const [unverified, setUnverified] = useState(null);
  const notice = loginNoticeFromSearch(location.search);
  const submit = async event => {
    event.preventDefault(); setError(''); setUnverified(null); setWorking(true);
    try {
      const options = {method: 'POST', body: JSON.stringify(form)};
      onSuccess(await requestV1WithFallback(request, '/api/v1/auth/sessions', '/api/auth/login', options));
    } catch (failure) {
      if (needsEmailVerification(failure)) {
        setUnverified(pendingVerificationDetails(failure.payload, form.handleOrEmail));
      } else setError(authFailureMessage('login', failure.status, failureCode(failure)));
    } finally {setWorking(false)}
  };
  return <main className="auth-page login-page"><AuthHeader action={<a href="/signup">New here? <b>Create a store</b></a>}/><div className="login-wrap"><section className="auth-card"><TestEnvironmentWarning/>{notice && <p className="auth-success" role="status">{notice}</p>}{unverified ? <PendingVerification details={unverified} compact/> : <><span className="marketing-kicker">WELCOME BACK</span><h1>Sign in to Creator Store</h1><p>Manage your storefront, products, promotions, and audience.</p><form onSubmit={submit}><div className="auth-fields"><label>Username or email<input autoComplete="username" required value={form.handleOrEmail} onChange={event => setForm({...form, handleOrEmail: event.target.value})}/></label><label>Password<input autoComplete="current-password" required type="password" value={form.password} onChange={event => setForm({...form, password: event.target.value})}/></label></div><div className="auth-inline-link"><a href="/forgot-password">Forgot password?</a></div>{error && <p className="auth-error" role="alert">{error}</p>}<button className="marketing-button full" disabled={working}>{working ? 'Signing in…' : 'Sign in'}</button></form></>}</section></div></main>;
}

export function VerifyEmail({request}) {
  const [token] = useState(() => tokenFromSearch(location.search));
  const [state, setState] = useState(token ? 'working' : 'missing');
  const [message, setMessage] = useState('');
  useLayoutEffect(() => {if (token) scrubAuthTokenFromHistory(location, history)}, [token]);
  useEffect(() => {
    if (!token) return;
    let active = true;
    request('/api/v1/auth/email-verifications', {method: 'POST', body: JSON.stringify({token})})
      .then(() => {if (active) setState('success')})
      .catch(failure => {if (active) {setState('error'); setMessage(authFailureMessage('verification', failure.status))}});
    return () => {active = false};
  }, [request, token]);
  return <main className="auth-page login-page"><AuthHeader action={<a href="/login">Return to <b>sign in</b></a>}/><div className="login-wrap"><section className="auth-card auth-result-card"><span className="verification-icon" aria-hidden="true">{state === 'success' ? '✓' : state === 'working' ? '…' : '!'}</span>{state === 'working' && <><h1>Verifying your email</h1><p>Please keep this page open for a moment.</p></>}{state === 'success' && <><h1>Email verified</h1><p>Your creator account is active. Sign in to open your dashboard.</p><a className="marketing-button full" href="/login?verified=1">Continue to sign in</a></>}{state === 'missing' && <><h1>Verification link required</h1><p>Open the complete link from your verification email. The token is missing from this address.</p><a className="marketing-button full" href="/login">Return to sign in</a></>}{state === 'error' && <><h1>We could not verify this link</h1><p className="auth-error" role="alert">{message}</p><a className="marketing-button full" href="/login">Return to sign in</a></>}</section></div></main>;
}

export function ForgotPassword({request}) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [working, setWorking] = useState(false);
  const submit = async event => {
    event.preventDefault(); const invalid = validateRecoveryEmail(email); setError(invalid);
    if (invalid) return;
    setWorking(true);
    try {
      await request('/api/v1/auth/password-reset-requests', {method: 'POST', body: JSON.stringify(recoveryEmailPayload(email))});
      setSent(true);
    } catch (failure) {setError(authFailureMessage('recovery', failure.status))} finally {setWorking(false)}
  };
  return <main className="auth-page login-page"><AuthHeader action={<a href="/login">Remember it? <b>Sign in</b></a>}/><div className="login-wrap"><section className="auth-card auth-result-card"><span className="verification-icon" aria-hidden="true">↺</span><span className="marketing-kicker">ACCOUNT RECOVERY</span><h1>Reset your password</h1>{sent ? <><p>If an eligible account matches that email, we sent a one-time password-reset link. Check your inbox and spam folder.</p><a className="marketing-button full" href="/login">Return to sign in</a></> : <><p>Enter your account email. We will send instructions without revealing whether an account exists.</p><form onSubmit={submit}><div className="auth-fields"><label>Email address<input autoComplete="email" type="email" required value={email} onChange={event => setEmail(event.target.value)} placeholder="alex@example.com"/></label></div>{error && <p className="auth-error" role="alert">{error}</p>}<button className="marketing-button full" disabled={working}>{working ? 'Sending…' : 'Send reset link'}</button></form></>}</section></div></main>;
}

export function ResetPassword({request}) {
  const [token] = useState(() => tokenFromSearch(location.search));
  const [form, setForm] = useState({password: '', confirmation: ''});
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [working, setWorking] = useState(false);
  useLayoutEffect(() => {if (token) scrubAuthTokenFromHistory(location, history)}, [token]);
  const submit = async event => {
    event.preventDefault();
    if (!token) {setError('Open the complete password-reset link from your email.'); return}
    const invalid = validateNewPassword(form.password, form.confirmation); setError(invalid);
    if (invalid) return;
    setWorking(true);
    try {
      await request('/api/v1/auth/password-resets', {method: 'POST', body: JSON.stringify(resetPasswordPayload(token, form.password))});
      setSaved(true);
    } catch (failure) {setError(authFailureMessage('reset', failure.status))} finally {setWorking(false)}
  };
  return <main className="auth-page login-page"><AuthHeader action={<a href="/login">Return to <b>sign in</b></a>}/><div className="login-wrap"><section className="auth-card auth-result-card"><span className="verification-icon" aria-hidden="true">⌁</span><span className="marketing-kicker">CHOOSE A NEW PASSWORD</span><h1>{saved ? 'Password changed' : 'Secure your account'}</h1>{saved ? <><p>Your existing sessions were invalidated. Use the new password the next time you sign in.</p><a className="marketing-button full" href="/login?reset=1">Continue to sign in</a></> : <form onSubmit={submit}><p>Use at least 15 characters and do not reuse a password from another service.</p><div className="auth-fields"><label>New password<input autoComplete="new-password" type="password" minLength="15" required value={form.password} onChange={event => setForm({...form, password: event.target.value})}/></label><label>Confirm new password<input autoComplete="new-password" type="password" minLength="15" required value={form.confirmation} onChange={event => setForm({...form, confirmation: event.target.value})}/></label></div>{error && <p className="auth-error" role="alert">{error}</p>}<button className="marketing-button full" disabled={working || !token}>{working ? 'Changing password…' : 'Change password'}</button></form>}</section></div></main>;
}
