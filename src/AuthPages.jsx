import React, {useState} from 'react';
import {
  authFailureMessage,
  handleAvailabilityRequest,
  loginNoticeFromSearch,
  signupPlanFromSearch,
  validateSignupDetails
} from './signup.js';

const planOptions = {
  starter: {name: 'Starter', price: 'Free', description: 'Core storefront, offers, design, and basic analytics.'},
  pro: {name: 'Creator Pro', price: '₹999 / month', description: 'Premium growth tools. Proposed test-stage pricing; no charge is made yet.'}
};

function AuthBrand() {
  return <a className="auth-brand" href="/"><span>CS</span><b>Creator Store</b></a>;
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

export function Signup({request}) {
  const [plan, setPlan] = useState(signupPlanFromSearch(location.search));
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({handle: '', displayName: '', email: '', phone: '', password: ''});
  const [message, setMessage] = useState('');
  const [working, setWorking] = useState(false);

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
      await request('/api/auth/register', {method: 'POST', body: JSON.stringify(form)});
      location.assign(plan === 'pro' ? '/dashboard/settings?tab=billing&plan=pro' : '/dashboard/');
    } catch (error) {setMessage(authFailureMessage('registration', error.status))} finally {setWorking(false)}
  };

  return <main className="auth-page">
    <header><AuthBrand/><a href="/login">Already have an account? <b>Sign in</b></a></header>
    <div className="auth-layout">
      <aside><span className="marketing-kicker">CREATE YOUR STORE</span><h1>A professional creator business starts here.</h1><p>Claim your address, build your storefront, and make every promotion easier to discover.</p><div className="auth-mini-preview"><span>yourstore.test/{form.handle || 'yourname'}</span><article>📌 <b>Your featured offer</b><em>→</em></article><article>🏷 <b>Your partner promotion</b><em>→</em></article></div></aside>
      <section className="auth-card">
        <TestEnvironmentWarning/>
        <SignupSteps step={step}/>
        <form onSubmit={submit} noValidate>
          {step === 1 && <div className="signup-stage"><span className="stage-label">STEP 1 OF 3</span><h2>Choose how you want to start</h2><p>You can change plans later.</p><div className="signup-plan-options" role="group" aria-label="Choose a plan">{Object.entries(planOptions).map(([id, option]) => <button type="button" aria-pressed={plan === id} className={plan === id ? 'selected' : ''} onClick={() => setPlan(id)} key={id}><span>{id === 'pro' ? '✦' : '◇'}</span><div><b>{option.name}</b><small>{option.description}</small></div><strong>{option.price}</strong></button>)}</div><button type="button" className="marketing-button full" onClick={() => setStep(2)}>Continue with {planOptions[plan].name}</button></div>}
          {step === 2 && <div className="signup-stage"><span className="stage-label">STEP 2 OF 3</span><h2>Tell us about your store</h2><p>These details create your test account and public profile.</p><div className="auth-fields"><label>Creator or business name<input autoComplete="name" maxLength="80" required placeholder="Alex Creates" value={form.displayName} onChange={event => update('displayName', event.target.value)}/></label><label>Public store address<div className="handle-field"><span>/</span><input autoCapitalize="none" autoComplete="username" maxLength="40" required placeholder="alex_creates" value={form.handle} onChange={event => update('handle', event.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}/></div><small>Letters, numbers, and underscores only.</small></label><label>Email<input autoComplete="email" type="email" required placeholder="alex@example.com" value={form.email} onChange={event => update('email', event.target.value)}/></label><label>Phone <small>(optional)</small><input autoComplete="tel" type="tel" maxLength="32" placeholder="+91 98765 43210" value={form.phone} onChange={event => update('phone', event.target.value)}/></label><label>Password<input autoComplete="new-password" type="password" minLength="8" required placeholder="At least 8 characters" value={form.password} onChange={event => update('password', event.target.value)}/></label></div>{message && <p className="auth-error" role="alert">{message}</p>}<div className="auth-buttons"><button type="button" className="marketing-button ghost" disabled={working} onClick={() => {setMessage(''); setStep(1)}}>Back</button><button type="button" className="marketing-button" disabled={working} onClick={continueFromDetails}>{working ? 'Checking store address…' : 'Review account'}</button></div></div>}
          {step === 3 && <div className="signup-stage"><span className="stage-label">STEP 3 OF 3</span><h2>Review and create</h2><div className="signup-review"><div><span>Plan</span><b>{planOptions[plan].name}</b><small>{planOptions[plan].price}</small></div><div><span>Store</span><b>/{form.handle}</b><small>{form.displayName}</small></div><div><span>Login</span><b>{form.email}</b><small>{form.phone || 'No phone added'}</small></div></div>{plan === 'pro' && <div className="secure-billing-note"><b>🔒 Premium billing boundary</b><p>After account creation, Billing will show the hosted Razorpay/Stripe subscription step. This test build does not request a card or activate Premium until that backend subscription flow is configured and verified.</p></div>}{plan === 'starter' && <div className="secure-billing-note"><b>No card required</b><p>Starter creates the account immediately. You can choose Premium later from Billing.</p></div>}{message && <p className="auth-error" role="alert">{message}</p>}<div className="auth-buttons"><button type="button" className="marketing-button ghost" disabled={working} onClick={() => setStep(2)}>Back</button><button className="marketing-button" disabled={working}>{working ? 'Creating account…' : 'Create account'}</button></div></div>}
        </form>
      </section>
    </div>
  </main>;
}

export function Login({request, onSuccess}) {
  const [form, setForm] = useState({handleOrEmail: '', password: ''});
  const [error, setError] = useState('');
  const [working, setWorking] = useState(false);
  const notice = loginNoticeFromSearch(location.search);
  const submit = async event => {event.preventDefault(); setError(''); setWorking(true); try {onSuccess(await request('/api/auth/login', {method: 'POST', body: JSON.stringify(form)}))} catch (failure) {setError(authFailureMessage('login', failure.status))} finally {setWorking(false)}};
  return <main className="auth-page login-page"><header><AuthBrand/><a href="/signup">New here? <b>Create a store</b></a></header><div className="login-wrap"><section className="auth-card"><TestEnvironmentWarning/>{notice && <p className="auth-success" role="status">{notice}</p>}<span className="marketing-kicker">WELCOME BACK</span><h1>Sign in to Creator Store</h1><p>Manage your storefront, products, promotions, and audience.</p><form onSubmit={submit}><div className="auth-fields"><label>Username or email<input autoComplete="username" required value={form.handleOrEmail} onChange={event => setForm({...form, handleOrEmail: event.target.value})}/></label><label>Password<input autoComplete="current-password" required type="password" value={form.password} onChange={event => setForm({...form, password: event.target.value})}/></label></div>{error && <p className="auth-error" role="alert">{error}</p>}<button className="marketing-button full" disabled={working}>{working ? 'Signing in…' : 'Sign in'}</button></form></section></div></main>;
}
