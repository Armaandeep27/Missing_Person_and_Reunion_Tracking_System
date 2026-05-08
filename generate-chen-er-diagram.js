const fs = require('fs');
const path = require('path');

const outDir = path.join(__dirname, 'er-diagrams');
fs.mkdirSync(outDir, { recursive: true });

function esc(value) {
  return String(value).replace(/[&<>"']/g, (s) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&apos;'
  }[s]));
}

function line(x1, y1, x2, y2, double = false) {
  const offset = double ? 4 : 0;
  const dx = y1 === y2 ? 0 : offset;
  const dy = x1 === x2 ? 0 : offset;
  return `
    <line x1="${x1 - dx}" y1="${y1 - dy}" x2="${x2 - dx}" y2="${y2 - dy}" class="connector"/>
    ${double ? `<line x1="${x1 + dx}" y1="${y1 + dy}" x2="${x2 + dx}" y2="${y2 + dy}" class="connector"/>` : ''}`;
}

function entity(id, x, y, label) {
  return `
    <g id="${id}" class="entity">
      <rect x="${x - 74}" y="${y - 24}" width="148" height="48" rx="8"/>
      <text x="${x}" y="${y + 5}" text-anchor="middle">${esc(label)}</text>
    </g>`;
}

function attribute(x, y, label, key = false) {
  return `
    <g class="attribute ${key ? 'key' : ''}">
      <ellipse cx="${x}" cy="${y}" rx="${Math.max(48, label.length * 4.5)}" ry="22"/>
      <text x="${x}" y="${y + 5}" text-anchor="middle">${esc(label)}</text>
      ${key ? `<line x1="${x - Math.max(30, label.length * 3.4)}" y1="${y + 10}" x2="${x + Math.max(30, label.length * 3.4)}" y2="${y + 10}" class="underline"/>` : ''}
    </g>`;
}

function relationship(id, x, y, label) {
  return `
    <g id="${id}" class="relationship">
      <polygon points="${x},${y - 36} ${x + 70},${y} ${x},${y + 36} ${x - 70},${y}"/>
      <text x="${x}" y="${y + 5}" text-anchor="middle">${esc(label)}</text>
    </g>`;
}

const parts = [];

parts.push(entity('users', 760, 140, 'USERS'));
parts.push(attribute(620, 65, 'user_id', true));
parts.push(attribute(760, 55, 'full_name'));
parts.push(attribute(910, 75, 'email'));
parts.push(attribute(570, 145, 'username'));
parts.push(attribute(965, 145, 'password_hash'));
parts.push(attribute(650, 220, 'role'));
parts.push(attribute(850, 220, 'status'));
parts.push(line(700, 116, 635, 76));
parts.push(line(760, 116, 760, 77));
parts.push(line(820, 116, 890, 86));
parts.push(line(686, 140, 620, 145));
parts.push(line(834, 140, 900, 145));
parts.push(line(705, 164, 670, 206));
parts.push(line(815, 164, 835, 204));

parts.push(entity('activity', 330, 205, 'ACTIVITY_LOG'));
parts.push(attribute(185, 130, 'log_id', true));
parts.push(attribute(180, 205, 'entity_type'));
parts.push(attribute(190, 275, 'action'));
parts.push(attribute(335, 315, 'action_time'));
parts.push(line(270, 181, 210, 142));
parts.push(line(256, 205, 230, 205));
parts.push(line(270, 229, 220, 265));
parts.push(line(330, 229, 335, 293));
parts.push(relationship('performs', 545, 180, 'PERFORMS'));
parts.push(line(404, 205, 475, 184, true));
parts.push(line(615, 172, 686, 148));

parts.push(entity('agencies', 265, 445, 'AGENCIES'));
parts.push(attribute(100, 365, 'agency_id', true));
parts.push(attribute(105, 445, 'agency_name'));
parts.push(attribute(115, 525, 'agency_type'));
parts.push(attribute(285, 585, 'contact_phone'));
parts.push(line(205, 421, 135, 375));
parts.push(line(191, 445, 160, 445));
parts.push(line(205, 469, 145, 515));
parts.push(line(270, 469, 282, 563));

parts.push(entity('missing', 760, 455, 'MISSING_PERSONS'));
parts.push(attribute(570, 330, 'person_id', true));
parts.push(attribute(745, 310, 'case_no'));
parts.push(attribute(930, 330, 'full_name'));
parts.push(attribute(555, 430, 'gender'));
parts.push(attribute(955, 430, 'age'));
parts.push(attribute(565, 520, 'last_seen_location'));
parts.push(attribute(945, 520, 'case_status'));
parts.push(line(700, 431, 595, 342));
parts.push(line(750, 431, 745, 332));
parts.push(line(820, 431, 900, 342));
parts.push(line(686, 455, 605, 430));
parts.push(line(834, 455, 908, 430));
parts.push(line(700, 479, 605, 510));
parts.push(line(820, 479, 900, 510));

parts.push(relationship('assigned', 510, 445, 'ASSIGNED_TO'));
parts.push(line(339, 445, 440, 445, true));
parts.push(line(580, 445, 686, 445, true));

parts.push(entity('sightings', 1210, 275, 'SIGHTINGS'));
parts.push(attribute(1050, 190, 'sighting_id', true));
parts.push(attribute(1220, 170, 'reported_by'));
parts.push(attribute(1385, 215, 'location'));
parts.push(attribute(1385, 305, 'confidence'));
parts.push(attribute(1210, 375, 'sighting_status'));
parts.push(line(1150, 251, 1085, 202));
parts.push(line(1210, 251, 1220, 192));
parts.push(line(1284, 275, 1345, 225));
parts.push(line(1284, 285, 1345, 300));
parts.push(line(1210, 299, 1210, 353));
parts.push(relationship('has_sighting', 1020, 355, 'HAS_SIGHTING'));
parts.push(line(834, 430, 950, 365, true));
parts.push(line(1090, 350, 1136, 292, true));

parts.push(entity('rehab', 1240, 570, 'REHABILITATION'));
parts.push(attribute(1065, 500, 'rehab_id', true));
parts.push(attribute(1405, 500, 'shelter_name'));
parts.push(attribute(1430, 570, 'health_status'));
parts.push(attribute(1395, 645, 'counselling_status'));
parts.push(line(1180, 546, 1100, 512));
parts.push(line(1300, 546, 1360, 512));
parts.push(line(1314, 570, 1375, 570));
parts.push(line(1300, 594, 1350, 635));
parts.push(relationship('rehab_rel', 1025, 570, 'REHAB_TRACKS'));
parts.push(line(834, 480, 955, 555, true));
parts.push(line(1095, 570, 1166, 570, true));

parts.push(entity('support', 860, 820, 'SUPPORT_PROGRAMS'));
parts.push(attribute(665, 740, 'support_id', true));
parts.push(attribute(865, 710, 'support_type'));
parts.push(attribute(1055, 740, 'amount'));
parts.push(attribute(650, 840, 'sponsor_name'));
parts.push(attribute(1080, 840, 'target_type'));
parts.push(attribute(860, 930, 'donation_group_id'));
parts.push(line(800, 796, 700, 752));
parts.push(line(860, 796, 865, 732));
parts.push(line(920, 796, 1018, 752));
parts.push(line(786, 820, 700, 840));
parts.push(line(934, 820, 1030, 840));
parts.push(line(860, 844, 860, 908));
parts.push(relationship('receives_support', 760, 650, 'RECEIVES'));
parts.push(line(760, 479, 760, 614, true));
parts.push(line(790, 686, 842, 796, true));
parts.push(relationship('agency_support', 500, 705, 'AGENCY_SUPPORT'));
parts.push(line(310, 469, 455, 680));
parts.push(line(570, 705, 786, 812));

parts.push(entity('reunions', 350, 820, 'REUNIONS'));
parts.push(attribute(160, 745, 'reunion_id', true));
parts.push(attribute(170, 840, 'family_contact'));
parts.push(attribute(350, 930, 'reunion_date'));
parts.push(attribute(525, 865, 'outcome'));
parts.push(line(290, 796, 195, 756));
parts.push(line(276, 820, 220, 835));
parts.push(line(350, 844, 350, 908));
parts.push(line(424, 830, 485, 858));
parts.push(relationship('reunited_in', 530, 655, 'REUNITED_IN'));
parts.push(line(700, 479, 585, 630, true));
parts.push(line(500, 690, 380, 796, true));

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1500" height="1040" viewBox="0 0 1500 1040">
  <style>
    .canvas { fill: #fffefd; }
    .connector { stroke: #6f6f6f; stroke-width: 1.5; fill: none; stroke-linecap: round; }
    .entity rect { fill: #ffffff; stroke: #555555; stroke-width: 1.5; }
    .entity text { fill: #222222; font: 700 13px Arial, sans-serif; letter-spacing: .4px; }
    .attribute ellipse { fill: #ffffff; stroke: #777777; stroke-width: 1.3; }
    .attribute text { fill: #222222; font: 12px Arial, sans-serif; }
    .attribute .underline { stroke: #222222; stroke-width: 1; }
    .relationship polygon { fill: #ffffff; stroke: #555555; stroke-width: 1.5; }
    .relationship text { fill: #222222; font: 700 11px Arial, sans-serif; }
    .title { fill: #111111; font: 700 24px Arial, sans-serif; }
    .subtitle { fill: #555555; font: 13px Arial, sans-serif; }
  </style>
  <rect class="canvas" x="0" y="0" width="1500" height="1040"/>
  <text x="48" y="46" class="title">Missing Track Chen-Style ER Diagram</text>
  <text x="48" y="70" class="subtitle">Project-context conceptual ER model based on the full schema diagram</text>
  ${parts.join('\n')}
</svg>`;

const filePath = path.join(outDir, 'chen-style-full-er-diagram.svg');
fs.writeFileSync(filePath, svg, 'utf8');
console.log('Generated ' + filePath);
