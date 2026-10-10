import React from 'react';

const capabilities = [
  ['▣', 'One link for every offer', 'Bring products, affiliate promotions, courses, bookings, webinars, and lead magnets into one mobile-first storefront.'],
  ['↗', 'Sell and collect leads', 'Show digital-product and course offers, collect lead details, schedule calls, and prepare paid checkout through supported providers.'],
  ['✦', 'Make hot offers obvious', 'Pin the products or sponsor links that matter now so visitors see them before the rest of your catalog.'],
  ['◎', 'Understand the audience', 'See visits, promotion clicks, leads, customers, orders, and income without stitching together spreadsheets.'],
  ['✉', 'Continue the conversation', 'Prepare Instagram comment-to-DM rules and email follow-up while keeping external-provider approval visible.'],
  ['◈', 'Keep your own look', 'Choose colors, type, button styles, landing-page copy, and visibility while previewing the result in a phone frame.']
];

const plans = [
  {
    id: 'starter',
    name: 'Starter',
    price: 'Free',
    note: 'Best for building and testing your first store.',
    features: ['Creator storefront', 'Products and promotion links', 'Store design and phone preview', 'Basic analytics and test-stage AutoDM'],
    cta: 'Create a free store'
  },
  {
    id: 'pro',
    name: 'Creator Pro',
    price: '₹999',
    suffix: '/ month',
    note: 'Proposed India launch price; no charge is made in this test build.',
    features: ['Everything in Starter', 'Advanced funnels', 'Referrals and email flows', 'Higher customer and analytics limits'],
    cta: 'Choose Premium',
    featured: true
  }
];

function Brand({compact = false}) {
  return <a className={`marketing-brand ${compact ? 'compact' : ''}`} href="/" aria-label="Creator Store home">
    <span>CS</span><b>Creator Store</b>
  </a>;
}

function StorePreview() {
  return <div className="marketing-phone-wrap" aria-label="Example creator storefront preview">
    <div className="marketing-glow"/>
    <div className="marketing-phone">
      <div className="marketing-phone-notch"/>
      <div className="marketing-profile-dot">A</div>
      <strong>Alex Creates</strong>
      <small>@alex · Tools for independent creators</small>
      <article className="preview-hot"><i>📌</i><div><span>HOT OFFER</span><b>Creator Launch Kit</b><small>Templates + video guide</small></div><em>₹499</em></article>
      <article><i>🗓</i><div><b>Strategy session</b><small>Book a focused 45-minute call</small></div><em>→</em></article>
      <article><i>🏷</i><div><b>25% off creator gear</b><small>Sponsored partner offer</small></div><em>→</em></article>
    </div>
  </div>;
}

export function MarketingHome() {
  return <main className="marketing-page">
    <header className="marketing-header">
      <Brand/>
      <nav aria-label="Main navigation">
        <a href="#features">Features</a>
        <a href="#how-it-works">How it works</a>
        <a href="#pricing">Pricing</a>
      </nav>
      <div className="marketing-header-actions"><a href="/login">Sign in</a><a className="marketing-button small" href="/signup">Create your store</a></div>
    </header>

    <section className="marketing-hero">
      <div className="marketing-hero-copy">
        <span className="marketing-kicker">YOUR AUDIENCE · YOUR STORE · ONE LINK</span>
        <h1>Everything you share and sell, in one unforgettable page.</h1>
        <p>Creator Store gives creators one polished destination for products, services, courses, bookings, promotions, and audience growth.</p>
        <div className="marketing-hero-actions"><a className="marketing-button" href="/signup">Create your store</a><a className="marketing-button ghost" href="/alex">View demo store <span>↗</span></a></div>
        <small>No card for Starter. Premium billing uses a hosted payment provider, so card numbers never enter our application.</small>
      </div>
      <StorePreview/>
    </section>

    <section className="marketing-strip" aria-label="Supported offers">
      {['Digital products', 'Courses', 'Meetings', 'Webinars', 'Affiliate links', 'Lead magnets'].map(item => <span key={item}>✓ {item}</span>)}
    </section>

    <section className="marketing-section" id="features">
      <div className="marketing-section-head"><span>BUILT FOR THE WHOLE CREATOR BUSINESS</span><h2>Start with a link. Grow into a business.</h2><p>Your public store stays simple for visitors while the dashboard brings creation, promotion, customers, and reporting together.</p></div>
      <div className="marketing-capabilities">{capabilities.map(([icon, title, body]) => <article key={title}><i>{icon}</i><h3>{title}</h3><p>{body}</p></article>)}</div>
    </section>

    <section className="marketing-section steps-section" id="how-it-works">
      <div className="marketing-section-head"><span>FROM IDEA TO LIVE STORE</span><h2>Three clear steps.</h2></div>
      <div className="marketing-steps">
        <article><b>01</b><h3>Create your account</h3><p>Choose a plan and add the essentials. We create your store link automatically.</p></article>
        <article><b>02</b><h3>Build and preview</h3><p>Add each offer with its own fields, personalize the page, and see the mobile experience before publishing.</p></article>
        <article><b>03</b><h3>Share, learn, improve</h3><p>Put the store link in your Instagram bio, pin current deals, and use real activity to improve the next offer.</p></article>
      </div>
    </section>

    <section className="marketing-section pricing-section" id="pricing">
      <div className="marketing-section-head"><span>SIMPLE PLANS</span><h2>Build free. Upgrade when growth tools matter.</h2><p>Prices and premium activation are visibly marked as test-stage until creator subscription billing is connected.</p></div>
      <div className="marketing-pricing">{plans.map(plan => <article className={plan.featured ? 'featured' : ''} key={plan.id}>{plan.featured && <span className="plan-label">PREMIUM</span>}<h3>{plan.name}</h3><div className="plan-price">{plan.price}<small>{plan.suffix || ''}</small></div><p>{plan.note}</p><ul>{plan.features.map(feature => <li key={feature}>✓ {feature}</li>)}</ul><a className={plan.featured ? 'marketing-button' : 'marketing-button ghost'} href={`/signup?plan=${plan.id}`}>{plan.cta}</a></article>)}</div>
      <p className="billing-safety">🔒 Real premium checkout will open on Razorpay or Stripe. Only provider tokens and verified subscription status belong in our database—never a raw card number or CVV.</p>
    </section>

    <section className="marketing-final-cta"><span>READY WHEN YOU ARE</span><h2>Turn your bio link into your best storefront.</h2><a className="marketing-button" href="/signup">Create your store</a></section>
    <footer className="marketing-footer"><Brand compact/><p>Creator Store test release · India-first provider architecture</p><div><a href="/login">Sign in</a><a href="#features">Features</a><a href="#pricing">Pricing</a></div></footer>
  </main>;
}

export function PublicNotFound() {
  return <main className="public-message-page">
    <Brand/>
    <section><span>404</span><h1>That creator store does not exist.</h1><p>Check the address, or create a store with the handle you wanted.</p><div><a className="marketing-button" href="/signup">Create your store</a><a className="marketing-button ghost" href="/">Back to home</a></div></section>
  </main>;
}
