async function loadOverview(){
  const status = document.getElementById('pageStatus');
  try {
    const res = await fetch('/api/overview-data', { headers: authHeaders() });
    const data = await res.json();
    if(!data.ok) throw new Error(data.message);
    caseCount.textContent = data.counts.cases;
    sightingCount.textContent = data.counts.sightings;
    agencyCount.textContent = data.counts.agencies;
    reunionCount.textContent = data.counts.reunions;
    statusRows.innerHTML = data.statusBreakdown.map(r => '<tr><td>'+badge(r.status)+'</td><td>'+esc(r.cnt)+'</td></tr>').join('') || '<tr><td colspan="2">No data</td></tr>';
    recentRows.innerHTML = data.recentSightings.map(r => '<tr><td>'+esc(r.case_no)+'<br><small>'+esc(r.full_name)+'</small></td><td>'+esc(r.location)+'</td><td>'+badge(r.status)+'</td></tr>').join('') || '<tr><td colspan="3">No sightings</td></tr>';
    status.textContent = 'Overview loaded.';
    status.className = 'status-message success';
  } catch(error) {
    status.textContent = error.message;
    status.className = 'status-message error';
  }
}
loadOverview();
