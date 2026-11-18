const seed = [
  { id: 1, customer: 'Khush Shah', phone: '98765 43210', recipient: 'Priya Shah', occasion: 'Birthday', orderDate: '2025-01-20', occasionDate: '2025-01-26', cakeName: 'Celebration cake', flavour: 'Chocolate truffle', orderValue: 1450, weightKg: 1 },
  { id: 2, customer: 'Meera Patel', phone: '98980 12345', recipient: 'Rohan Patel', occasion: 'Anniversary', orderDate: '2024-07-21', occasionDate: '2024-07-28', cakeName: 'Heart cake', flavour: 'Red velvet', orderValue: 1800, weightKg: 1.5 },
  { id: 3, customer: 'Khush Shah', phone: '98765 43210', recipient: 'Anaya Shah', occasion: 'Birthday', orderDate: '2024-07-29', occasionDate: '2024-08-04', cakeName: 'Theme cake', flavour: 'Vanilla', orderValue: 1600, weightKg: 1 },
  { id: 4, customer: 'Aman Verma', phone: '98250 76543', recipient: 'Nisha Verma', occasion: 'Birthday', orderDate: '2023-08-04', occasionDate: '2023-08-10', cakeName: 'Celebration cake', flavour: 'Butterscotch', orderValue: 1200, weightKg: 1 },
  { id: 5, customer: 'Meera Patel', phone: '98980 12345', recipient: 'Ishaan Patel', occasion: 'Birthday', orderDate: '2024-08-26', occasionDate: '2024-09-02', cakeName: 'Theme cake', flavour: 'Chocolate', orderValue: 1500, weightKg: 1.5 }
];
// These are demo-only credentials for this browser-only version. Move user
// accounts and role checks to a server before using the CRM with real staff.
const defaultUsers = {
  'admin@shreebhavani.local': { password: 'Admin@123', name: 'Shree Bhavani Admin', role: 'admin' },
  'staff@shreebhavani.local': { password: 'Staff@123', name: 'Reminder Staff', role: 'staff' }
};
const sessionKey = 'sweetRecallSession';
const usersKey = 'sweetRecallUsers';
const auditKey = 'sweetRecallAudit';
const profilesKey = 'sweetRecallCustomerProfiles';
const productsKey = 'sweetRecallProducts';
let users = loadUsers();
let auditEntries = loadAudit();
function loadStoredJson(key, fallback) { try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); } catch (_) { return fallback; } }
let customerProfiles = loadStoredJson(profilesKey, {});
let productCatalog = loadStoredJson(productsKey, { cakes:[], flavours:[] });
let currentUser = null;

// Never retain credentials in a browser URL or browsing history.
if (window.location.search) window.history.replaceState({}, document.title, window.location.pathname + window.location.hash);

function loadUsers() {
  try { const saved=JSON.parse(localStorage.getItem(usersKey) || '{}');const loaded={ ...defaultUsers, ...saved, 'admin@shreebhavani.local':defaultUsers['admin@shreebhavani.local'] };Object.values(loaded).forEach(account=>{if(account.active===undefined)account.active=true;});return loaded; }
  catch (_) { return { ...defaultUsers }; }
}
function saveUsers() { localStorage.setItem(usersKey, JSON.stringify(users)); }
function loadAudit() {
  try { const saved=JSON.parse(localStorage.getItem(auditKey) || '[]'); return Array.isArray(saved) ? saved : []; }
  catch (_) { return []; }
}
function addAudit(action, detail, actor=currentUser?.email || 'System') {
  auditEntries.unshift({ id:Date.now(), action, detail, actor, timestamp:new Date().toISOString() });
  auditEntries=auditEntries.slice(0,100);
  localStorage.setItem(auditKey,JSON.stringify(auditEntries));
}

function restoreSession() {
  try {
    const saved = JSON.parse(localStorage.getItem(sessionKey) || 'null');
    const account = saved && users[saved.email];
    if (account && saved.role === account.role) currentUser = { email: saved.email, name: account.name, role: account.role };
  } catch (_) { localStorage.removeItem(sessionKey); }
}
function isAdmin() { return currentUser?.role === 'admin'; }
function canOpen(view) { return ['dashboard','feedback','occasions','customers','products','callLog'].includes(view) || isAdmin(); }
function requireAdmin() {
  if (isAdmin()) return true;
  alert('Only an administrator can manage records, customer history, or exports.');
  return false;
}
function showView(view) {
  const safeView = canOpen(view) ? view : 'dashboard';
  document.body.dataset.view = safeView;
  $('#pageTitle').hidden = safeView !== 'dashboard';
  $$('.view').forEach(x => x.classList.remove('active'));
  $('#' + safeView + 'View').classList.add('active');
  $$('.nav-item').forEach(x => x.classList.toggle('active', x.dataset.view === safeView));
  const titles = {
    dashboard: `Good morning, ${currentUser?.name || 'Shree Bhavani Sales Agency'} ✦`,
    feedback: 'Feedback messages',
    analytics: 'Analytics dashboard',
    occasions: 'Your occasion book',
    customers: 'Customer history',
    products: 'Products',
    callLog: 'Call Update Log',
    staff: 'Staff management',
    audit: 'Audit history'
  };
  $('#pageTitle').textContent = titles[safeView];
}
function applyAccess() {
  const signedIn = Boolean(currentUser);
  document.body.classList.toggle('is-authenticated', signedIn);
  $('#loginScreen').hidden = signedIn;
  $$('.admin-only').forEach(item => { item.hidden = !isAdmin(); });
  if (!signedIn) return;
  $('#currentRole').textContent = isAdmin() ? 'Administrator' : 'Staff';
  $('#profileButton').textContent = currentUser.name.split(' ').map(part => part[0]).slice(0, 2).join('');
  $('#profileButton').title = `${currentUser.name} (${isAdmin() ? 'Administrator' : 'Staff'})`;
  showView('dashboard');
}

let occasions = JSON.parse(localStorage.getItem('sweetRecallOccasions') || 'null') || seed;
const sampleNumbers = { 'Khush Shah':'98765 43210', 'Meera Patel':'98980 12345', 'Aman Verma':'98250 76543' };
let migrated = false;
occasions.forEach(item => {
  if (!item.phone && sampleNumbers[item.customer]) { item.phone=sampleNumbers[item.customer]; migrated=true; }
  if (!item.occasionDate) { item.occasionDate=item.date; migrated=true; }
  if (!item.orderDate) { item.orderDate=item.date || item.occasionDate; migrated=true; }
  if (!item.cakeName) { item.cakeName=item.order || 'Cake'; migrated=true; }
  if (!item.flavour) { item.flavour='Not recorded'; migrated=true; }
  if (item.orderValue === undefined) { item.orderValue=0; migrated=true; }
  if (item.weightKg === undefined) { item.weightKg=0; migrated=true; }
  if (item.callRetry) { item.callRetry=false; migrated=true; }
});
if (migrated) localStorage.setItem('sweetRecallOccasions', JSON.stringify(occasions));

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const now = new Date();
$('#todayLabel').textContent = now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase();
const annualDate = item => { const d = new Date(item.occasionDate + 'T12:00:00'); return new Date(now.getFullYear(), d.getMonth(), d.getDate()); };
function daysUntil(item) { let d=annualDate(item); d.setHours(0,0,0,0); const t=new Date(now); t.setHours(0,0,0,0); if(d<t)d.setFullYear(d.getFullYear()+1); return Math.round((d-t)/86400000); }
function wasYesterday(item) { const d=annualDate(item),today=new Date(now);d.setHours(0,0,0,0);today.setHours(0,0,0,0);if(d>today)d.setFullYear(d.getFullYear()-1);return Math.round((today-d)/86400000)===1; }
const fmtDate = item => annualDate(item).toLocaleDateString('en-IN',{day:'numeric',month:'short'});
const orderDescription = item => `${item.cakeName} · ${item.flavour}${Number(item.weightKg)>0 ? ` · ${item.weightKg} kg` : ''}`;
const orderedThisYear = item => new Date(item.orderDate + 'T12:00:00').getFullYear() === now.getFullYear();
const formatMoney = value => new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(Number(value)||0);
const normalizedPhone = phone => (phone || '').replace(/[^0-9]/g,'');
const phoneForTel = phone => (phone || '').replace(/[^0-9+]/g,'');
function save(){ localStorage.setItem('sweetRecallOccasions',JSON.stringify(occasions)); render(); }
function saveProfiles(){localStorage.setItem(profilesKey,JSON.stringify(customerProfiles));}
function saveProducts(){localStorage.setItem(productsKey,JSON.stringify(productCatalog));}
function customerKey(item){return normalizedPhone(item.phone)||item.customer.toLowerCase();}
function validateRequired(form,errorId){const fields=[...form.querySelectorAll('input[required],select[required]')];const missing=fields.filter(field=>!String(field.value||'').trim());fields.forEach(field=>field.classList.toggle('field-error',missing.includes(field)));const error=$(errorId);error.textContent=missing.length?'All fields are required.':'';error.hidden=!missing.length;return !missing.length;}
function clearFieldError(field){if(String(field.value||'').trim())field.classList.remove('field-error');}
function showValidationError(errorId,field,message){field.classList.add('field-error');const error=$(errorId);error.textContent=message;error.hidden=false;return false;}

function renderDashboard(){
  const upcoming=[...occasions].sort((a,b)=>daysUntil(a)-daysUntil(b)).slice(0,3);
  $('#upcomingList').innerHTML=upcoming.map(x=>{const d=annualDate(x),n=daysUntil(x),tag=x.callRetry?'Call again':n===0?'Today':n===1?'Tomorrow':n+' days away',action=x.callRetry?'<button class="call-btn" onclick="startCall('+x.id+')">Call again</button>':'<a class="call-btn" style="text-decoration:none" href="tel:'+phoneForTel(x.phone)+'" onclick="startCall('+x.id+')">Call '+x.customer.split(' ')[0]+'</a>';return '<article class="reminder"><div class="date-block"><b>'+d.getDate()+'</b><span>'+d.toLocaleString('en',{month:'short'})+'</span></div><div class="reminder-info"><h4>'+x.recipient+'\'s '+x.occasion.toLowerCase()+'</h4><p>'+x.customer+' · '+(x.phone||'Number not saved')+' · '+orderDescription(x)+'</p></div><span class="tag">'+tag+'</span>'+action+'</article>';}).join('') || '<p>No occasions yet — add your first customer memory.</p>';
  $('#recentList').innerHTML=[...occasions].sort((a,b)=>new Date(b.orderDate)-new Date(a.orderDate)).slice(0,3).map(x=>`<article class="recent-card"><span class="mini-date">${fmtDate(x)} · ${x.occasion.toUpperCase()}</span><h4>${x.recipient}</h4><p>Ordered by ${x.customer}<br>${orderDescription(x)}</p></article>`).join('');
}
function renderCallReminders(){
  const due=[...occasions].filter(x=>daysUntil(x)<=3&&!orderedThisYear(x)&&!x.callPending&&!x.callRetry&&x.reminderAction?.year!==annualDate(x).getFullYear()).sort((a,b)=>daysUntil(a)-daysUntil(b));
  const pending=occasions.filter(x=>x.callPending&&x.reminderAction?.year!==annualDate(x).getFullYear());
  $('#callRemindersList').innerHTML=due.map(x=>{const d=annualDate(x),dayText=daysUntil(x)===0?'Occasion today':daysUntil(x)===1?'Occasion tomorrow':'Call today — occasion in '+daysUntil(x)+' days';return '<article class="call-card"><div class="call-card-head"><div><h4>Call '+x.customer+' for '+x.recipient+'\'s '+x.occasion+'</h4><p>'+x.phone+' · Occasion: '+d.toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'})+' · Last order: '+orderDescription(x)+'</p></div><div class="call-head-actions"><span class="due-badge">'+dayText+'</span><a class="call-now" href="tel:'+phoneForTel(x.phone)+'" onclick="startCall('+x.id+')">Call now</a></div></div></article>';}).join('')||'<div class="empty-reminders">No new calls are due today.</div>';
  $('#updatePendingList').innerHTML=pending.map(x=>'<article class="call-card pending-card"><div class="call-card-head"><div><h4>'+x.customer+' · '+x.recipient+'\'s '+x.occasion+'</h4><p>Call started. Record the result below.</p></div><span class="due-badge">Update pending</span></div><form class="reminder-action-form" data-id="'+x.id+'"><p class="call-question">1. Called?</p><div class="action-row"><label class="action-option"><input required type="radio" name="calledStatus" value="yes"> Yes</label><label class="action-option"><input type="radio" name="calledStatus" value="notPickedUp"> Not picked up</label><label class="action-option"><input type="radio" name="calledStatus" value="invalidNumber"> Invalid number</label></div><p class="call-question">2. Customer interested?</p><div class="action-row"><label class="action-option"><input required type="radio" name="orderInterest" value="interested"> Interested</label><label class="action-option"><input type="radio" name="orderInterest" value="notInterested"> Not interested</label></div><button class="reminder-submit" type="submit">Update call</button></form></article>').join('')||'<div class="empty-reminders">No call updates are pending.</div>';
}
function renderCallLog(){
  const logged=occasions.filter(x=>x.reminderAction?.submittedAt).sort((a,b)=>new Date(b.reminderAction.submittedAt)-new Date(a.reminderAction.submittedAt));
  const label=value=>({yes:'Yes',notPickedUp:'Not picked up',invalidNumber:'Invalid number',interested:'Interested',notInterested:'Not interested'})[value]||'—';
  $('#callLogTable').innerHTML=`<div class="occasion-row occasion-head call-log-row"><span>Call updated</span><span>Customer</span><span>For / occasion</span><span>Occasion date</span><span>Call result</span><span>Order interest</span></div>${logged.map(x=>`<div class="occasion-row call-log-row"><div>${new Date(x.reminderAction.submittedAt).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}</div><div><div class="person">${x.customer}</div><div class="sub">${x.phone}</div></div><div><div class="person">${x.recipient}</div><div class="sub">${x.occasion}</div></div><div>${fmtDate(x)}</div><div>${label(x.reminderAction.callOutcome)}</div><div>${label(x.reminderAction.orderInterest)}</div></div>`).join('')||'<p style="padding:22px">No call updates have been submitted yet.</p>'}`;
}
function exportCallLog(){
  const label=value=>({yes:'Yes',notPickedUp:'Not picked up',invalidNumber:'Invalid number',interested:'Interested',notInterested:'Not interested'})[value]||'';
  const csvValue=value=>`"${String(value??'').replace(/"/g,'""')}"`;
  const rows=[['Call updated','Customer','Mobile number','Recipient','Occasion','Occasion date','Cake name','Flavour','Number of kgs','Order value','Call result','Order interest']];
  occasions.filter(x=>x.reminderAction?.submittedAt).sort((a,b)=>new Date(b.reminderAction.submittedAt)-new Date(a.reminderAction.submittedAt)).forEach(x=>rows.push([
    new Date(x.reminderAction.submittedAt).toLocaleString('en-IN'),x.customer,x.phone,x.recipient,x.occasion,annualDate(x).toLocaleDateString('en-IN'),x.cakeName,x.flavour,x.weightKg,formatMoney(x.orderValue),label(x.reminderAction.callOutcome),label(x.reminderAction.orderInterest)
  ]));
  const blob=new Blob(['\ufeff'+rows.map(row=>row.map(csvValue).join(',')).join('\n')],{type:'text/csv;charset=utf-8;'});
  const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=`call-update-log-${new Date().toISOString().slice(0,10)}.csv`;link.click();URL.revokeObjectURL(url);
}
function renderOccasions(filter=''){
  const selectedDate=$('#occasionDateSearch')?.value||'';
  const list=occasions.filter(x=>{const matchesText=(x.customer+(x.phone||'')+x.recipient+x.occasion+orderDescription(x)).toLowerCase().includes(filter.toLowerCase());const savedDate=x.occasionDate||'';const matchesDate=!selectedDate||savedDate===selectedDate||savedDate.slice(5)===selectedDate.slice(5);return matchesText&&matchesDate;}).sort((a,b)=>daysUntil(a)-daysUntil(b));
  $('#occasionTable').innerHTML=`<div class="occasion-row occasion-head"><span>Customer</span><span>For / occasion</span><span>Annual date</span><span>Last order</span><span></span></div>${list.map(x=>`<div class="occasion-row"><div><div class="person">${x.customer}</div><div class="sub">${x.phone || 'Number not saved'} · Reminder in ${daysUntil(x)} days</div></div><div><div class="person">${x.recipient}</div><div class="sub">${x.occasion}</div></div><div>${fmtDate(x)}</div><div>${orderDescription(x)}<div class="sub">${formatMoney(x.orderValue)}</div></div><div class="row-actions">${isAdmin()?`<button class="edit" onclick="editOccasion(${x.id})">Edit</button><button class="delete" title="Delete this occasion" onclick="removeOccasion(${x.id})">×</button>`:''}</div></div>`).join('') || '<p style="padding:22px">No matching occasions.</p>'}`;
}
window.searchOccasionsByDate=()=>renderOccasions($('#occasionSearch').value);
function renderCustomers(filter=''){
  const grouped=occasions.reduce((a,x)=>{const key=customerKey(x);(a[key] ||= []).push(x);return a;},{});
  const groups=Object.values(grouped).filter(g=>(g[0].customer+(g[0].phone||'')).toLowerCase().includes(filter.toLowerCase()));
  $('#customerCards').innerHTML=groups.map(g=>{const key=customerKey(g[0]),profile=customerProfiles[key]||{},avg=g.reduce((sum,x)=>sum+(Number(x.orderValue)||0),0)/g.length,flavours={};g.forEach(x=>flavours[x.flavour]=(flavours[x.flavour]||0)+1);const favourite=Object.entries(flavours).sort((a,b)=>b[1]-a[1])[0]?.[0]||'—';return `<article class="customer-card"><div class="customer-card-head"><div><h3>${g[0].customer}</h3><p>${g[0].phone || 'Number not saved'} · ${g.length} saved ${g.length===1?'occasion':'occasions'}</p></div><button class="edit" onclick="editCustomerProfile('${key}')">Edit profile</button></div><div class="customer-insights"><span>Average order value<b>${formatMoney(avg)}</b></span><span>Favourite flavour<b>${favourite}</b></span></div><div class="customer-profile-details"><p><b>Preferences:</b> ${profile.preferences || 'Not added'}</p><p><b>Favourite design:</b> ${profile.favouriteDesign || 'Not added'}</p></div>${g.sort((a,b)=>daysUntil(a)-daysUntil(b)).map(x=>`<div class="history-item"><div><b>${x.recipient}'s ${x.occasion}</b><span>${orderDescription(x)}</span></div><span>${fmtDate(x)}</span></div>`).join('')}</article>`;}).join('') || '<p>No customers found.</p>';
}
function render(){
  if (!currentUser) return;
  renderDashboard();
  renderCallReminders();
  renderFeedback();
  renderOccasions($('#occasionSearch')?.value||''); renderCustomers($('#customerSearch')?.value||''); renderProducts(); renderCallLog();
  if (isAdmin()) { renderStaff(); renderAnalytics(); renderAudit(); }
}
function renderFeedback(){
  const matches=occasions.filter(wasYesterday);
  $('#feedbackList').innerHTML=matches.map(item=>`<article class="feedback-card"><div><span class="mini-date">YESTERDAY · ${item.occasion.toUpperCase()}</span><h3>${item.recipient}</h3><p>Ordered by ${item.customer} · ${item.cakeName} · ${item.flavour}</p></div><button class="send-feedback" onclick="sendFeedback(${item.id})">Send WhatsApp message</button></article>`).join('')||'<div class="empty-reminders">No feedback messages are due today. Customers appear here the day after their occasion.</div>';
}
function renderProducts(){
  const count=(field,manual)=>{const all={};[...new Set([...(productCatalog[manual]||[]),...occasions.map(item=>item[field]?.trim()).filter(Boolean)])].forEach(value=>all[value]=0);occasions.forEach(item=>{const value=item[field]?.trim();if(value)all[value]=(all[value]||0)+1;});return all;};
  const render=(target,values)=>$(target).innerHTML=Object.entries(values).sort((a,b)=>a[0].localeCompare(b[0])).map(([name,total])=>`<div class="breakdown-row"><span>${name}</span><b>${total} saved</b></div>`).join('')||'<p class="sub">No products saved yet.</p>';
  const cakes=count('cakeName','cakes'),flavours=count('flavour','flavours');render('#cakeProductList',cakes);render('#flavourProductList',flavours);
  $('#cakeSuggestions').innerHTML=Object.keys(cakes).sort().map(value=>`<option value="${value}"></option>`).join('');
  $('#flavourSuggestions').innerHTML=Object.keys(flavours).sort().map(value=>`<option value="${value}"></option>`).join('');
}
function renderAnalytics(){
  const totalValue=occasions.reduce((sum,item)=>sum+(Number(item.orderValue)||0),0);
  const customers=new Set(occasions.map(item=>normalizedPhone(item.phone)||item.customer.toLowerCase())).size;
  const logged=occasions.filter(item=>item.reminderAction?.submittedAt);
  const interested=logged.filter(item=>['interested','alreadyOrdered'].includes(item.reminderAction.orderInterest)).length;
  const due=occasions.filter(item=>daysUntil(item)<=3 && item.reminderAction?.year!==annualDate(item).getFullYear()).length;
  const repeatCustomers=Object.values(occasions.reduce((all,item)=>{const key=normalizedPhone(item.phone)||item.customer.toLowerCase();all[key]=(all[key]||0)+1;return all;},{})).filter(count=>count>1).length;
  const cards=[['Total order value',formatMoney(totalValue),'Across all saved occasions'],['Average order value',occasions.length?formatMoney(totalValue/occasions.length):'—','Average per occasion'],['Customers',customers,'Unique customer records'],['Repeat customers',repeatCustomers,'With more than one occasion'],['Calls completed',logged.length,'Recorded call updates'],['Follow-up interest',logged.length?`${Math.round(interested/logged.length*100)}%`:'—',`${interested} interested or already ordered`],['Calls due',due,'Need attention within 3 days']];
  $('#analyticsCards').innerHTML=cards.map(([label,value,note])=>`<article class="metric-card"><span>${label}</span><strong>${value}</strong><small>${note}</small></article>`).join('');
  const renderBreakdown=(target,items,empty)=>{$(target).innerHTML=Object.entries(items).map(([name,count])=>`<div class="breakdown-row"><span>${name}</span><b>${count}</b></div>`).join('')||`<p class="sub">${empty}</p>`;};
  const outcomes=logged.reduce((result,item)=>{const value=item.reminderAction.orderInterest;result[value]=(result[value]||0)+1;return result;},{});
  const labels={interested:'Interested',alreadyOrdered:'Already ordered',notInterested:'Not interested'};
  renderBreakdown('#outcomeBreakdown',Object.fromEntries(Object.entries(outcomes).map(([key,value])=>[labels[key]||key,value])),'No call updates yet.');
  const types=occasions.reduce((result,item)=>{result[item.occasion]=(result[item.occasion]||0)+1;return result;},{});
  renderBreakdown('#occasionBreakdown',types,'No occasions saved yet.');
  const values=occasions.reduce((result,item)=>{result[item.occasion]=(result[item.occasion]||0)+(Number(item.orderValue)||0);return result;},{});
  renderBreakdown('#valueBreakdown',Object.fromEntries(Object.entries(values).map(([type,value])=>[type,formatMoney(value)])),'No order values yet.');
  const activity=logged.reduce((result,item)=>{const name=users[item.reminderAction.updatedBy]?.name || item.reminderAction.updatedBy || 'Unknown staff';result[name]=(result[name]||0)+1;return result;},{});
  renderBreakdown('#staffActivity',activity,'No staff call activity yet.');
}
function renderStaff(){
  const members=Object.entries(users).map(([email,account])=>({email,...account})).sort((a,b)=>a.role.localeCompare(b.role)||a.name.localeCompare(b.name));
  $('#staffCount').textContent=`${members.length} ${members.length===1?'member':'members'}`;
  $('#staffList').innerHTML=members.map(member=>`<article class="staff-member"><div class="staff-avatar">${member.name.split(' ').map(part=>part[0]).slice(0,2).join('').toUpperCase()}</div><div class="staff-info"><b>${member.name}</b><span>${member.email}</span>${member.role==='staff'?`<code class="staff-password">Password: ${member.password}</code>`:''}</div><span class="staff-role">${member.active===false?'inactive':member.role}</span>${member.role==='staff'?`<div class="staff-actions"><button class="edit" onclick="resetStaffPassword('${member.email}')">Reset</button><button class="edit" onclick="toggleStaffAccount('${member.email}')">${member.active===false?'Activate':'Deactivate'}</button></div>`:''}</article>`).join('');
}
function renderAudit(){
  $('#auditList').innerHTML=auditEntries.map(entry=>`<article class="audit-entry"><div><b>${entry.action}</b><p>${entry.detail}</p></div><div class="audit-meta"><span>${entry.actor}</span><span>${new Date(entry.timestamp).toLocaleString('en-IN',{day:'numeric',month:'short',year:'numeric',hour:'numeric',minute:'2-digit'})}</span></div></article>`).join('') || '<p class="empty-audit">No activity has been recorded yet.</p>';
}
window.removeOccasion=id=>{if(!requireAdmin())return;const item=occasions.find(x=>x.id===id);if(item&&confirm(`Delete ${item.recipient}'s ${item.occasion}? This cannot be undone.`)){occasions=occasions.filter(x=>x.id!==id);addAudit('Occasion deleted',`${item.recipient}'s ${item.occasion} for ${item.customer} was deleted.`);save();}};
function startNewOccasion(){const form=$('#occasionForm');form.reset();form.querySelectorAll('.field-error').forEach(field=>field.classList.remove('field-error'));$('#occasionValidationError').hidden=true;$('#occasionId').value='';$('#occasionDialogEyebrow').textContent='NEW MEMORY';$('#occasionDialogTitle').textContent='Add an occasion';$('#occasionSubmitButton').innerHTML='Save occasion <span>→</span>';$('#customerInput').readOnly=false;$('#phoneSuggestions').hidden=true;$('#otherOccasionField').hidden=true;$('#otherOccasionInput').required=false;}
window.editOccasion=id=>{if(!requireAdmin())return;const item=occasions.find(x=>x.id===id);if(!item)return;const form=$('#occasionForm');startNewOccasion();$('#occasionId').value=item.id;form.elements.phone.value=item.phone||'';form.elements.customer.value=item.customer||'';form.elements.recipient.value=item.recipient||'';form.elements.orderDate.value=item.orderDate||'';form.elements.occasionDate.value=item.occasionDate||'';form.elements.cakeName.value=item.cakeName||'';form.elements.flavour.value=item.flavour||'';form.elements.orderValue.value=item.orderValue??'';form.elements.weightKg.value=item.weightKg??'';const known=[...$('#occasionInput').options].some(option=>option.value===item.occasion);$('#occasionInput').value=known?item.occasion:'Other';$('#otherOccasionField').hidden=known;$('#otherOccasionInput').required=!known;$('#otherOccasionInput').value=known?'':item.occasion;$('#occasionDialogEyebrow').textContent='EDIT OCCASION';$('#occasionDialogTitle').textContent='Update occasion details';$('#occasionSubmitButton').innerHTML='Save changes <span>→</span>';$('#occasionDialog').showModal();};
window.editCustomerProfile=key=>{if(!currentUser)return;const records=occasions.filter(item=>customerKey(item)===key);if(!records.length)return;const profile=customerProfiles[key]||{},first=records[0];const name=prompt('Customer name',first.customer);if(name===null||!name.trim())return;const phone=prompt('Mobile number',first.phone||'');if(phone===null||!phone.trim())return;const normalized=normalizedPhone(phone);if(occasions.some(item=>customerKey(item)!==key&&normalizedPhone(item.phone)===normalized)){return alert('This mobile number is already saved for another customer.');}const preferences=prompt('Customer preferences',profile.preferences||'');if(preferences===null)return;const favouriteDesign=prompt('Favourite design',profile.favouriteDesign||'');if(favouriteDesign===null)return;records.forEach(item=>{item.customer=name.trim();item.phone=phone.trim();});const newKey=normalized||name.trim().toLowerCase();customerProfiles[newKey]={preferences:preferences.trim(),favouriteDesign:favouriteDesign.trim()};if(newKey!==key)delete customerProfiles[key];saveProfiles();addAudit('Customer profile updated',`${name.trim()}'s name, number, preferences, or design were updated.`);save();};
window.addProduct=type=>{if(!currentUser)return;const isCake=type==='cake',label=isCake?'cake name':'flavour',value=prompt(`Add ${label}`);if(!value?.trim())return;const key=isCake?'cakes':'flavours';productCatalog[key] ||= [];if(productCatalog[key].some(item=>item.toLowerCase()===value.trim().toLowerCase()))return alert(`This ${label} already exists.`);productCatalog[key].push(value.trim());saveProducts();addAudit('Product added',`${value.trim()} was added as a ${label}.`);renderProducts();};
window.resetStaffPassword=email=>{if(!requireAdmin())return;const account=users[email];if(!account)return;const password=prompt(`New password for ${account.name}`,account.password);if(!password||password.length<6)return alert('Password must be at least 6 characters.');account.password=password;saveUsers();addAudit('Staff password reset',`Password reset for ${account.name}.`);render();};
window.toggleStaffAccount=email=>{if(!requireAdmin())return;const account=users[email];if(!account)return;account.active=account.active===false;saveUsers();addAudit(account.active?'Staff account activated':'Staff account deactivated',account.name);render();};
window.sendFeedback=id=>{const item=occasions.find(x=>x.id===id);if(!item)return;const digits=normalizedPhone(item.phone);if(!digits)return alert('This customer does not have a saved mobile number.');const phone=digits.length===10?`91${digits}`:digits;const message='Heyy !! 😊\nHope you loved your cake from Monginis Kalawad Road 🎂\nIt would mean a lot if you share your experience: https://g.page/r/CZWZ3teahm3EEBE/review\nThankyou ❤️';window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`,'_blank','noopener');addAudit('Feedback message opened',`WhatsApp feedback message prepared for ${item.customer}.`);render();};
window.startCall=id=>{const item=occasions.find(x=>x.id===id);if(!item)return;item.callPending={startedAt:new Date().toISOString(),startedBy:currentUser?.email};item.callRetry=false;addAudit('Call started',`Call started for ${item.customer}.`);save();};

$$('.nav-item,[data-view]').forEach(b=>b.addEventListener('click',()=>{const view=b.dataset.view;if(view)showView(view);}));
$('#addButton').onclick=()=>{if(currentUser){startNewOccasion();$('#occasionDialog').showModal();}};
function savedCustomers(){
  const customers={};
  occasions.forEach(item=>{const key=normalizedPhone(item.phone);if(!key)return;if(!customers[key])customers[key]={customer:item.customer,phone:item.phone,count:0};customers[key].count++;});
  return Object.values(customers).sort((a,b)=>a.customer.localeCompare(b.customer));
}
function chooseSavedCustomer(customer){
  $('#phoneInput').value=customer.phone;
  $('#customerInput').value=customer.customer;
  $('#customerInput').readOnly=true;
  $('#customerLookup').textContent=`Customer found: ${customer.customer}. Their new occasion will be added to the same history.`;
  $('#phoneSuggestions').hidden=true;
}
function updatePhoneSuggestions(value){
  const query=normalizedPhone(value), box=$('#phoneSuggestions');
  if(query.length<2){box.hidden=true;box.innerHTML='';return;}
  const matches=savedCustomers().filter(customer=>normalizedPhone(customer.phone).includes(query)).slice(0,5);
  box.innerHTML=matches.map(customer=>`<button type="button" class="phone-suggestion" role="option" data-phone="${normalizedPhone(customer.phone)}"><span>${customer.phone}</span><small>${customer.customer} · ${customer.count} saved ${customer.count===1?'occasion':'occasions'}</small></button>`).join('');
  box.hidden=!matches.length;
}
$('#phoneInput').addEventListener('input',e=>{
  const match=occasions.find(x=>normalizedPhone(x.phone)===normalizedPhone(e.target.value));
  const name=$('#customerInput'), note=$('#customerLookup');
  if(match)chooseSavedCustomer({customer:match.customer,phone:match.phone});
  else {if(name.readOnly)name.value='';name.readOnly=false;note.textContent=e.target.value?'Select a saved customer below, or enter a name for a new number.':'Enter a saved customer number to fetch their name.';updatePhoneSuggestions(e.target.value);}
});
$('#phoneSuggestions').addEventListener('click',e=>{const option=e.target.closest('.phone-suggestion');if(!option)return;const customer=savedCustomers().find(item=>normalizedPhone(item.phone)===option.dataset.phone);if(customer)chooseSavedCustomer(customer);});
$('#occasionInput').addEventListener('change',e=>{const isOther=e.target.value==='Other';$('#otherOccasionField').hidden=!isOther;$('#otherOccasionInput').required=isOther;});
$('#updatePendingList').addEventListener('submit',e=>{e.preventDefault();const form=e.target;if(!form.matches('.reminder-action-form')||!currentUser)return;const item=occasions.find(x=>x.id===Number(form.dataset.id));if(!item)return;const data=new FormData(form),calledStatus=data.get('calledStatus'),orderInterest=data.get('orderInterest');if(!calledStatus||!orderInterest)return alert('Answer both questions before updating.');delete item.callPending;if(calledStatus==='notPickedUp'){item.callRetry=false;addAudit('Call not picked up',`${item.customer} was returned to Call reminders.`);save();return;}item.callRetry=false;item.reminderAction={year:annualDate(item).getFullYear(),callOutcome:calledStatus,orderInterest,submittedAt:new Date().toISOString(),updatedBy:currentUser.email};addAudit('Call update submitted',`${item.customer}: ${calledStatus}, ${orderInterest}.`);save();});
$('#occasionForm').addEventListener('submit',e=>{e.preventDefault();if(!currentUser||!validateRequired(e.target,'#occasionValidationError'))return;const phone=$('#phoneInput');if(!/^[6-9]\d{9}$/.test(normalizedPhone(phone.value)))return showValidationError('#occasionValidationError',phone,'Enter a proper phone number (10 digits).');const data=Object.fromEntries(new FormData(e.target));const occasionId=Number(data.occasionId);delete data.occasionId;if(data.occasion==='Other')data.occasion=data.otherOccasion.trim();delete data.otherOccasion;data.orderValue=Number(data.orderValue)||0;data.weightKg=Number(data.weightKg)||0;const existing=occasionId&&occasions.find(item=>item.id===occasionId);if(existing){if(!isAdmin())return alert('Only an administrator can edit an existing occasion.');Object.assign(existing,data);addAudit('Occasion edited',`${data.recipient}'s ${data.occasion} for ${data.customer} was updated.`);}else{occasions.push({...data,id:Date.now()});addAudit('Occasion added',`${data.recipient}'s ${data.occasion} was added for ${data.customer}.`);}startNewOccasion();$('#occasionDialog').close();save();});
$('#occasionSearch').addEventListener('input',e=>renderOccasions(e.target.value));
['input','change'].forEach(eventName=>$('#occasionDateSearch').addEventListener(eventName,()=>renderOccasions($('#occasionSearch').value)));
$('#customerSearch').addEventListener('input',e=>renderCustomers(e.target.value));
$('#downloadCallLog').addEventListener('click',()=>{if(requireAdmin())exportCallLog();});
['#staffForm','#occasionForm'].forEach(selector=>{const form=$(selector);['input','change'].forEach(eventName=>form.addEventListener(eventName,e=>{if(e.target.matches('input[required],select[required]'))clearFieldError(e.target);}));});
$('#staffPassword').addEventListener('input',e=>{const password=e.target.value;const valid=/^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(password);e.target.setCustomValidity(password&&!valid?'Password must have 8 characters, one uppercase letter, one number, and one special character.':'');});
$('#staffForm').addEventListener('submit',e=>{e.preventDefault();if(!requireAdmin()||!validateRequired(e.target,'#staffValidationError'))return;const emailField=$('#staffEmail');if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailField.value.trim()))return showValidationError('#staffValidationError',emailField,'Enter a proper email address.');const password=$('#staffPassword').value;if(!/^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(password)){const error=$('#staffValidationError');$('#staffPassword').classList.add('field-error');error.textContent='Password must have 8 characters, one uppercase letter, one number, and one special character.';error.hidden=false;return;}const data=Object.fromEntries(new FormData(e.target));const email=data.email.trim().toLowerCase();const message=$('#staffFormMessage');users=loadUsers();if(users[email]){message.textContent='An account with this email address already exists.';message.hidden=false;return;}users[email]={name:data.name.trim(),password:data.password,role:data.role,active:true};saveUsers();addAudit('Account created',`${users[email].name} was added as ${data.role}.`);e.target.reset();message.textContent=`${users[email].name} has been added as ${data.role === 'admin' ? 'an administrator' : 'a staff member'}.`;message.hidden=false;render();});
$('#loginForm').addEventListener('submit',e=>{e.preventDefault();const data=Object.fromEntries(new FormData(e.target));const emailField=$('#loginEmail'),passwordField=$('#loginPassword'),error=$('#loginError'),email=emailField.value.trim().toLowerCase();if(!email||!passwordField.value.trim()){emailField.classList.toggle('field-error',!email);passwordField.classList.toggle('field-error',!passwordField.value.trim());error.textContent='All fields are required.';error.hidden=false;return;}if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return showValidationError('#loginError',emailField,'Enter a proper email address.');users=loadUsers();const account=users[email];if(!account||account.password!==data.password||account.active===false){const error=$('#loginError');error.textContent=account?.active===false?'This account has been deactivated. Contact an administrator.':'The email address or password is incorrect.';error.hidden=false;return;}currentUser={email,name:account.name,role:account.role};localStorage.setItem(sessionKey,JSON.stringify({email,role:account.role}));addAudit('Signed in','Opened the reminder desk.',email);$('#loginError').hidden=true;e.target.reset();applyAccess();render();});
['#loginEmail','#loginPassword'].forEach(selector=>$(selector).addEventListener('input',e=>clearFieldError(e.target)));
$('#logoutButton').addEventListener('click',()=>{localStorage.removeItem(sessionKey);currentUser=null;$('#occasionDialog').close();applyAccess();$('#loginEmail').focus();});
restoreSession();
applyAccess();
render();
