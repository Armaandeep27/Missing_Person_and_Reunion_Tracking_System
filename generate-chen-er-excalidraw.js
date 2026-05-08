const fs = require('fs');
const path = require('path');

const outDir = path.join(__dirname, 'er-diagrams');
fs.mkdirSync(outDir, { recursive: true });

let index = 1;
const elements = [];

function id(prefix) {
  return prefix + '_' + String(index++).padStart(4, '0');
}

function base(type, x, y, width, height) {
  return {
    id: id(type),
    type,
    x,
    y,
    width,
    height,
    angle: 0,
    strokeColor: '#555555',
    backgroundColor: 'transparent',
    fillStyle: 'hachure',
    strokeWidth: 1,
    strokeStyle: 'solid',
    roughness: 1.4,
    opacity: 100,
    groupIds: [],
    frameId: null,
    roundness: type === 'rectangle' ? { type: 3 } : null,
    seed: 1000 + index,
    version: 1,
    versionNonce: 2000 + index,
    isDeleted: false,
    boundElements: null,
    updated: Date.now(),
    link: null,
    locked: false
  };
}

function text(x, y, value, size = 14, bold = false) {
  elements.push({
    ...base('text', x, y, Math.max(40, value.length * size * 0.58), size * 1.35),
    strokeColor: '#222222',
    backgroundColor: 'transparent',
    fillStyle: 'solid',
    roughness: 0,
    text: value,
    fontSize: size,
    fontFamily: 1,
    textAlign: 'center',
    verticalAlign: 'middle',
    baseline: Math.round(size),
    containerId: null,
    originalText: value,
    lineHeight: 1.25
  });
}

function entity(cx, cy, label) {
  elements.push({
    ...base('rectangle', cx - 74, cy - 24, 148, 48),
    backgroundColor: '#ffffff',
    fillStyle: 'solid'
  });
  text(cx - Math.max(28, label.length * 4.2), cy - 10, label, 14, true);
}

function attr(cx, cy, label, key = false) {
  const width = Math.max(96, label.length * 9);
  elements.push({
    ...base('ellipse', cx - width / 2, cy - 22, width, 44),
    backgroundColor: '#ffffff',
    fillStyle: 'solid'
  });
  text(cx - Math.max(24, label.length * 3.5), cy - 9, label, 12);
  if (key) line(cx - Math.max(30, label.length * 3.4), cy + 10, cx + Math.max(30, label.length * 3.4), cy + 10);
}

function rel(cx, cy, label) {
  elements.push({
    ...base('diamond', cx - 70, cy - 36, 140, 72),
    backgroundColor: '#ffffff',
    fillStyle: 'solid'
  });
  text(cx - Math.max(30, label.length * 3.5), cy - 9, label, 12, true);
}

function line(x1, y1, x2, y2, double = false) {
  elements.push({
    ...base('line', x1, y1, x2 - x1, y2 - y1),
    points: [[0, 0], [x2 - x1, y2 - y1]],
    lastCommittedPoint: null,
    startBinding: null,
    endBinding: null,
    startArrowhead: null,
    endArrowhead: null
  });
  if (double) {
    const off = 4;
    elements.push({
      ...base('line', x1 + off, y1 + off, x2 - x1, y2 - y1),
      points: [[0, 0], [x2 - x1, y2 - y1]],
      lastCommittedPoint: null,
      startBinding: null,
      endBinding: null,
      startArrowhead: null,
      endArrowhead: null
    });
  }
}

function polyline(points, double = false) {
  for (let i = 1; i < points.length; i++) {
    line(points[i - 1][0], points[i - 1][1], points[i][0], points[i][1], double);
  }
}

text(48, 28, 'Missing Track Chen-Style ER Diagram', 24, true);
text(48, 62, 'Project-context conceptual ER model based on the full schema diagram', 13);

entity(760, 140, 'USERS');
attr(620, 65, 'user_id', true); attr(760, 55, 'full_name'); attr(910, 75, 'email');
attr(570, 145, 'username'); attr(965, 145, 'password_hash'); attr(650, 220, 'role'); attr(850, 220, 'status');
line(700, 116, 635, 76); line(760, 116, 760, 77); line(820, 116, 890, 86); line(686, 140, 620, 145);
line(834, 140, 900, 145); line(705, 164, 670, 206); line(815, 164, 835, 204);

entity(330, 205, 'ACTIVITY_LOG');
attr(185, 130, 'log_id', true); attr(180, 205, 'entity_type'); attr(190, 275, 'action'); attr(335, 315, 'action_time');
line(270, 181, 210, 142); line(256, 205, 230, 205); line(270, 229, 220, 265); line(330, 229, 335, 293);
rel(545, 180, 'PERFORMS'); line(404, 205, 475, 184, true); line(615, 172, 686, 148);

entity(265, 445, 'AGENCIES');
attr(100, 365, 'agency_id', true); attr(105, 445, 'agency_name'); attr(115, 525, 'agency_type'); attr(285, 585, 'contact_phone');
line(205, 421, 135, 375); line(191, 445, 160, 445); line(205, 469, 145, 515); line(270, 469, 282, 563);

entity(760, 455, 'MISSING_PERSONS');
attr(570, 330, 'person_id', true); attr(745, 310, 'case_no'); attr(930, 330, 'full_name'); attr(555, 430, 'gender');
attr(955, 430, 'age'); attr(565, 520, 'last_seen_location'); attr(945, 520, 'case_status');
line(700, 431, 595, 342); line(750, 431, 745, 332); line(820, 431, 900, 342); line(686, 455, 605, 430);
line(834, 455, 908, 430); line(700, 479, 605, 510); line(820, 479, 900, 510);

rel(510, 445, 'ASSIGNED_TO'); line(339, 445, 440, 445, true); line(580, 445, 686, 445, true);

entity(1210, 275, 'SIGHTINGS');
attr(1050, 190, 'sighting_id', true); attr(1220, 170, 'reported_by'); attr(1385, 215, 'location');
attr(1385, 305, 'confidence'); attr(1210, 375, 'sighting_status');
line(1150, 251, 1085, 202); line(1210, 251, 1220, 192); line(1284, 275, 1345, 225); line(1284, 285, 1345, 300);
line(1210, 299, 1210, 353); rel(1020, 355, 'HAS_SIGHTING'); line(834, 430, 950, 365, true); line(1090, 350, 1136, 292, true);

entity(1240, 570, 'REHABILITATION');
attr(1065, 500, 'rehab_id', true); attr(1405, 500, 'shelter_name'); attr(1430, 570, 'health_status'); attr(1395, 645, 'counselling_status');
line(1180, 546, 1100, 512); line(1300, 546, 1360, 512); line(1314, 570, 1375, 570); line(1300, 594, 1350, 635);
rel(1025, 570, 'REHAB_TRACKS'); line(834, 480, 955, 555, true); line(1095, 570, 1166, 570, true);

entity(860, 820, 'SUPPORT_PROGRAMS');
attr(665, 740, 'support_id', true); attr(865, 710, 'support_type'); attr(1055, 740, 'amount'); attr(650, 840, 'sponsor_name');
attr(1080, 840, 'target_type'); attr(860, 930, 'donation_group_id');
line(800, 796, 700, 752); line(860, 796, 865, 732); line(920, 796, 1018, 752); line(786, 820, 700, 840);
line(934, 820, 1030, 840); line(860, 844, 860, 908);
rel(760, 650, 'RECEIVES'); line(760, 479, 760, 614, true); line(790, 686, 842, 796, true);
rel(500, 705, 'AGENCY_SUPPORT'); line(310, 469, 455, 680); line(570, 705, 786, 812);

entity(350, 820, 'REUNIONS');
attr(160, 745, 'reunion_id', true); attr(170, 840, 'family_contact'); attr(350, 930, 'reunion_date'); attr(525, 865, 'outcome');
line(290, 796, 195, 756); line(276, 820, 220, 835); line(350, 844, 350, 908); line(424, 830, 485, 858);
rel(530, 655, 'REUNITED_IN'); line(700, 479, 585, 630, true); line(500, 690, 380, 796, true);

const file = {
  type: 'excalidraw',
  version: 2,
  source: 'https://excalidraw.com',
  elements,
  appState: {
    gridSize: null,
    viewBackgroundColor: '#ffffff'
  },
  files: {}
};

const outFile = path.join(outDir, 'chen-style-full-er-diagram.excalidraw');
fs.writeFileSync(outFile, JSON.stringify(file, null, 2), 'utf8');
console.log('Generated ' + outFile);
