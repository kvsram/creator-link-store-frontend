import React, {useEffect, useLayoutEffect, useState} from 'react';
import {
  authFailureMessage,
  isInsecureHttpLocation,
  loginNoticeFromSearch,
  signupRegistrationPayload,
  signupPlanFromSearch,
  validateSignupDetails
} from './signup.js';
import {
  consumePostVerificationDestination,
  failureCode,
  needsEmailVerification,
  pendingVerificationDetails,
  recoveryEmailPayload,
  rememberPostVerificationIntent,
  requireActiveAuthAccount,
  requirePendingRegistration,
  resendCooldownSeconds,
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
  return <ol className="signup-steps" aria-label={`Signup progress: step ${step} of 2`}>{['Choose plan', 'Create account'].map((label, index) => {
    const number = index + 1;
    return <li className={step >= number ? 'active' : ''} aria-current={step === number ? 'step' : undefined} key={label}><span>{number}</span>{label}</li>;
  })}</ol>;
}

function TestEnvironmentWarning() {
  if (!isInsecureHttpLocation(globalThis.location)) return null;
  return <div className="auth-test-warning" role="note" aria-label="HTTP test environment warning">
    <b>HTTP TEST ENVIRONMENT</b>
    <span>Use synthetic names, email addresses, and passwords only. Do not reuse personal or production credentials until TLS is enabled.</span>
  </div>;
}

function intentStorage() {
  try { return globalThis.localStorage } catch { return null }
}

function PendingVerification({request, details, compact = false}) {
  const [email, setEmail] = useState(details.email || '');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [working, setWorking] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const timer = setTimeout(() => setCooldown(value => Math.max(0, value - 1)), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);
  const resend = async event => {
    event.preventDefault();
    const invalid = validateRecoveryEmail(email);
    setError(invalid); setMessage('');
    if (invalid || working || cooldown > 0) return;
    setWorking(true);
    try {
      const response = await request('/api/v1/auth/email-verifications/resend', {
        method: 'POST', body: JSON.stringify(recoveryEmailPayload(email))
      });
      setMessage('If an eligible pending account matches that email, a fresh verification link is on its way.');
      setCooldown(resendCooldownSeconds(response));
    } catch (failure) {
      if (failure.status === 429) setCooldown(resendCooldownSeconds(failure.payload));
      setError(failure.status === 429
        ? 'Too many requests. Wait for the timer, then try again.'
        : 'We could not request another email right now. Try again.');
    } finally {setWorking(false)}
  };
  return <section className={`verification-state ${compact ? 'compact' : ''}`}>
    <span className="verification-icon" aria-hidden="true">✉</span>
    <span className="marketing-kicker">CHECK YOUR INBOX</span>
    <h1>Verify your email</h1>
    <p>We sent a one-time verification link to <b>{details.emailHint}</b>. Open it to activate your creator account.</p>
    {details.expiresAt && <small>The link expires {new Date(details.expiresAt).toLocaleString()}.</small>}
    <form className="verification-resend" onSubmit={resend} noValidate>
      <label>Need another link?<input type="email" autoComplete="email" required placeholder="Enter your full email" value={email} onChange={event => {setEmail(event.target.value);setError('');setMessage('')}}/><small>Enter the complete account email. We never reconstruct it from the masked address above.</small></label>
      <button type="submit" className="marketing-button full" disabled={working || cooldown > 0}>{working ? 'Requesting…' : cooldown > 0 ? `Try again in ${cooldown}s` : 'Resend verification email'}</button>
    </form>
    {message && <p className="auth-success" role="status">{message}</p>}
    {error && <p className="auth-error" role="alert">{error}</p>}
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
  const [form, setForm] = useState({displayName: '', email: '', password: ''});
  const [message, setMessage] = useState('');
  const [working, setWorking] = useState(false);
  const [pending, setPending] = useState(null);

  const update = (key, value) => setForm(current => ({...current, [key]: value}));
  const submit = async event => {
    event.preventDefault();
    const invalid = validateSignupDetails(form);
    if (invalid) {setMessage(invalid); setStep(2); return}
    setMessage(''); setWorking(true);
    try {
      const options = {method: 'POST', body: JSON.stringify(signupRegistrationPayload(form))};
      const response = await request('/api/v1/auth/registrations', options);
      if (verificationRequired(response)) {
        requirePendingRegistration(response);
        rememberPostVerificationIntent(intentStorage(), plan);
        setPending(pendingVerificationDetails(response, form.email));
        return;
      }
      requireActiveAuthAccount(response);
      rememberPostVerificationIntent(intentStorage(), 'starter');
      location.assign(plan === 'pro' ? '/dashboard/settings?tab=billing&plan=pro' : '/dashboard/');
    } catch (error) {setMessage(authFailureMessage('registration', error.status, failureCode(error)))} finally {setWorking(false)}
  };

  if (pending) return <main className="auth-page login-page"><AuthHeader action={<a href="/login">Already verified? <b>Sign in</b></a>}/><div className="login-wrap"><section className="auth-card"><TestEnvironmentWarning/><PendingVerification request={request} details={pending}/></section></div></main>;

  return <main className="auth-page">
    <AuthHeader action={<a href="/login">Already have an account? <b>Sign in</b></a>}/>
    <div className="auth-layout">
      <aside><span className="marketing-kicker">CREATE YOUR STORE</span><h1>A professional creator business starts here.</h1><p>Create your account, add your offers, and make every promotion easier to discover.</p><div className="auth-mini-preview"><span>yourstore.test/your-link</span><article>📌 <b>Your featured offer</b><em>→</em></article><article>🏷 <b>Your partner promotion</b><em>→</em></article></div></aside>
      <section className="auth-card">
        <TestEnvironmentWarning/>
        <SignupSteps step={step}/>
        <form onSubmit={submit} noValidate>
          {step === 1 && <div className="signup-stage"><span className="stage-label">STEP 1 OF 2</span><h2>Choose how you want to start</h2><p>You can change plans later.</p><div className="signup-plan-options" role="group" aria-label="Choose a plan">{Object.entries(planOptions).map(([id, option]) => <button type="button" aria-pressed={plan === id} className={plan === id ? 'selected' : ''} onClick={() => setPlan(id)} key={id}><span>{id === 'pro' ? '✦' : '◇'}</span><div><b>{option.name}</b><small>{option.description}</small></div><strong>{option.price}</strong></button>)}</div><button type="button" className="marketing-button full" onClick={() => setStep(2)}>Continue with {planOptions[plan].name}</button></div>}
          {step === 2 && <div className="signup-stage"><span className="stage-label">STEP 2 OF 2</span><h2>Create your account</h2><p>Just the essentials. You can complete your profile after signing in.</p><div className="auth-fields"><label>Creator or business name<input autoComplete="name" maxLength="80" required placeholder="Alex Creates" value={form.displayName} onChange={event => update('displayName', event.target.value)}/></label><label>Email<input autoComplete="email" type="email" required placeholder="alex@example.com" value={form.email} onChange={event => update('email', event.target.value)}/></label><label>Password<input autoComplete="new-password" type="password" minLength="12" required placeholder="At least 12 characters" value={form.password} onChange={event => update('password', event.target.value)}/></label></div><div className="secure-billing-note"><b>Your store link is automatic</b><p>We create it for you. You can rename it later in Settings → Profile.</p></div>{plan === 'pro' && <div className="secure-billing-note"><b>Premium is not charged yet</b><p>Billing stays in test mode until hosted Razorpay or Stripe checkout is configured and verified.</p></div>}{message && <p className="auth-error" role="alert">{message}</p>}<div className="auth-buttons"><button type="button" className="marketing-button ghost" disabled={working} onClick={() => {setMessage(''); setStep(1)}}>Back</button><button className="marketing-button" disabled={working}>{working ? 'Creating account…' : 'Create my store'}</button></div></div>}
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
      onSuccess(requireActiveAuthAccount(await request('/api/v1/auth/sessions', options)));
    } catch (failure) {
      if (needsEmailVerification(failure)) {
        setUnverified(pendingVerificationDetails(failure.payload, form.handleOrEmail));
      } else setError(authFailureMessage('login', failure.status, failureCode(failure)));
    } finally {setWorking(false)}
  };
  return <main className="auth-page login-page"><AuthHeader action={<a href="/signup">New here? <b>Create a store</b></a>}/><div className="login-wrap"><section className="auth-card"><TestEnvironmentWarning/>{notice && <p className="auth-success" role="status">{notice}</p>}{unverified ? <PendingVerification request={request} details={unverified} compact/> : <><span className="marketing-kicker">WELCOME BACK</span><h1>Sign in to Creator Store</h1><p>Manage your storefront, products, promotions, and audience.</p><form onSubmit={submit}><div className="auth-fields"><label>Username or email<input autoComplete="username" required value={form.handleOrEmail} onChange={event => setForm({...form, handleOrEmail: event.target.value})}/></label><label>Password<input autoComplete="current-password" required type="password" value={form.password} onChange={event => setForm({...form, password: event.target.value})}/></label></div><div className="auth-inline-link"><a href="/forgot-password">Forgot password?</a></div>{error && <p className="auth-error" role="alert">{error}</p>}<button className="marketing-button full" disabled={working}>{working ? 'Signing in…' : 'Sign in'}</button></form></>}</section></div></main>;
}

export function VerifyEmail({request}) {
  const [token] = useState(() => tokenFromSearch(location.search, location.hash));
  const [state, setState] = useState(token ? 'working' : 'missing');
  const [message, setMessage] = useState('');
  const [destination, setDestination] = useState('/dashboard/');
  useLayoutEffect(() => {if (token) scrubAuthTokenFromHistory(location, history)}, [token]);
  useEffect(() => {
    if (!token) return;
    let active = true;
    request('/api/v1/auth/email-verifications', {method: 'POST', body: JSON.stringify({token})})
      .then(response => {
        requireActiveAuthAccount(response);
        if (active) {
          setDestination(consumePostVerificationDestination(intentStorage()));
          setState('success');
        }
      })
      .catch(failure => {if (active) {setState('error'); setMessage(authFailureMessage('verification', failure.status, failureCode(failure)))}});
    return () => {active = false};
  }, [request, token]);
  return <main className="auth-page login-page"><AuthHeader action={<a href="/login">Return to <b>sign in</b></a>}/><div className="login-wrap"><section className="auth-card auth-result-card"><span className="verification-icon" aria-hidden="true">{state === 'success' ? '✓' : state === 'working' ? '…' : '!'}</span>{state === 'working' && <><h1>Verifying your email</h1><p>Please keep this page open for a moment.</p></>}{state === 'success' && <><h1>Email verified</h1><p>Your creator account is active and this browser is signed in.</p>{destination.includes('plan=pro')&&<p>Your Creator Pro interest is saved only as a billing-page reminder. Your account remains on Starter and no charge or premium entitlement was created.</p>}<a className="marketing-button full" href={destination}>{destination.includes('plan=pro')?'Review Creator Pro':'Open your dashboard'}</a></>}{state === 'missing' && <><h1>Verification link required</h1><p>Open the complete link from your verification email. The token is missing from this address.</p><a className="marketing-button full" href="/login">Return to sign in</a></>}{state === 'error' && <><h1>We could not verify this link</h1><p className="auth-error" role="alert">{message}</p><a className="marketing-button full" href="/login">Return to sign in</a></>}</section></div></main>;
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
  const [token] = useState(() => tokenFromSearch(location.search, location.hash));
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
    } catch (failure) {setError(authFailureMessage('reset', failure.status, failureCode(failure)))} finally {setWorking(false)}
  };
  return <main className="auth-page login-page"><AuthHeader action={<a href="/login">Return to <b>sign in</b></a>}/><div className="login-wrap"><section className="auth-card auth-result-card"><span className="verification-icon" aria-hidden="true">⌁</span><span className="marketing-kicker">CHOOSE A NEW PASSWORD</span><h1>{saved ? 'Password changed' : token ? 'Secure your account' : 'Reset link required'}</h1>{saved ? <><p>Your existing sessions were invalidated. Use the new password the next time you sign in.</p><a className="marketing-button full" href="/login?reset=1">Continue to sign in</a></> : !token ? <><p className="auth-error" role="alert">Open the complete password-reset link from your email. The one-time token is missing from this address.</p><a className="marketing-button full" href="/forgot-password">Request a new reset link</a></> : <form onSubmit={submit} noValidate><p>Use at least 12 characters and do not reuse a password from another service.</p><div className="auth-fields"><label>New password<input autoComplete="new-password" type="password" minLength="12" required value={form.password} onChange={event => setForm({...form, password: event.target.value})}/></label><label>Confirm new password<input autoComplete="new-password" type="password" minLength="12" required value={form.confirmation} onChange={event => setForm({...form, confirmation: event.target.value})}/></label></div>{error && <p className="auth-error" role="alert">{error}</p>}<button className="marketing-button full" disabled={working}>{working ? 'Changing password…' : 'Change password'}</button></form>}</section></div></main>;
}
