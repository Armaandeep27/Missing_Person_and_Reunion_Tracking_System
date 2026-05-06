const page = document.body.dataset.page;
const statusEl = document.getElementById('pageStatus');
const form = document.getElementById('entityForm');
const head = document.getElementById('entityHead');
const rowsEl = document.getElementById('entityRows');
let records = [], lookups = {}, editingId = null;
const cfg = {
  persons:{ endpoint:'/api/persons', list:'persons', id:'id', title:'Case', writeRoles:['admin','agency'], fields:[['caseNo','Case Number','text','MP-2026-004'],['fullName','Full Name','text'],['gender','Gender','select',['Male','Female','Other','Unknown']],['age','Age','number'],['guardianName','Guardian Name','text'],['guardianPhone','Phone','text'],['lastSeenDate','Last Seen Date','date'],['lastSeenLocation','Last Seen Location','text'],['assignedAgencyId','Assigned Agency','agency'],['status','Case Status','select',['Missing','Sighted','Reunited','Closed']],['rehabilitationStatus','Rehab Status','select',['Not Started','In Progress','Completed']],['photoUrl','Photo URL','text'],['identifyingMarks','Identifying Marks','textarea']], columns:['case_no','full_name','gender','age','last_seen_location','status','rehabilitation_status','agency_name'] },
  agencies:{ endpoint:'/api/agencies', list:'agencies', id:'id', title:'Agency', writeRoles:['admin'], fields:[['agencyCode','Agency Code','text'],['agencyName','Agency Name','text'],['agencyType','Type','select',['Police Station','NGO','Shelter','Hospital','Child Welfare','Other']],['contactPerson','Contact Person','text'],['phone','Phone','text'],['email','Email','email'],['address','Address','text'],['city','City','text'],['state','State','text']], columns:['agency_code','agency_name','agency_type','contact_person','phone','city','state'] },
  sightings:{ endpoint:'/api/sightings', list:'sightings', id:'id', title:'Sighting', writeRoles:['admin','agency'], fields:[['caseId','Case','person'],['reportedByName','Reported By','text'],['reporterPhone','Reporter Phone','text'],['location','Location','text'],['sightingDate','Sighting Date/Time','datetime-local'],['confidence','Confidence','select',['Low','Medium','High']],['status','Status','select',['New','Under Verification','Verified','Rejected']],['notes','Notes','textarea']], columns:['case_no','full_name','location','sighting_date','confidence','status'] },
  rehabilitation:{ endpoint:'/api/rehabilitation', list:'rehabilitation', id:'id', title:'Rehabilitation', writeRoles:['admin','agency'], fields:[['personId','Case','person'],['shelterName','Shelter Name','text'],['healthStatus','Health Status','text'],['counsellingStatus','Counselling','text'],['educationSupport','Education Support','text'],['status','Status','select',['Pending','In Progress','Completed']],['notes','Notes','textarea']], columns:['case_no','full_name','shelter_name','health_status','counselling_status','education_support','status'] },
  support:{ endpoint:'/api/support-programs', list:'support-programs', id:'id', title:'Support Program', writeRoles:['admin','sponsor'], manageRoles:['admin'], fields:[['donationTarget','Donation Target','select',['Single Person','Multiple People','Whole Agency']],['personId','Case','person'],['personIds','Multiple Cases','people'],['agencyId','Agency','agency'],['sponsorName','Sponsor Name','text'],['sponsorPhone','Sponsor Phone','text'],['supportType','Support Type','select',['Sponsorship','Scholarship','Medical Aid','Shelter Aid','Food Support','Other']],['amount','Amount per Recipient','number'],['startDate','Start Date','date'],['status','Status','select',['Planned','Active','Completed','Paused']],['notes','Notes','textarea']], columns:['case_no','full_name','target_type','agency_name','sponsor_name','support_type','amount','start_date','status'] },
  reunions:{ endpoint:'/api/reunions', list:'reunions', id:'id', title:'Re-Union', writeRoles:['admin','agency'], fields:[['personId','Case','person'],['reunionDate','Reunion Date','date'],['familyContact','Family Contact','text'],['verifiedBy','Verified By','text'],['outcome','Outcome','select',['Reunited','Follow-up Required','Closed']],['notes','Notes','textarea']], columns:['case_no','full_name','reunion_date','family_contact','verified_by','outcome'] }
}[page];
const canCreate = cfg?.writeRoles?.includes(currentUser?.role);
const canManage = (cfg?.manageRoles || cfg?.writeRoles || []).includes(currentUser?.role);
const snake = s => s.replace(/[A-Z]/g, m => '_' + m.toLowerCase());
function dbToField(row, name){ const key = snake(name); return row[key] ?? row[name] ?? ''; }
function options(type){
  if(type==='person') return (lookups.persons||[]).map(p=>'<option value="'+p.person_id+'">'+esc(p.case_no+' - '+p.full_name)+'</option>').join('');
  if(type==='people') return (lookups.persons||[]).map(p=>'<option value="'+p.person_id+'">'+esc(p.case_no+' - '+p.full_name)+'</option>').join('');
  if(type==='agency') return '<option value="">Unassigned</option>'+(lookups.agencies||[]).map(a=>'<option value="'+a.agency_id+'">'+esc(a.agency_name)+'</option>').join('');
  return '';
}
function buildForm(row={}){
  if (!canCreate && !canManage) {
    document.getElementById('formTitle').textContent = 'View ' + cfg.title;
    form.innerHTML = '<p class="status-message">Your role can view this module, but cannot add or edit these records.</p>';
    return;
  }
  document.getElementById('formTitle').textContent = (editingId?'Edit ':'Add ') + cfg.title;
  form.innerHTML = cfg.fields.filter(f => {
    const [name] = f;
    if (page !== 'support') return true;
    if (currentUser?.role === 'sponsor' && name === 'sponsorName') return false;
    if (editingId) return !['donationTarget', 'personIds', 'agencyId'].includes(name);
    return true;
  }).map(f=>{
    const [name,label,type,extra]=f;
    let value=dbToField(row,name);
    if(type==='date' && value) value=String(value).slice(0,10);
    if(type==='datetime-local' && value) value=String(value).replace(' ','T').slice(0,16);
    const targetClass = page === 'support' && ['donationTarget', 'personId', 'personIds', 'agencyId'].includes(name) ? ' support-target-field' : '';
    const fullClass = ['donationTarget', 'personIds'].includes(name) ? ' full' : '';
    if(type==='select') return '<div class="field'+fullClass+targetClass+'" data-field="'+name+'"><label>'+label+'</label><select name="'+name+'">'+extra.map(o=>'<option '+(o==value?'selected':'')+'>'+o+'</option>').join('')+'</select></div>';
    if(type==='person'||type==='agency') return '<div class="field'+targetClass+'" data-field="'+name+'"><label>'+label+'</label><select name="'+name+'">'+options(type)+'</select></div>';
    if(type==='people') return '<div class="field full'+targetClass+'" data-field="'+name+'"><label>'+label+'</label><select name="'+name+'" multiple size="5">'+options(type)+'</select></div>';
    if(type==='textarea') return '<div class="field full" data-field="'+name+'"><label>'+label+'</label><textarea name="'+name+'">'+esc(value)+'</textarea></div>';
    return '<div class="field" data-field="'+name+'"><label>'+label+'</label><input name="'+name+'" type="'+type+'" value="'+esc(value)+'" '+(extra?'placeholder="'+esc(extra)+'"':'')+'></div>';
  }).join('') + '<div class="button-row"><button class="login-button" type="submit"><i class="fa-solid fa-floppy-disk"></i> Save</button><button class="secondary-button" type="button" id="clearButton">Clear</button></div>';
  if(row.assigned_agency_id && form.assignedAgencyId) form.assignedAgencyId.value=row.assigned_agency_id;
  if(row.case_id && form.caseId) form.caseId.value=row.case_id;
  if(row.person_id && form.personId) form.personId.value=row.person_id;
  document.getElementById('clearButton').onclick=()=>{editingId=null; buildForm();};
  setupSupportTargetFlow();
}
function setupSupportTargetFlow() {
  if (page !== 'support' || editingId || !form.donationTarget) return;
  const apply = () => {
    const target = form.donationTarget.value;
    form.querySelector('[data-field="personId"]').classList.toggle('hidden-by-role', target !== 'Single Person');
    form.querySelector('[data-field="personIds"]').classList.toggle('hidden-by-role', target !== 'Multiple People');
    form.querySelector('[data-field="agencyId"]').classList.toggle('hidden-by-role', target !== 'Whole Agency');
  };
  form.donationTarget.addEventListener('change', apply);
  apply();
}
function tableCell(row, column) {
  if (page === 'support' && row.target_type === 'Whole Agency') {
    if (column === 'case_no') return '-';
    if (column === 'full_name') return 'Agency-wide';
  }
  return row[column] ?? '-';
}
function render(){
  const term=(document.getElementById('searchBox')?.value||'').toLowerCase();
  const filtered=records.filter(r=>JSON.stringify(r).toLowerCase().includes(term));
  head.innerHTML='<tr>'+cfg.columns.map(c=>'<th>'+esc(c.replaceAll('_',' '))+'</th>').join('')+(canManage?'<th>Actions</th>':'')+'</tr>';
  rowsEl.innerHTML=filtered.map(r=>'<tr>'+cfg.columns.map(c=>'<td>'+(/status|confidence|outcome/.test(c)?badge(tableCell(r,c)):esc(tableCell(r,c)))+'</td>').join('')+(canManage?'<td class="action-cell"><button class="icon-button" onclick="editRecord('+r[cfg.id]+')"><i class="fa-solid fa-pen"></i></button><button class="icon-button danger" onclick="deleteRecord('+r[cfg.id]+')"><i class="fa-solid fa-trash"></i></button></td>':'')+'</tr>').join('') || '<tr><td colspan="20">No records found.</td></tr>';
}
async function load(){
  try{
    const [lu,res]=await Promise.all([fetch('/api/lookups', { headers: authHeaders() }).then(r=>r.json()), fetch(cfg.endpoint, { headers: authHeaders() }).then(r=>r.json())]);
    lookups=lu;
    if(!res.ok) throw new Error(res.message);
    records=res[cfg.list] || [];
    buildForm();
    render();
    statusEl.textContent='Records loaded.';
    statusEl.className='status-message success';
  }catch(error){
    statusEl.textContent=error.message;
    statusEl.className='status-message error';
  }
}
form?.addEventListener('submit', async e=>{
  e.preventDefault();
  if (!canCreate && !canManage) return;
  const data=Object.fromEntries(new FormData(form).entries());
  if (page === 'support' && currentUser?.role === 'sponsor') data.sponsorName = currentUser.full_name || currentUser.username;
  if (page === 'support' && form.personIds) data.personIds = [...form.personIds.selectedOptions].map(o => o.value);
  if (page === 'support' && !editingId) {
    if (data.donationTarget !== 'Single Person') delete data.personId;
    if (data.donationTarget !== 'Multiple People') data.personIds = [];
    if (data.donationTarget !== 'Whole Agency') delete data.agencyId;
  }
  data.userId=currentUser?.id;
  try{
    const res=await fetch(cfg.endpoint+(editingId?'/'+editingId:''),{method:editingId?'PUT':'POST',headers:authHeaders({'Content-Type':'application/json'}),body:JSON.stringify(data)});
    const out=await res.json();
    if(!out.ok) throw new Error(out.message);
    editingId=null;
    await load();
    statusEl.textContent=out.message;
    statusEl.className='status-message success';
  }catch(error){
    statusEl.textContent=error.message;
    statusEl.className='status-message error';
  }
});
window.editRecord=id=>{ if(!canManage) return; editingId=id; buildForm(records.find(r=>r[cfg.id]===id)); window.scrollTo({top:0,behavior:'smooth'}); };
window.deleteRecord=async id=>{ if(!canManage) return; if(!confirm('Delete this record?')) return; const res=await fetch(cfg.endpoint+'/'+id,{method:'DELETE',headers:authHeaders()}); const out=await res.json(); if(!out.ok) alert(out.message); await load(); };
document.getElementById('searchBox')?.addEventListener('input',render);
document.getElementById('refreshButton')?.addEventListener('click',load);
if(cfg) load();
