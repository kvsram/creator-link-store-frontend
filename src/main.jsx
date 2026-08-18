import React,{useEffect,useMemo,useState} from 'react';
import {createRoot} from 'react-dom/client';
import './style.css';

const API=import.meta.env.VITE_API_ORIGIN||'';
const CREATOR_ID=1;
const nav=[
  ['home','⌂','Home'],['store','▣','My Store'],['success','☆','Success'],['income','$','Income'],
  ['analytics','↗','Analytics'],['customers','♙','Customers'],['community','◎','Community'],
  ['more','•••','More'],['settings','⚙','Settings']
];
const money=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format((Number(n)||0)/100);
const route=()=>location.pathname.startsWith('/dashboard')?(location.pathname.split('/')[2]||'home'):null;

async function request(path,options){
  const response=await fetch(`${API}${path}`,{headers:{'Content-Type':'application/json',...(options?.headers||{})},...options});
  if(!response.ok) throw new Error((await response.json().catch(()=>({}))).error||`Request failed: ${response.status}`);
  return response.status===204?null:response.json();
}

function App(){
  const [section,setSection]=useState(route());
  useEffect(()=>{const pop=()=>setSection(route());addEventListener('popstate',pop);return()=>removeEventListener('popstate',pop)},[]);
  if(!section) return <PublicStore/>;
  const go=id=>{history.pushState({},'',`/dashboard/${id==='home'?'':id}`);setSection(id)};
  return <div className="app-shell">
    <aside className="sidebar">
      <a className="brand" onClick={()=>go('home')}><span>CS</span><b>Creator Store</b></a>
      <nav>{nav.map(([id,icon,label])=><button key={id} className={section===id?'active':''} onClick={()=>go(id)}><i>{icon}</i>{label}{id==='success'&&<em>New</em>}</button>)}</nav>
      <div className="account"><div className="avatar small">A</div><span><b>Alex Rivera</b><small>@alex</small></span></div>
    </aside>
    <main className="workspace"><Topbar section={section}/><Section id={section}/></main>
  </div>
}

function Topbar({section}){return <header className="topbar"><div><span className="eyebrow">Workspace</span><b>{nav.find(x=>x[0]===section)?.[2]||section}</b></div><div className="top-actions"><a href="/alex" target="_blank">View store ↗</a><button className="icon-button" aria-label="Notifications">♢</button></div></header>}

function Section({id}){
  const endpoints={home:'dashboard',store:'store',success:'success',income:'income',analytics:'analytics',customers:'customers',more:'more',settings:'settings'};
  const [data,setData]=useState(null),[error,setError]=useState('');
  const load=()=>{setData(null);setError('');if(!endpoints[id]){setData({});return}request(`/api/v1/${endpoints[id]}${id==='success'?'':`?creatorId=${CREATOR_ID}`}`).then(setData).catch(e=>setError(e.message))};
  useEffect(load,[id]);
  if(error)return <State title="Could not load this section" body={error} action={load}/>;
  if(!data)return <div className="skeleton-grid"><i/><i/><i/></div>;
  if(id==='home')return <Home data={data}/>;
  if(id==='store')return <Store data={data} reload={load}/>;
  if(id==='success')return <Success data={data}/>;
  if(id==='income')return <Income data={data}/>;
  if(id==='analytics')return <Analytics data={data}/>;
  if(id==='customers')return <Customers data={data} reload={load}/>;
  if(id==='community')return <Community/>;
  if(id==='more')return <More data={data}/>;
  if(id==='settings')return <Settings data={data}/>;
  return null;
}

function PageHead({title,subtitle,actions}){return <div className="page-head"><div><h1>{title}</h1><p>{subtitle}</p></div>{actions&&<div>{actions}</div>}</div>}
function Metric({label,value,detail}){return <article className="metric"><span>{label}</span><strong>{value}</strong>{detail&&<small>{detail}</small>}</article>}

function Home({data}){const m=data.metrics;return <>
  <PageHead title="Good morning, Alex" subtitle="Here’s what is happening in your creator business." actions={<button className="primary">Create product</button>}/>
  {!data.store.payouts_enabled&&<div className="notice">Enable payouts before accepting customer payments.<button>Open settings</button></div>}
  <div className="metrics"><Metric label="Store visits" value={m.visits}/><Metric label="Leads" value={m.leads}/><Metric label="Orders" value={m.orders}/><Metric label="Revenue" value={money(m.revenue_cents)}/></div>
  <div className="two-column"><section className="panel"><h2>Get ready to sell</h2><div className="checklist">{data.checklist.map(x=><div key={x.id}><span className={x.complete?'done':''}>{x.complete?'✓':'○'}</span><b>{x.label}</b><small>{x.complete?'Complete':'Next step'}</small></div>)}</div></section>
  <section className="panel"><h2>Quick actions</h2><div className="action-grid"><button><b>＋ Add a product</b><small>Publish an offer in minutes</small></button><button><b>↗ Market your products</b><small>Plan your next launch</small></button><button><b>✦ Ask Creator Coach</b><small>Get practical ideas</small></button></div></section></div>
  </>}

function Store({data,reload}){const [tab,setTab]=useState('Store'),[open,setOpen]=useState(false);return <>
  <PageHead title="My Store" subtitle="Build, organize, and publish your offers." actions={<><a className="button secondary" href="/alex" target="_blank">Preview</a><button className="primary" onClick={()=>setOpen(true)}>＋ Add product</button></>}/>
  <div className="tabs">{['Store','Landing Pages','Edit Design'].map(x=><button className={tab===x?'selected':''} onClick={()=>setTab(x)} key={x}>{x}</button>)}</div>
  {tab==='Store'?<div className="store-layout"><section className="panel"><div className="store-profile"><div className="avatar">A</div><div><h2>{data.store.title}</h2><p>Systems and templates for independent creators.</p></div><span className="pill">{data.store.published?'Published':'Draft'}</span></div><h3>Products</h3><div className="product-list">{data.products.map(p=><article key={p.id}><div className="product-art">{p.type==='meeting'?'◷':'▤'}</div><div><b>{p.title}</b><small>{p.type.replaceAll('-',' ')} · {money(p.price_cents)}</small></div><span className={`status ${p.status}`}>{p.status}</span><button className="icon-button">•••</button></article>)}</div></section><PhonePreview products={data.products}/></div>:<State title={`${tab} editor`} body="This production boundary has its own persisted model; the MVP exposes the tab and keeps the editor isolated for the next implementation slice."/>}
  {open&&<ProductModal types={data.product_types} close={()=>setOpen(false)} saved={()=>{setOpen(false);reload()}}/>}
  </>}

function ProductModal({types,close,saved}){const [form,setForm]=useState({creatorId:1,type:'digital-download',title:'',description:'',priceCents:0,status:'draft',position:10}),[error,setError]=useState('');const submit=async e=>{e.preventDefault();try{await request('/api/v1/products',{method:'POST',body:JSON.stringify(form)});saved()}catch(x){setError(x.message)}};return <div className="modal-backdrop"><form className="modal" onSubmit={submit}><div className="modal-head"><h2>Add a product</h2><button type="button" className="icon-button" onClick={close}>×</button></div><label>Product type<select value={form.type} onChange={e=>setForm({...form,type:e.target.value})}>{types.map(x=><option key={x} value={x}>{x.replaceAll('-',' ')}</option>)}</select></label><label>Title<input required value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/></label><label>Description<textarea required value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></label><label>Price in cents<input type="number" min="0" value={form.priceCents} onChange={e=>setForm({...form,priceCents:Number(e.target.value)})}/></label>{error&&<p className="error">{error}</p>}<div className="form-actions"><button type="button" className="secondary" onClick={close}>Cancel</button><button className="primary">Save draft</button></div></form></div>}

function PhonePreview({products}){return <aside className="preview-panel"><span>Live preview</span><div className="phone"><div className="phone-profile"><div className="avatar">A</div><b>Alex Rivera</b><small>@alex</small></div>{products.filter(x=>x.status==='published').map(x=><div className="mini-product" key={x.id}><b>{x.title}</b><span>{money(x.price_cents)}</span></div>)}</div></aside>}

function Success({data}){return <><PageHead title="Success" subtitle="Short, practical lessons for building your creator business."/><div className="hero-card"><span className="eyebrow">Creator playbook</span><h2>Build an offer people understand in five seconds.</h2><p>Start with one outcome, one audience, and one clear next step.</p><button>Continue learning</button></div><div className="tutorial-grid">{data.tutorials.map((x,i)=><article key={x.id}><div className={`lesson-art art-${i}`}>▶</div><span>{x.category}</span><h3>{x.title}</h3><small>{x.minutes} min lesson</small></article>)}</div></>}

function Income({data}){return <><PageHead title="Income" subtitle="Track revenue, fees, cashouts, and customer orders." actions={<button className="secondary">Export CSV</button>}/><div className="metrics"><Metric label="Gross revenue" value={money(data.summary.gross_cents)}/><Metric label="Net revenue" value={money(data.summary.net_cents)}/><Metric label="Available to cash out" value={money(data.cashout.available_cents)}/><Metric label="Paid orders" value={data.summary.order_count}/></div><section className="panel chart-panel"><h2>Revenue</h2><div className="chart"><i style={{height:'25%'}}/><i style={{height:'48%'}}/><i style={{height:'38%'}}/><i style={{height:'72%'}}/><i style={{height:'56%'}}/><i style={{height:'86%'}}/><i style={{height:'64%'}}/></div></section><Table headers={['Order','Customer','Product','Gross','Status']} rows={data.orders.map(x=>[x.id,x.customer,x.product,money(x.amount_cents),x.status])}/></>}

function Analytics({data}){const t=data.totals;return <><PageHead title="Analytics" subtitle="Understand traffic, leads, conversion, and sales."/><div className="metrics"><Metric label="Visits" value={t.visits}/><Metric label="Leads" value={t.leads}/><Metric label="Orders" value={t.orders}/><Metric label="Conversion" value={`${t.visits?Math.round(t.orders/t.visits*100):0}%`}/></div><div className="two-column"><section className="panel chart-panel"><h2>Store activity</h2><div className="line-chart"><svg viewBox="0 0 600 180"><path d="M0 150 C80 145 70 100 150 110 S250 135 320 70 S430 95 600 20" fill="none" stroke="currentColor" strokeWidth="6"/><path d="M0 150 C80 145 70 100 150 110 S250 135 320 70 S430 95 600 20 L600 180 L0 180Z"/></svg></div></section><section className="panel"><h2>Traffic sources</h2>{data.sources.length?data.sources.map(x=><div className="source" key={x.source}><b>{x.source}</b><span>{x.visits} visits</span></div>):<p className="muted">No source data yet.</p>}</section></div></>}

function Customers({data,reload}){const [open,setOpen]=useState(false);return <><PageHead title="Customers" subtitle={`${data.items.length} contacts · up to ${data.limit.toLocaleString()} in this plan`} actions={<><button className="secondary">Import CSV</button><button className="primary" onClick={()=>setOpen(true)}>＋ Add contact</button></>}/><div className="search"><input placeholder="Search name or email"/><button>Filter</button></div><Table headers={['Customer','Email','Source','Joined']} rows={data.items.map(x=>[x.name,x.email,x.source,new Date(x.created_at).toLocaleDateString()])}/>{open&&<CustomerModal close={()=>setOpen(false)} saved={()=>{setOpen(false);reload()}}/>}</>}

function CustomerModal({close,saved}){const [form,setForm]=useState({creatorId:1,name:'',email:'',phone:''}),[error,setError]=useState('');const submit=async e=>{e.preventDefault();try{await request('/api/v1/customers',{method:'POST',body:JSON.stringify(form)});saved()}catch(x){setError(x.message)}};return <div className="modal-backdrop"><form className="modal" onSubmit={submit}><div className="modal-head"><h2>Add contact</h2><button type="button" className="icon-button" onClick={close}>×</button></div>{['name','email','phone'].map(k=><label key={k}>{k[0].toUpperCase()+k.slice(1)}<input required={k!=='phone'} type={k==='email'?'email':'text'} value={form[k]} onChange={e=>setForm({...form,[k]:e.target.value})}/></label>)}{error&&<p className="error">{error}</p>}<div className="form-actions"><button type="button" className="secondary" onClick={close}>Cancel</button><button className="primary">Add contact</button></div></form></div>}

function Community(){return <><PageHead title="Community" subtitle="Learn with other creators and share practical wins."/><div className="community-hero"><div><span className="eyebrow">Creator Foundations</span><h2>Build alongside 1,248 creators.</h2><p>Weekly conversations about offers, audience growth, and sustainable systems.</p><button>Join community</button></div><div className="people">{['M','J','K','S','R'].map(x=><span key={x}>{x}</span>)}</div></div><div className="two-column"><section className="panel"><h2>Popular this week</h2><div className="thread"><b>What changed your conversion rate?</b><small>42 replies · 2h ago</small></div><div className="thread"><b>Show your storefront</b><small>87 replies · 1d ago</small></div></section><section className="panel"><h2>Upcoming</h2><div className="thread"><b>Offer teardown workshop</b><small>Thursday · 12:00 PM</small></div></section></div></>}

function More({data}){const cards=[['⇄','Funnels','Connect offers into a guided customer journey.'],['◷','Appointments','Manage availability and bookings.'],['♧','Referrals','Reward partners who drive sales.'],['✉','Email Flows','Automate customer follow-up.'],['◎','AutoDM','Send an Instagram DM from comment keywords.']];return <><PageHead title="More tools" subtitle="Add growth and automation capabilities when you need them."/><div className="feature-grid">{cards.map(x=><article key={x[1]}><i>{x[0]}</i><div><h3>{x[1]}</h3><p>{x[2]}</p></div><button>Open →</button></article>)}</div></>}

function Settings({data}){const [tab,setTab]=useState('profile');return <><PageHead title="Settings" subtitle="Manage your account, store, payments, and security."/><div className="settings-layout"><nav>{data.tabs.map(x=><button className={tab===x?'active':''} onClick={()=>setTab(x)} key={x}>{x.replaceAll('-',' ')}</button>)}</nav><section className="panel settings-form"><h2>{tab.replaceAll('-',' ')}</h2>{tab==='profile'?<><label>Display name<input defaultValue={data.profile.display_name}/></label><label>Username<div className="prefix-input"><span>creator.test/</span><input defaultValue={data.profile.username}/></div></label><label>Bio<textarea defaultValue={data.profile.bio}/></label><button className="primary">Save changes</button></>:tab==='payments'?<div className="connection"><i>✓</i><div><b>Payout status</b><small>{data.store.payouts_enabled?'Ready to accept payments':'Set up required'}</small></div><button>Manage</button></div>:<State title={`${tab.replaceAll('-',' ')} settings`} body="The API boundary and navigation are implemented; provider-specific credentials remain external secret-manager integrations."/>}</section></div></>}

function PublicStore(){const handle=location.pathname.replace(/^\//,'')||'alex';const [page,setPage]=useState(null),[missing,setMissing]=useState(false);useEffect(()=>{request(`/api/public/${handle}`).then(setPage).catch(()=>setMissing(true))},[handle]);if(missing)return <Signup/>;if(!page)return <div className="public-loading">Loading store…</div>;return <main className="public-store"><div className="public-profile"><div className="avatar">{page.creator.display_name[0]}</div><h1>{page.creator.display_name}</h1><p>@{page.creator.handle}</p><p>{page.creator.bio}</p></div><div className="public-products">{page.products.map(p=><article key={p.id}><div className="public-art">{p.type==='meeting'?'◷':'▤'}</div><div><h2>{p.title}</h2><p>{p.description}</p><b>{money(p.price_cents)}</b></div><button>View offer</button></article>)}</div>{page.links.map(l=><a className="public-link" key={l.id} href={l.url}>{l.title}<span>↗</span></a>)}<small>Powered by Creator Store</small></main>}

function Signup(){const [form,setForm]=useState({handle:'',displayName:'',email:'',phone:'',password:''}),[message,setMessage]=useState('');const submit=async e=>{e.preventDefault();try{const body=await request('/api/auth/register',{method:'POST',body:JSON.stringify(form)});setMessage(`Created /${body.handle}. Refresh to open it.`)}catch(x){setMessage(x.message)}};return <main className="signup"><span className="brand-mark">CS</span><h1>Create your creator store</h1><p>Publish links and sell digital offers from one page.</p><form onSubmit={submit}>{[['handle','Username'],['displayName','Display name'],['email','Email'],['phone','Phone (optional)'],['password','Password']].map(([k,l])=><label key={k}>{l}<input required={k!=='phone'} type={k==='password'?'password':k==='email'?'email':'text'} value={form[k]} onChange={e=>setForm({...form,[k]:e.target.value})}/></label>)}<button className="primary">Create account</button></form>{message&&<p>{message}</p>}</main>}

function Table({headers,rows}){return <section className="panel table-wrap"><table><thead><tr>{headers.map(x=><th key={x}>{x}</th>)}</tr></thead><tbody>{rows.length?rows.map((row,i)=><tr key={i}>{row.map((x,j)=><td key={j}>{x??'—'}</td>)}</tr>):<tr><td colSpan={headers.length} className="empty-cell">No data yet</td></tr>}</tbody></table></section>}
function State({title,body,action}){return <div className="empty-state"><span>◇</span><h2>{title}</h2><p>{body}</p>{action&&<button onClick={action}>Try again</button>}</div>}

createRoot(document.getElementById('root')).render(<App/>);
