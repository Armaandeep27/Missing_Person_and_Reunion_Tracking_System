const fs = require('fs');
const path = require('path');

const outDir = path.join(__dirname, 'er-diagrams', 'individual-tables');
fs.mkdirSync(outDir, { recursive: true });

const tables = {
  users: [
    ['PK', 'id'],
    ['', 'full_name'],
    ['', 'email'],
    ['', 'username'],
    ['', 'password'],
    ['', 'password_hash'],
    ['', 'role'],
    ['', 'status'],
    ['', 'created_at']
  ],
  agencies: [
    ['PK', 'id'],
    ['', 'agency_code'],
    ['', 'agency_name'],
    ['', 'agency_type'],
    ['', 'contact_person'],
    ['', 'phone'],
    ['', 'email'],
    ['', 'address'],
    ['', 'city'],
    ['', 'state'],
    ['', 'created_at']
  ],
  missing_persons: [
    ['PK', 'id'],
    ['', 'case_no'],
    ['', 'full_name'],
    ['', 'gender'],
    ['', 'age'],
    ['', 'guardian_name'],
    ['', 'guardian_phone'],
    ['', 'last_seen_date'],
    ['', 'last_seen_location'],
    ['', 'identifying_marks'],
    ['', 'photo_url'],
    ['', 'status'],
    ['', 'rehabilitation_status'],
    ['FK', 'assigned_agency_id'],
    ['', 'created_at'],
    ['', 'updated_at']
  ],
  sightings: [
    ['PK', 'id'],
    ['FK', 'case_id'],
    ['', 'reported_by_name'],
    ['', 'reporter_phone'],
    ['', 'location'],
    ['', 'sighting_date'],
    ['', 'confidence'],
    ['', 'status'],
    ['', 'notes'],
    ['', 'created_at']
  ],
  rehabilitation_records: [
    ['PK', 'id'],
    ['FK', 'person_id'],
    ['', 'shelter_name'],
    ['', 'health_status'],
    ['', 'counselling_status'],
    ['', 'education_support'],
    ['', 'status'],
    ['', 'notes'],
    ['', 'updated_at']
  ],
  support_programs: [
    ['PK', 'id'],
    ['FK', 'person_id'],
    ['', 'target_type'],
    ['FK', 'target_agency_id'],
    ['', 'donation_group_id'],
    ['', 'sponsor_name'],
    ['', 'sponsor_phone'],
    ['', 'support_type'],
    ['', 'amount'],
    ['', 'start_date'],
    ['', 'status'],
    ['', 'notes']
  ],
  reunions: [
    ['PK', 'id'],
    ['FK', 'person_id'],
    ['', 'reunion_date'],
    ['', 'family_contact'],
    ['', 'verified_by'],
    ['', 'outcome'],
    ['', 'notes'],
    ['', 'created_at']
  ],
  activity_log: [
    ['PK', 'id'],
    ['FK', 'user_id'],
    ['', 'entity_type'],
    ['', 'entity_id'],
    ['', 'action'],
    ['', 'details'],
    ['', 'action_time']
  ]
};

function esc(value) {
  return String(value).replace(/[&<>"']/g, (s) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&apos;'
  }[s]));
}

function renderTable(name, rows) {
  const width = 520;
  const headerHeight = 62;
  const rowHeight = 34;
  const height = headerHeight + rows.length * rowHeight + 34;
  const rowMarkup = rows.map(([key, field], index) => {
    const y = headerHeight + 31 + index * rowHeight;
    const marker = key
      ? `<rect x="34" y="${y - 20}" width="44" height="23" rx="5" class="${key.toLowerCase()}"/><text x="56" y="${y - 4}" text-anchor="middle" class="badge-text">${key}</text>`
      : `<circle cx="56" cy="${y - 9}" r="3" class="dot"/>`;
    return `${marker}<text x="100" y="${y}" class="field">${esc(field)}</text>`;
  }).join('\n  ');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <style>
    .canvas { fill: #fffdf8; }
    .box { fill: #ffffff; stroke: #ad8260; stroke-width: 1.4; }
    .header { fill: #f5e6ca; stroke: #ad8260; stroke-width: 1.4; }
    .title { fill: #3a2418; font: 700 22px Arial, sans-serif; letter-spacing: .2px; }
    .field { fill: #271e18; font: 15px Arial, sans-serif; }
    .pk { fill: #ffe3a3; }
    .fk { fill: #cfe8ff; }
    .badge-text { fill: #271e18; font: 700 11px Arial, sans-serif; }
    .dot { fill: #ad8260; }
  </style>
  <rect class="canvas" x="0" y="0" width="${width}" height="${height}"/>
  <rect class="box" x="18" y="18" width="${width - 36}" height="${height - 36}" rx="12"/>
  <rect class="header" x="18" y="18" width="${width - 36}" height="${headerHeight}" rx="12"/>
  <path class="header" d="M 18 68 H ${width - 18} V 80 H 18 Z"/>
  <text x="34" y="56" class="title">${esc(name)}</text>
  ${rowMarkup}
</svg>`;
}

for (const [name, rows] of Object.entries(tables)) {
  fs.writeFileSync(path.join(outDir, `${name}-table.svg`), renderTable(name, rows), 'utf8');
}

console.log('Generated individual table diagrams in ' + outDir);
