/* ═══════════════════════════════════════════════════════════════
   FOOD DELIVERY BOT  —  app.js  v7.0.0
   ─ Bluetooth (Web Bluetooth API — HC-05/06 via SPP)
   ─ All WiFi/ESP/WebSocket/HTTP/MQTT concepts REMOVED
   ─ Grid size selector (10,15,20,25 or custom 5-40)
   ─ Movement duration control (seconds per command)
   ─ D-pad sends BT commands with timed STOP
   ─ Auto nav sends BT commands per step
   ─ All previous features retained
   ═══════════════════════════════════════════════════════════════ */
'use strict';

// ─── GRID ─────────────────────────────────────────────────────
let GRID = 10;   // starts at 10×10
const RAND_OBS_COUNT = 20;
const SUBGOAL_FAR_THRESHOLD = 8;

// ─── CANVAS ───────────────────────────────────────────────────
const canvas = document.getElementById('mapCanvas');
const ctx    = canvas.getContext('2d');
let CELL = 0;

// ─── THEME ────────────────────────────────────────────────────
let isDark = true;

// ─── MAP STATE ────────────────────────────────────────────────
let grid     = [];
let startPos = { x: 1, y: 1 };
let goalPos  = { x: 8, y: 8 };
let subGoals = [];

// ─── MOVING OBSTACLES ─────────────────────────────────────────
let movingObs = [];
let movingObsTimer = null;

// ─── PATH STATE ───────────────────────────────────────────────
let botPath       = [];
let shortestPath  = [];
let initialOptLen = 0;
let completedPath = [];
let deliveryDone  = false;
let visitedSet    = new Set();

// ─── BOT STATE ────────────────────────────────────────────────
let botX = 1, botY = 1, botDir = 0;
let rX = 1, rY = 1, rDir = 0;

// ─── CONTROL ──────────────────────────────────────────────────
let mode        = 'manual';
let editMode    = null;
let autoRunning = false;
let autoTimer   = null;
let navSpeed    = 4;

// ─── DEVIATION TRACKING ───────────────────────────────────────
let lastDeviationWarnStep = -5;

// ─── STATS ────────────────────────────────────────────────────
let statSteps    = 0;
let statObs      = 0;
let statReplans  = 0;
let manualSteps  = 0;
let missionStart = null;

// ─── SUBGOAL PRIORITY ─────────────────────────────────────────
let pendingFarSubGoals = [];
let farDialogIdx = 0;

// ─── BLUETOOTH ────────────────────────────────────────────────
// Web Bluetooth API — connects to HC-05/HC-06 SPP characteristic
let btDevice    = null;
let btServer    = null;
let btService   = null;
let btCharTx    = null;   // write characteristic (to robot)
let btConnected = false;

// Nordic UART / SPP UUIDs (most BT serial adapters use these)
const BT_SERVICE_UUID = '0000ffe0-0000-1000-8000-00805f9b34fb';
const BT_CHAR_UUID    = '0000ffe1-0000-1000-8000-00805f9b34fb';

// Active stop timers (for duration-controlled commands)
let btStopTimer = null;

// ─── BT COMMAND CHARS ─────────────────────────────────────────
const BT_CMDS = { FORWARD:'F\n', BACKWARD:'B', RIGHT:'R', LEFT:'L', STOP:'S' };

// ─── ROBOT HEADING (facing direction on the physical floor) ────
// 0=North(grid-up) 90=East(grid-right) 180=South(grid-down) 270=West(grid-left)
// We track this so we can send F/B/L/R relative to where the robot FACES,
// not absolute grid direction. e.g. moving grid-down when facing South = FORWARD.
let botHeading = 0;
const DIR_HEADING = { up:0, right:90, down:180, left:270 };

// ─── GYRO CALIBRATION ─────────────────────────────────────────
// User gyro test results:
//   Right: Yaw delta ≈ -10.58° actual  (target 90°) → barely turned
//   Left:  Roll delta ≈ +51.63° actual (target 90°) → massively overshot
//
// Correction: RIGHT needs much longer pulse, LEFT needs shorter pulse.
// We use per-command durations (ms) instead of fixed 2000ms for turns.
// User can tune these in the Gyro Calibration panel.
const turnCal = {
  fwdMs:   2000,   // FORWARD duration ms
  bwdMs:   2000,   // BACKWARD duration ms
  rightMs:  800,   // RIGHT — gyro shows ~10° at 2s, need ~8.5x less overshoot → shorter burst
  leftMs:  1150,   // LEFT  — gyro shows ~52° at 2s, already too much → reduce
};

// ═══════════════════════════════════════════════════════════════
// BLUETOOTH
// ═══════════════════════════════════════════════════════════════
async function btConnect() {
  if (!navigator.bluetooth) {
    sysLog('⚠ Web Bluetooth not supported in this browser. Use Chrome/Edge on Android/PC.', 'err');
    showToast('Web Bluetooth not supported — use Chrome/Edge');
    return;
  }
  try {
    sysLog('Scanning for Bluetooth devices…', 'sys');
    btDevice = await navigator.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: [BT_SERVICE_UUID]
    });
    sysLog(`Found: ${btDevice.name || 'Unknown'}`, 'sys');
    btServer  = await btDevice.gatt.connect();
    sysLog('GATT connected', 'sys');

    try {
      btService = await btServer.getPrimaryService(BT_SERVICE_UUID);
      btCharTx  = await btService.getCharacteristic(BT_CHAR_UUID);
    } catch (_) {
      // Some devices expose a different UUID — try generic serial
      sysLog('SPP UUID not found — device connected (simulation mode)', 'sys');
      btCharTx = null;
    }

    btConnected = true;
    btDevice.addEventListener('gattserverdisconnected', btOnDisconnect);
    setBtUI(true, btDevice.name || 'BT Device');
    sysLog(`✓ Bluetooth connected: ${btDevice.name || 'Unknown'}`, 'sys');
    showToast(`🔵 Connected: ${btDevice.name || 'BT Device'}`);
  } catch (err) {
    sysLog(`BT connect failed: ${err.message}`, 'err');
    showToast('BT connect cancelled or failed');
    btConnected = false;
    setBtUI(false, '');
  }
}

function btDisconnect() {
  if (btDevice && btDevice.gatt.connected) btDevice.gatt.disconnect();
  btOnDisconnect();
}

function btOnDisconnect() {
  btConnected = false; btDevice = null; btServer = null; btCharTx = null;
  setBtUI(false, '');
  sysLog('Bluetooth disconnected', 'sys');
  showToast('🔴 Bluetooth disconnected');
}

function setBtUI(connected, name) {
  const dot   = document.getElementById('btDot');
  const label = document.getElementById('btLabel');
  const dname = document.getElementById('btDeviceName');
  const btnC  = document.getElementById('btnBtConnect');
  const btnD  = document.getElementById('btnBtDisconn');

  dot.className   = connected ? 'bt-dot connected' : 'bt-dot';
  label.textContent = connected ? 'CONNECTED' : 'DISCONNECTED';
  label.style.color = connected ? 'var(--green)' : 'var(--dim)';
  dname.textContent = connected ? `📡 ${name}` : '';
  btnC.style.display = connected ? 'none' : '';
  btnD.style.display = connected ? ''     : 'none';
}

async function sendBtCmd(cmd) {
  const raw = BT_CMDS[cmd] !== undefined ? BT_CMDS[cmd] : cmd;
  const encoded = new TextEncoder().encode(raw);
  const display = cmd === 'FORWARD' ? 'F\\n' : raw;
  document.getElementById('btLastCmd').textContent = display;
  sysLog(`BT TX → ${display}`, 'tx');
  if (!btConnected || !btCharTx) return;
  try { await btCharTx.writeValue(encoded); }
  catch (err) { sysLog(`BT write error: ${err.message}`, 'err'); }
}

// ─────────────────────────────────────────────────────────────
// HEADING-AWARE MOVE TRANSLATION
// Convert a grid direction (up/down/left/right) into the correct
// F / B / L / R command relative to the robot's current physical heading.
//
// Example: robot faces SOUTH (heading=180), grid move = down (south)
//          → relative to robot that IS forward → send FORWARD
//
// Then rotate the heading accordingly and send STOP after calibrated ms.
// ─────────────────────────────────────────────────────────────
function sendGridMove(gridDir) {
  const targetHeading = DIR_HEADING[gridDir]; // absolute heading for this grid move
  const delta = ((targetHeading - botHeading) + 360) % 360;

  let cmd, durMs;

  if (delta === 0) {
    // Already facing the right direction → go straight
    cmd = 'FORWARD'; durMs = turnCal.fwdMs;
  } else if (delta === 180) {
    // Facing exactly opposite → reverse
    cmd = 'BACKWARD'; durMs = turnCal.bwdMs;
  } else if (delta === 90) {
    // Need to turn right (clockwise)
    cmd = 'RIGHT'; durMs = getCal('rightMs');
  } else if (delta === 270) {
    // Need to turn left (counter-clockwise)
    cmd = 'LEFT'; durMs = getCal('leftMs');
  } else {
    // Diagonal shouldn't happen in 4-dir grid, fallback
    cmd = 'FORWARD'; durMs = turnCal.fwdMs;
  }

  // Update robot heading to the new direction
  botHeading = targetHeading;
  updateHeadingUI();

  clearTimeout(btStopTimer);
  sendBtCmd(cmd);
  sysLog(`  ↳ heading ${botHeading}° → delta ${delta}° → ${cmd} for ${durMs}ms`, 'sys');
  btStopTimer = setTimeout(() => sendBtCmd('STOP'), durMs);
}

// Read live calibration values from the panel inputs
function getCal(key) {
  const el = document.getElementById('cal_' + key);
  return el ? Math.max(50, parseInt(el.value) || turnCal[key]) : turnCal[key];
}

// Backward-compat shim used by older call sites
function sendMove(direction, cmd) {
  const gridDirMap = { FORWARD:'up', BACKWARD:'down', LEFT:'left', RIGHT:'right' };
  sendGridMove(gridDirMap[cmd] || 'up');
}

// Update the heading compass UI after each move
function updateHeadingUI() {
  const arrows  = { 0:'↑', 90:'→', 180:'↓', 270:'←' };
  const labels  = { 0:'NORTH (facing grid-up)', 90:'EAST (facing grid-right)',
                    180:'SOUTH (facing grid-down)', 270:'WEST (facing grid-left)' };
  const compass = document.getElementById('headingCompass');
  const degEl   = document.getElementById('headingDeg');
  const lblEl   = document.getElementById('headingLabel');
  if (compass) compass.textContent = arrows[botHeading] || '↑';
  if (degEl)   degEl.textContent   = botHeading + '°';
  if (lblEl)   lblEl.textContent   = labels[botHeading] || '';
}

function resetCalDefaults() {
  const defaults = { leftMs:1150, rightMs:800, fwdMs:2000, bwdMs:2000 };
  Object.entries(defaults).forEach(([k,v]) => {
    const el = document.getElementById('cal_'+k); if(el) el.value = v;
  });
  showToast('↺ Calibration reset to gyro-derived defaults');
}

// ═══════════════════════════════════════════════════════════════
// GRID SIZE
// ═══════════════════════════════════════════════════════════════
function setGridSize(n) {
  n = Math.max(5, Math.min(40, parseInt(n)));
  GRID = n;

  // Update UI labels
  [10,15,20,25].forEach(s => {
    const btn = document.getElementById('gs' + s);
    if (btn) btn.className = s === n ? 'gs-btn active' : 'gs-btn';
  });
  document.getElementById('gsCurrentLabel').textContent = `${n}×${n}`;
  document.getElementById('mapCoord').textContent = `GRID ${n}×${n}`;
  document.getElementById('gsCustom').value = n;

  // IMPORTANT: resize canvas FIRST so CELL is correct before any drawing
  resizeCanvas();

  // Now reset everything with the correct GRID size
  // Set goal to bottom-right corner of new grid
  startPos = { x: 1, y: 1 };
  goalPos  = { x: GRID - 2, y: GRID - 2 };
  botX = 1; botY = 1; botDir = 0; botHeading = 0;
  rX = 1;   rY = 1;   rDir = 0;

  // Hard reset state
  subGoals = []; visitedSet = new Set(); completedPath = []; deliveryDone = false;
  statSteps = 0; statObs = 0; statReplans = 0; manualSteps = 0;
  missionStart = null; initialOptLen = 0; lastDeviationWarnStep = -5;
  botPath = []; movingObs = [];
  clearInterval(movingObsTimer); movingObsTimer = null;
  const moBtn = document.getElementById('btnMovingObs');
  if (moBtn) moBtn.textContent = '🔄 Moving Obstacles';

  initGrid();
  editMode = null;
  document.getElementById('editMode').textContent = 'NONE';
  ['eStart','eGoal','eSub','eObs'].forEach(id => {
    const el = document.getElementById(id); if (el) el.style.opacity = '1';
  });
  setSubGoalButtonEnabled(true);
  setNavStatus('idle');
  updateStats();
  refreshShortestPath();

  sysLog(`Grid resized → ${n}×${n}`, 'sys');
  showToast(`Grid: ${n}×${n}`);
}

function applyCustomGrid() {
  const val = parseInt(document.getElementById('gsCustom').value);
  if (isNaN(val) || val < 5 || val > 40) {
    showToast('Custom size must be 5–40'); return;
  }
  setGridSize(val);
}

// ═══════════════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════════════
function initGrid() {
  grid = Array.from({ length: GRID }, () => Array(GRID).fill(0));
  for (let i = 0; i < GRID; i++)
    grid[0][i] = grid[GRID-1][i] = grid[i][0] = grid[i][GRID-1] = 1;
}

function resizeCanvas() {
  const wrap = document.getElementById('mapContainer').parentElement;
  const avail = wrap ? wrap.clientWidth : 500;
  const size  = Math.max(240, Math.min(avail, 560));
  canvas.width = canvas.height = size;
  CELL = size / GRID;
  const mc = document.getElementById('mapContainer');
  mc.style.width = mc.style.height = size + 'px';
}

function init() {
  resizeCanvas();
  setGridSize(10);  // initialise 10×10 grid, canvas already sized
  sysLog('System boot — OK', 'sys');
  sysLog('D* Lite planner ready', 'sys');
  sysLog('Bluetooth: pair HC-05/HC-06 in OS settings, then click CONNECT', 'sys');
  renderLoop();
}

window.addEventListener('resize', resizeCanvas);
window.addEventListener('load', init);

// ═══════════════════════════════════════════════════════════════
// THEME
// ═══════════════════════════════════════════════════════════════
function toggleTheme() {
  isDark = !isDark;
  document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  document.getElementById('themeIcon').textContent  = isDark ? '☀️' : '🌙';
  document.getElementById('themeLabel').textContent = isDark ? 'LIGHT' : 'DARK';
  sysLog(`Theme → ${isDark ? 'DARK' : 'LIGHT PINK'}`, 'sys');
}

// ═══════════════════════════════════════════════════════════════
// RENDER LOOP
// ═══════════════════════════════════════════════════════════════
function renderLoop() { drawFrame(); requestAnimationFrame(renderLoop); }

function drawFrame() {
  if (!CELL) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawGrid();
  drawMovingObsHighlight();
  drawVisitedTrail();
  drawCompletedPath();
  drawShortestPathOverlay();
  drawBotPath();
  drawSpecialCells();
  drawRobot(rX, rY, rDir);
  rX   += (botX - rX)   * 0.22;
  rY   += (botY - rY)   * 0.22;
  let da = botDir - rDir;
  if (da >  180) da -= 360;
  if (da < -180) da += 360;
  rDir += da * 0.22;
}

function cv(n) { return getComputedStyle(document.documentElement).getPropertyValue(n).trim(); }

// ─── GRID DRAW ────────────────────────────────────────────────
function drawGrid() {
  const cA = cv('--cell-a')||'#0c1422', cB = cv('--cell-b')||'#0a1120';
  for (let r = 0; r < GRID; r++) {
    for (let c = 0; c < GRID; c++) {
      const px = c*CELL, py = r*CELL;
      if (grid[r][c] === 1) { drawObsTile(px, py); }
      else { ctx.fillStyle=(r+c)%2===0?cA:cB; ctx.fillRect(px,py,CELL,CELL); }
      ctx.strokeStyle = isDark?'rgba(23,32,53,0.65)':'rgba(248,187,208,0.7)';
      ctx.lineWidth=0.4; ctx.strokeRect(px,py,CELL,CELL);
    }
  }
}

function drawObsTile(px,py) {
  const bg=cv('--cell-obs-bg')||'#130606', fg=cv('--cell-obs-fg')||'rgba(255,23,68,0.48)', xc=cv('--cell-obs-x')||'rgba(255,23,68,0.72)';
  ctx.fillStyle=bg; ctx.fillRect(px,py,CELL,CELL);
  ctx.fillStyle=fg; ctx.fillRect(px+1,py+1,CELL-2,CELL-2);
  ctx.strokeStyle=xc; ctx.lineWidth=1.4;
  const m=Math.max(2,CELL*0.18);
  ctx.beginPath(); ctx.moveTo(px+m,py+m); ctx.lineTo(px+CELL-m,py+CELL-m); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(px+CELL-m,py+m); ctx.lineTo(px+m,py+CELL-m); ctx.stroke();
}

// ─── MOVING OBS HIGHLIGHT ─────────────────────────────────────
function drawMovingObsHighlight() {
  movingObs.forEach(mo => {
    const px=mo.x*CELL, py=mo.y*CELL;
    const pulse = 0.5+0.5*Math.sin(Date.now()/300);
    ctx.strokeStyle=`rgba(255,109,0,${0.4+0.5*pulse})`;
    ctx.lineWidth=2.5; ctx.strokeRect(px+1,py+1,CELL-2,CELL-2);
    ctx.fillStyle=`rgba(255,109,0,${0.7+0.3*pulse})`;
    ctx.font=`${Math.max(8,CELL*0.35)}px Arial`;
    ctx.textAlign='center'; ctx.textBaseline='middle';
    const arr=mo.axis==='h'?(mo.dir>0?'→':'←'):(mo.dir>0?'↓':'↑');
    ctx.fillText(arr, px+CELL/2, py+CELL/2);
  });
}

// ─── VISITED TRAIL ────────────────────────────────────────────
function drawVisitedTrail() {
  if (deliveryDone) return;
  const tc=cv('--trail-color')||'rgba(255,109,0,0.55)';
  visitedSet.forEach(key => {
    const [c,r]=key.split(',').map(Number);
    if (grid[r]?.[c]===1) return;
    ctx.fillStyle=tc; ctx.fillRect(c*CELL+1,r*CELL+1,CELL-2,CELL-2);
  });
}

// ─── COMPLETED PATH ───────────────────────────────────────────
function drawCompletedPath() {
  if (!deliveryDone||completedPath.length<2) return;
  const dc=cv('--done-color')||'rgba(179,136,255,0.72)';
  const lineC=isDark?'rgba(179,136,255,0.92)':'rgba(126,87,194,0.92)';
  const dotC=isDark?'#b388ff':'#7e57c2';
  completedPath.forEach((p,i)=>{
    if(i===completedPath.length-1) return;
    ctx.fillStyle=dc; ctx.fillRect(p.x*CELL+1,p.y*CELL+1,CELL-2,CELL-2);
  });
  ctx.save();
  ctx.shadowColor=isDark?'rgba(179,136,255,0.7)':'rgba(126,87,194,0.5)'; ctx.shadowBlur=12;
  ctx.beginPath(); ctx.moveTo(completedPath[0].x*CELL+CELL/2,completedPath[0].y*CELL+CELL/2);
  for(let i=1;i<completedPath.length;i++) ctx.lineTo(completedPath[i].x*CELL+CELL/2,completedPath[i].y*CELL+CELL/2);
  ctx.strokeStyle=lineC; ctx.lineWidth=3.5; ctx.lineJoin='round'; ctx.lineCap='round'; ctx.stroke(); ctx.restore();
  completedPath.forEach((p,i)=>{
    if(i===0||i===completedPath.length-1) return;
    ctx.beginPath(); ctx.arc(p.x*CELL+CELL/2,p.y*CELL+CELL/2,3,0,Math.PI*2);
    ctx.fillStyle=dotC; ctx.fill();
  });
  if(completedPath.length>4){
    const mid=completedPath[Math.floor(completedPath.length/2)];
    ctx.save(); ctx.font=`bold ${Math.max(7,Math.floor(CELL*0.3))}px Share Tech Mono`;
    ctx.fillStyle=dotC; ctx.textAlign='center'; ctx.textBaseline='bottom';
    ctx.shadowColor=dotC; ctx.shadowBlur=8;
    ctx.fillText('✓ DELIVERED',mid.x*CELL+CELL/2,mid.y*CELL); ctx.restore();
  }
}

// ─── SHORTEST PATH OVERLAY ────────────────────────────────────
function drawShortestPathOverlay() {
  if(mode!=='manual'||shortestPath.length<2||deliveryDone) return;
  const pc=cv('--path-color')||'rgba(0,229,255,0.55)';
  ctx.save(); ctx.shadowColor=isDark?'rgba(0,229,255,0.5)':'rgba(216,27,96,0.4)'; ctx.shadowBlur=6;
  ctx.beginPath(); ctx.moveTo(shortestPath[0].x*CELL+CELL/2,shortestPath[0].y*CELL+CELL/2);
  for(let i=1;i<shortestPath.length;i++) ctx.lineTo(shortestPath[i].x*CELL+CELL/2,shortestPath[i].y*CELL+CELL/2);
  ctx.strokeStyle=pc; ctx.lineWidth=2.5; ctx.setLineDash([6,4]); ctx.stroke(); ctx.setLineDash([]); ctx.restore();
  shortestPath.forEach((p,i)=>{
    if(i===0||i===shortestPath.length-1) return;
    ctx.beginPath(); ctx.arc(p.x*CELL+CELL/2,p.y*CELL+CELL/2,2.5,0,Math.PI*2); ctx.fillStyle=pc; ctx.fill();
  });
  if(shortestPath.length>4){
    const mid=shortestPath[Math.floor(shortestPath.length/2)];
    ctx.save(); ctx.font=`bold ${Math.max(7,CELL*0.28)}px Share Tech Mono`;
    ctx.fillStyle=pc; ctx.textAlign='center'; ctx.textBaseline='bottom';
    ctx.fillText('SHORTEST',mid.x*CELL+CELL/2,mid.y*CELL); ctx.restore();
  }
}

// ─── AUTO BOT PATH ────────────────────────────────────────────
function drawBotPath() {
  if(mode!=='auto'||botPath.length<2) return;
  const pc=cv('--path-color')||'rgba(0,229,255,0.4)';
  ctx.beginPath(); ctx.moveTo(botPath[0].x*CELL+CELL/2,botPath[0].y*CELL+CELL/2);
  for(let i=1;i<botPath.length;i++) ctx.lineTo(botPath[i].x*CELL+CELL/2,botPath[i].y*CELL+CELL/2);
  ctx.strokeStyle=pc; ctx.lineWidth=1.8; ctx.setLineDash([5,5]); ctx.stroke(); ctx.setLineDash([]);
  botPath.forEach((p,i)=>{
    if(i===0||i===botPath.length-1) return;
    ctx.beginPath(); ctx.arc(p.x*CELL+CELL/2,p.y*CELL+CELL/2,2,0,Math.PI*2); ctx.fillStyle=pc; ctx.fill();
  });
}

// ─── SPECIAL CELLS ────────────────────────────────────────────
function drawSpecialCells() {
  subGoals.forEach((sg,i)=>{
    const px=sg.x*CELL, py=sg.y*CELL;
    const pC=sg.priority==='high'?'#ff6d00':'#2979ff';
    ctx.fillStyle=sg.priority==='high'?'rgba(255,109,0,0.18)':'rgba(41,121,255,0.18)';
    ctx.fillRect(px+1,py+1,CELL-2,CELL-2);
    ctx.strokeStyle=pC; ctx.lineWidth=1.5; ctx.strokeRect(px+2,py+2,CELL-4,CELL-4);
    ctx.fillStyle=pC; ctx.font=`bold ${Math.max(7,Math.floor(CELL*0.38))}px Share Tech Mono`;
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText('S'+(i+1),px+CELL/2,py+CELL/2);
  });
  { const px=startPos.x*CELL,py=startPos.y*CELL;
    ctx.fillStyle='rgba(0,230,118,0.18)'; ctx.fillRect(px+1,py+1,CELL-2,CELL-2);
    ctx.strokeStyle='#00e676'; ctx.lineWidth=1.8; ctx.strokeRect(px+2,py+2,CELL-4,CELL-4);
    ctx.fillStyle='#00e676'; ctx.font=`bold ${Math.max(7,Math.floor(CELL*0.36))}px Share Tech Mono`;
    ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText('GO',px+CELL/2,py+CELL/2); }
  { const px=goalPos.x*CELL,py=goalPos.y*CELL;
    const pulse=deliveryDone?0.15:0.22+0.12*Math.sin(Date.now()/500);
    ctx.fillStyle=`rgba(255,179,0,${pulse})`; ctx.fillRect(px+1,py+1,CELL-2,CELL-2);
    ctx.strokeStyle=deliveryDone?(isDark?'#b388ff':'#7e57c2'):'#ffb300';
    ctx.lineWidth=2; ctx.strokeRect(px+2,py+2,CELL-4,CELL-4);
    ctx.font=`${Math.max(9,Math.floor(CELL*0.5))}px Arial`;
    ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText('🍔',px+CELL/2,py+CELL/2+1); }
}

// ─── ROBOT SPRITE ─────────────────────────────────────────────
function drawRobot(cx,cy,dir){
  const px=cx*CELL+CELL/2,py=cy*CELL+CELL/2,r=CELL*0.42,t=Date.now()/350;
  ctx.save(); ctx.translate(px,py); ctx.rotate(dir*Math.PI/180);
  const haloC=deliveryDone?(isDark?'rgba(179,136,255,0.25)':'rgba(126,87,194,0.22)'):(isDark?'rgba(0,229,255,0.18)':'rgba(216,27,96,0.15)');
  const halo=ctx.createRadialGradient(0,0,r*0.2,0,0,r*1.8);
  halo.addColorStop(0,haloC); halo.addColorStop(1,'rgba(0,0,0,0)');
  ctx.beginPath(); ctx.arc(0,0,r*1.8,0,Math.PI*2); ctx.fillStyle=halo; ctx.fill();
  const hw=r*0.72,hh=r*0.58;
  const bodyC=isDark?'#091828':'#fff0f5';
  const rimC=deliveryDone?(isDark?'#b388ff':'#7e57c2'):(isDark?'#00e5ff':'#d81b60');
  ctx.fillStyle='rgba(0,0,0,0.35)'; rrect(ctx,-hw+2,-hh+2,hw*2,hh*2,4); ctx.fill();
  ctx.fillStyle=bodyC; ctx.strokeStyle=rimC; ctx.lineWidth=1.6;
  rrect(ctx,-hw,-hh,hw*2,hh*2,4); ctx.fill(); ctx.stroke();
  ctx.strokeStyle=isDark?'rgba(0,229,255,0.18)':'rgba(216,27,96,0.18)'; ctx.lineWidth=0.7;
  ctx.beginPath(); ctx.moveTo(-hw*0.6,-hh); ctx.lineTo(-hw*0.6,hh); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(hw*0.6,-hh);  ctx.lineTo(hw*0.6,hh);  ctx.stroke();
  ctx.fillStyle=rimC;
  ctx.beginPath(); ctx.moveTo(0,-hh-5); ctx.lineTo(-4,-hh+1); ctx.lineTo(4,-hh+1); ctx.closePath(); ctx.fill();
  const eR=r*0.12;
  [-hw*0.32,hw*0.32].forEach(ex=>{
    ctx.beginPath(); ctx.arc(ex,-hh*0.1,eR+1.5,0,Math.PI*2); ctx.fillStyle='#000'; ctx.fill();
    ctx.beginPath(); ctx.arc(ex,-hh*0.1,eR,0,Math.PI*2); ctx.fillStyle=rimC; ctx.fill();
    ctx.beginPath(); ctx.arc(ex,-hh*0.1,eR*0.45,0,Math.PI*2); ctx.fillStyle='#fff'; ctx.fill();
    ctx.beginPath(); ctx.arc(ex-eR*0.3,-hh*0.1-eR*0.3,eR*0.18,0,Math.PI*2); ctx.fillStyle='rgba(255,255,255,0.85)'; ctx.fill();
  });
  ctx.fillStyle=isDark?'rgba(0,229,255,0.12)':'rgba(216,27,96,0.12)';
  rrect(ctx,-hw*0.55,hh*0.2,hw*1.1,hh*0.28,2); ctx.fill();
  const barC=deliveryDone?rimC:autoRunning?(isDark?'#00e676':'#c62828'):rimC;
  ctx.fillStyle=barC;
  const bw=hw*1.1*(autoRunning?Math.abs(Math.sin(t)):1);
  rrect(ctx,-hw*0.55,hh*0.2,bw,hh*0.28,2); ctx.fill();
  const antC=isDark?'#ffb300':'#e91e63';
  ctx.strokeStyle=antC; ctx.lineWidth=1.2;
  ctx.beginPath(); ctx.moveTo(0,-hh); ctx.lineTo(0,-hh-10); ctx.stroke();
  ctx.beginPath(); ctx.arc(0,-hh-11,2.8,0,Math.PI*2);
  ctx.fillStyle=Math.sin(t*1.4)>0?antC:(isDark?'#ff6d00':'#f06292'); ctx.fill();
  ctx.strokeStyle=isDark?'rgba(255,179,0,0.35)':'rgba(233,30,99,0.35)'; ctx.lineWidth=1;
  ctx.beginPath(); ctx.arc(0,-hh-11,5,0,Math.PI*2); ctx.stroke();

  // Bluetooth indicator on bot
  if (btConnected) {
    ctx.font = `bold ${Math.max(6,CELL*0.22)}px Arial`;
    ctx.fillStyle = '#2196f3'; ctx.textAlign='center'; ctx.textBaseline='top';
    ctx.fillText('🔵', hw*0.6, -hh+1);
  }

  ctx.fillStyle=rimC;
  [[-hw,0],[hw,0]].forEach(([wx])=>{
    ctx.fillRect(wx-2,-hh*0.45,4,hh*0.9);
    ctx.fillStyle='rgba(0,0,0,0.45)';
    for(let tt=-hh*0.4;tt<hh*0.45;tt+=4) ctx.fillRect(wx-2,tt,4,1.5);
    ctx.fillStyle=rimC;
  });
  ctx.restore();
}
function rrect(c,x,y,w,h,rad){
  c.beginPath(); c.moveTo(x+rad,y); c.lineTo(x+w-rad,y); c.arcTo(x+w,y,x+w,y+rad,rad);
  c.lineTo(x+w,y+h-rad); c.arcTo(x+w,y+h,x+w-rad,y+h,rad);
  c.lineTo(x+rad,y+h); c.arcTo(x,y+h,x,y+h-rad,rad);
  c.lineTo(x,y+rad); c.arcTo(x,y,x+rad,y,rad); c.closePath();
}

// ═══════════════════════════════════════════════════════════════
// MOVING OBSTACLES
// ═══════════════════════════════════════════════════════════════
function toggleMovingObs() {
  if (movingObs.length === 0) placeMovingObstacles();
  else clearMovingObstacles();
  const btn = document.getElementById('btnMovingObs');
  if (btn) btn.textContent = movingObs.length > 0 ? '⏹ Stop Moving Obs' : '🔄 Moving Obstacles';
}

function placeMovingObstacles() {
  clearMovingObstacles();
  const count = Math.min(5, Math.floor(GRID / 4));
  let placed=0, attempts=0;
  while (placed < count && attempts < 300) {
    attempts++;
    const axis = Math.random()<0.5?'h':'v';
    const lane = 1+Math.floor(Math.random()*(GRID-2));
    const start= 1+Math.floor(Math.random()*Math.floor((GRID-2)/2));
    const end  = Math.min(start+3+Math.floor(Math.random()*3), GRID-2);
    const x=axis==='h'?start:lane, y=axis==='h'?lane:start;
    if(grid[y][x]===1) continue;
    if(x===botX&&y===botY) continue;
    if(x===startPos.x&&y===startPos.y) continue;
    if(x===goalPos.x&&y===goalPos.y) continue;
    if(subGoals.find(s=>s.x===x&&s.y===y)) continue;
    grid[y][x]=1; statObs++;
    movingObs.push({x,y,axis,dir:1,range:[start,end]});
    placed++;
  }
  if(!placed){sysLog('No space for moving obstacles','err');return;}
  movingObsTimer=setInterval(stepMovingObs,600);
  updateStats();
  sysLog(`${placed} moving obstacles placed`,'sys');
  showToast(`🔄 ${placed} moving obstacles!`);
  if(mode==='auto') botPath=computeFullPath();
  if(mode==='manual') refreshShortestPath();
}

function stepMovingObs() {
  movingObs.forEach(mo=>{
    grid[mo.y][mo.x]=0;
    if(mo.axis==='h'){
      let nx=mo.x+mo.dir;
      if(nx<mo.range[0]||nx>mo.range[1]){mo.dir*=-1;nx=mo.x+mo.dir;}
      if(nx>=1&&nx<GRID-1&&grid[mo.y][nx]===0&&!(nx===botX&&mo.y===botY)&&
         !(nx===startPos.x&&mo.y===startPos.y)&&!(nx===goalPos.x&&mo.y===goalPos.y)&&
         !subGoals.find(s=>s.x===nx&&s.y===mo.y)) mo.x=nx; else mo.dir*=-1;
    } else {
      let ny=mo.y+mo.dir;
      if(ny<mo.range[0]||ny>mo.range[1]){mo.dir*=-1;ny=mo.y+mo.dir;}
      if(ny>=1&&ny<GRID-1&&grid[ny][mo.x]===0&&!(mo.x===botX&&ny===botY)&&
         !(mo.x===startPos.x&&ny===startPos.y)&&!(mo.x===goalPos.x&&ny===goalPos.y)&&
         !subGoals.find(s=>s.x===mo.x&&s.y===ny)) mo.y=ny; else mo.dir*=-1;
    }
    grid[mo.y][mo.x]=1;
  });
  if(autoRunning&&botPath.length>1){
    const next=botPath[1];
    if(grid[next.y][next.x]===1){
      statReplans++; botPath=computeFullPath(); updateStats();
      sysLog('Moving obstacle — D* replan','err');
      if(!botPath.length){autoRunning=false;clearInterval(autoTimer);autoTimer=null;setNavStatus('blocked');
        showErrDialog('ALL PATHS BLOCKED','A moving obstacle sealed every route.',`Replans:${statReplans}`);}
    }
  }
  if(mode==='manual') refreshShortestPath();
}

function clearMovingObstacles() {
  movingObs.forEach(mo=>{grid[mo.y][mo.x]=0;statObs=Math.max(0,statObs-1);});
  movingObs=[]; clearInterval(movingObsTimer); movingObsTimer=null;
  updateStats();
  if(mode==='auto') botPath=computeFullPath();
  if(mode==='manual') refreshShortestPath();
  const btn=document.getElementById('btnMovingObs');
  if(btn) btn.textContent='🔄 Moving Obstacles';
}

// ═══════════════════════════════════════════════════════════════
// D* LITE (A*)
// ═══════════════════════════════════════════════════════════════
const cellKey = n=>`${n.x},${n.y}`;
function heuristic(a,b){return Math.abs(a.x-b.x)+Math.abs(a.y-b.y);}
function neighbors(n){
  return [{x:0,y:-1},{x:0,y:1},{x:-1,y:0},{x:1,y:0}]
    .map(d=>({x:n.x+d.x,y:n.y+d.y}))
    .filter(p=>p.x>=0&&p.y>=0&&p.x<GRID&&p.y<GRID&&grid[p.y][p.x]===0);
}
function aStar(from,to){
  const open=[from],closed=new Set(),g={[cellKey(from)]:0},f={[cellKey(from)]:heuristic(from,to)},came={};
  while(open.length){
    open.sort((a,b)=>(f[cellKey(a)]??Infinity)-(f[cellKey(b)]??Infinity));
    const cur=open.shift(),ck=cellKey(cur);
    if(cur.x===to.x&&cur.y===to.y){const path=[];let n=to;while(n){path.unshift(n);n=came[cellKey(n)];}return path;}
    closed.add(ck);
    for(const nb of neighbors(cur)){
      const nk=cellKey(nb);if(closed.has(nk))continue;
      const tg=(g[ck]??0)+1;
      if(tg<(g[nk]??Infinity)){came[nk]=cur;g[nk]=tg;f[nk]=tg+heuristic(nb,to);if(!open.find(o=>cellKey(o)===nk))open.push(nb);}
    }
  }
  return [];
}
function computeFullPath(){
  const wpts=[{x:botX,y:botY},...subGoals,goalPos];let full=[];
  for(let i=0;i<wpts.length-1;i++){const seg=aStar(wpts[i],wpts[i+1]);if(i>0&&seg.length>0)seg.shift();full=full.concat(seg);}
  return full;
}
function refreshShortestPath(){shortestPath=computeFullPath();updateManualPathPanel();}
function updateManualPathPanel(){
  const opt=shortestPath.length>0?shortestPath.length-1:null;
  const extra=opt!==null?Math.max(0,manualSteps-opt):null;
  const eff=opt!==null&&opt>0?Math.min(100,Math.round((opt/Math.max(manualSteps,opt))*100))+'%':'—';
  document.getElementById('optSteps').textContent=opt!==null?opt:'—';
  document.getElementById('yourSteps').textContent=manualSteps;
  document.getElementById('extraSteps').textContent=extra!==null?extra:'—';
  const e=document.getElementById('efficiency');
  e.textContent=eff; e.className='path-val '+(manualSteps===0?'cyan':extra===0?'green':extra<=2?'gold':'red');
}

// ═══════════════════════════════════════════════════════════════
// SUBGOAL SORT & PRIORITY
// ═══════════════════════════════════════════════════════════════
function sortSubGoalsOptimal(){
  if(subGoals.length<2) return;
  const pool=[...subGoals],sorted=[];let cur={x:botX,y:botY};
  while(pool.length){
    let bestIdx=0,bestD=Infinity;
    pool.forEach((sg,i)=>{const d=heuristic(cur,sg);if(d<bestD){bestD=d;bestIdx=i;}});
    sorted.push(pool.splice(bestIdx,1)[0]); cur=sorted[sorted.length-1];
  }
  subGoals=sorted;
  sysLog(`SubGoals reordered by nearest-neighbour`,'sys');
}

function checkSubGoalDistances(){
  const wpts=[{x:botX,y:botY},...subGoals,goalPos],farOnes=[];
  for(let i=0;i<wpts.length-1;i++){
    const seg=aStar(wpts[i],wpts[i+1]);
    if(seg.length-1>SUBGOAL_FAR_THRESHOLD&&i<subGoals.length)
      farOnes.push({index:i,sg:subGoals[i],dist:seg.length-1});
  }
  return farOnes;
}

function showPriorityDialog(farList,callback){
  pendingFarSubGoals=farList;farDialogIdx=0;
  processPriorityDialogQueue(callback);
}
function processPriorityDialogQueue(callback){
  if(farDialogIdx>=pendingFarSubGoals.length){callback();return;}
  const item=pendingFarSubGoals[farDialogIdx],sg=item.sg;
  document.getElementById('prioTitle').textContent=`SubGoal S${item.index+1} is FAR`;
  document.getElementById('prioBody').textContent=`SubGoal S${item.index+1} at (${sg.x},${sg.y}) is ${item.dist} cells away.`;
  document.getElementById('prioMeta').textContent=`${item.dist} cells (threshold: ${SUBGOAL_FAR_THRESHOLD})`;
  document.getElementById('prioOverlay').classList.add('open');
  window._prioCallback=callback;
}
function prioProceedHigh(){
  const item=pendingFarSubGoals[farDialogIdx];
  subGoals[item.index].priority='high';
  sysLog(`S${item.index+1} → HIGH PRIORITY`,'sys');
  showToast(`★ S${item.index+1} High Priority`);
  farDialogIdx++; document.getElementById('prioOverlay').classList.remove('open');
  processPriorityDialogQueue(window._prioCallback);
}
function prioSkip(){
  const item=pendingFarSubGoals[farDialogIdx];
  subGoals.splice(item.index,1);
  for(let j=farDialogIdx+1;j<pendingFarSubGoals.length;j++) pendingFarSubGoals[j].index=Math.max(0,pendingFarSubGoals[j].index-1);
  sysLog(`S${item.index+1} skipped (too far)`,'err');
  farDialogIdx++; document.getElementById('prioOverlay').classList.remove('open');
  processPriorityDialogQueue(window._prioCallback);
}
function prioKeepNormal(){
  const item=pendingFarSubGoals[farDialogIdx];
  subGoals[item.index].priority='normal';
  farDialogIdx++; document.getElementById('prioOverlay').classList.remove('open');
  processPriorityDialogQueue(window._prioCallback);
}

// ═══════════════════════════════════════════════════════════════
// SUBGOAL BUTTON
// ═══════════════════════════════════════════════════════════════
function setSubGoalButtonEnabled(enabled){
  const btn=document.getElementById('eSub');
  if(!btn) return;
  btn.disabled=!enabled; btn.style.opacity=enabled?'1':'0.35';
}

// ═══════════════════════════════════════════════════════════════
// MODE CONTROL
// ═══════════════════════════════════════════════════════════════
function setMode(m){
  mode=m;
  document.getElementById('btnManual').className=m==='manual'?'mode-btn active-manual':'mode-btn inactive';
  document.getElementById('btnAuto').className  =m==='auto'  ?'mode-btn active-auto'  :'mode-btn inactive';
  document.getElementById('manualControls').style.display=m==='manual'?'':'none';
  document.getElementById('autoControls').style.display  =m==='auto'  ?'':'none';
  if(m==='auto'){
    botPath=computeFullPath();
    if(!botPath.length) showErrDialog('NO SPACE TO TRAVEL','All routes blocked.',`Bot:(${botX},${botY}) Goal:(${goalPos.x},${goalPos.y})`);
    else sysLog(`Auto path: ${botPath.length} steps`,'sys');
  } else { stopBot(); refreshShortestPath(); }
  setNavStatus('idle'); sysLog(`Mode → ${m.toUpperCase()}`,'sys');
}
function setSpeed(v){
  navSpeed=parseInt(v); document.getElementById('speedVal').textContent=v;
  if(autoRunning){clearInterval(autoTimer);autoTimer=setInterval(autoStep,1000/navSpeed);}
}

// ═══════════════════════════════════════════════════════════════
// MANUAL MOVEMENT
// ═══════════════════════════════════════════════════════════════
function manualMove(dir){
  if(deliveryDone) return;
  let nx=botX, ny=botY, angle=botDir;
  switch(dir){
    case'up':    ny--; angle=0;   break;
    case'down':  ny++; angle=180; break;
    case'left':  nx--; angle=270; break;
    case'right': nx++; angle=90;  break;
  }
  if(nx<0||ny<0||nx>=GRID||ny>=GRID||grid[ny][nx]===1){
    sysLog(`Blocked at (${nx},${ny})`,'err'); return;
  }
  // Deviation warning
  if(shortestPath.length>1){
    const nextOpt=shortestPath[1];
    if(nx!==nextOpt.x||ny!==nextOpt.y){
      if(manualSteps-lastDeviationWarnStep>=3){
        lastDeviationWarnStep=manualSteps;
        sysLog(`⚠ Deviation! Optimal: (${nextOpt.x},${nextOpt.y}) → you went (${nx},${ny})`,'err');
      }
    }
  }
  completedPath.push({x:botX,y:botY});
  visitedSet.add(`${botX},${botY}`);
  botX=nx; botY=ny; botDir=angle;
  manualSteps++; statSteps++;
  updateStats(); refreshShortestPath();
  sendGridMove(dir);   // heading-aware: sends F/B/L/R relative to robot facing
  checkArrival();
}
function handleTouch(e,dir){e.preventDefault();manualMove(dir);}
window.addEventListener('keydown',e=>{
  if(mode!=='manual') return;
  const map={ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right',w:'up',s:'down',a:'left',d:'right'};
  if(map[e.key]){e.preventDefault();manualMove(map[e.key]);}
  if(e.key===' '){e.preventDefault();stopBot();}
});

function stopBot(){
  autoRunning=false;clearInterval(autoTimer);autoTimer=null;
  sendBtCmd('STOP');clearTimeout(btStopTimer);
  setNavStatus('idle');sysLog('Bot STOPPED','sys');
  setSubGoalButtonEnabled(true);
}

// ═══════════════════════════════════════════════════════════════
// AUTO NAVIGATION
// ═══════════════════════════════════════════════════════════════
function startAutoNav(){
  if(deliveryDone){showToast('↺ Use Clear All for a new mission');return;}
  setSubGoalButtonEnabled(false);
  const farOnes=checkSubGoalDistances();
  if(farOnes.length>0){
    sysLog(`⚠ ${farOnes.length} subgoal(s) too far — priority check`,'err');
    showPriorityDialog(farOnes,()=>{sortSubGoalsOptimal();_doStartAutoNav();});
  } else {
    sortSubGoalsOptimal();_doStartAutoNav();
  }
}
function _doStartAutoNav(){
  botPath=computeFullPath();
  if(!botPath.length){
    showErrDialog('NO SPACE TO TRAVEL','All routes are blocked.',`Bot:(${botX},${botY}) Obs:${statObs}`);
    sysLog('Path planning FAILED','err');setNavStatus('blocked');setSubGoalButtonEnabled(true);return;
  }
  initialOptLen=botPath.length-1;
  missionStart=Date.now();
  completedPath=[{x:botX,y:botY}];
  autoRunning=true;setNavStatus('running');
  sysLog(`Navigation START — ${botPath.length} steps`,'sys');
  clearInterval(autoTimer);
  autoTimer=setInterval(autoStep,1000/navSpeed);
}
function autoStep(){
  if(!autoRunning||botPath.length<2){
    autoRunning=false;clearInterval(autoTimer);autoTimer=null;
    if(botPath.length<2){setNavStatus('done');sysLog('Destination reached ✓','sys');}
    return;
  }
  const next=botPath[1];
  if(grid[next.y][next.x]===1){
    statReplans++;sysLog('Dynamic obstacle — replanning…','err');
    botPath=computeFullPath();updateStats();
    if(!botPath.length){
      autoRunning=false;clearInterval(autoTimer);autoTimer=null;setNavStatus('blocked');
      sysLog('Replan FAILED','err');
      showErrDialog('ALL PATHS BLOCKED','Obstacle sealed every route.',`Replans:${statReplans}`);
      setSubGoalButtonEnabled(true);
    }
    return;
  }
  const dx=next.x-botX, dy=next.y-botY;
  let angle=botDir, gridDir='up';
  if(dy<0){ angle=0;   gridDir='up';    }
  if(dy>0){ angle=180; gridDir='down';  }
  if(dx<0){ angle=270; gridDir='left';  }
  if(dx>0){ angle=90;  gridDir='right'; }
  visitedSet.add(`${botX},${botY}`);
  completedPath.push({x:next.x,y:next.y});
  botX=next.x;botY=next.y;botDir=angle;
  botPath.shift();statSteps++;updateStats();
  sendGridMove(gridDir);   // heading-aware
  checkArrival();
}

// ═══════════════════════════════════════════════════════════════
// ARRIVAL CHECK
// ═══════════════════════════════════════════════════════════════
function checkArrival(){
  const si=subGoals.findIndex(s=>s.x===botX&&s.y===botY);
  if(si>=0){
    subGoals.splice(si,1);sysLog(`SubGoal #${si+1} reached ✓`,'sys');showToast(`SubGoal #${si+1} reached!`);
    updateStats();
    if(autoRunning) botPath=computeFullPath();
    if(mode==='manual') refreshShortestPath();
  }
  if(botX===goalPos.x&&botY===goalPos.y){
    autoRunning=false;clearInterval(autoTimer);autoTimer=null;deliveryDone=true;
    const last=completedPath[completedPath.length-1];
    if(!last||last.x!==botX||last.y!==botY) completedPath.push({x:botX,y:botY});
    setNavStatus('done');sendBtCmd('STOP');
    sysLog('🍔 DELIVERY COMPLETE — violet path locked','sys');
    setSubGoalButtonEnabled(true);showDeliveryDialog();
  }
}

// ═══════════════════════════════════════════════════════════════
// RANDOM OBSTACLES
// ═══════════════════════════════════════════════════════════════
function placeRandomObstacles(){
  const count=Math.min(RAND_OBS_COUNT, Math.floor(GRID*GRID*0.2));
  let placed=0,attempts=0;
  while(placed<count&&attempts<600){
    attempts++;
    const x=1+Math.floor(Math.random()*(GRID-2)),y=1+Math.floor(Math.random()*(GRID-2));
    if(grid[y][x]===1) continue;
    if(x===botX&&y===botY) continue;
    if(x===startPos.x&&y===startPos.y) continue;
    if(x===goalPos.x&&y===goalPos.y) continue;
    if(subGoals.find(s=>s.x===x&&s.y===y)) continue;
    grid[y][x]=1;placed++;statObs++;
  }
  let tp=computeFullPath(),rm=0;
  while(tp.length===0&&rm<placed){
    const obs=[];
    for(let r=1;r<GRID-1;r++) for(let c=1;c<GRID-1;c++)
      if(grid[r][c]===1&&!(c===botX&&r===botY)&&!(c===startPos.x&&r===startPos.y)&&!(c===goalPos.x&&r===goalPos.y))
        obs.push({x:c,y:r});
    if(!obs.length) break;
    const pick=obs[Math.floor(Math.random()*obs.length)];
    grid[pick.y][pick.x]=0;statObs=Math.max(0,statObs-1);rm++;tp=computeFullPath();
  }
  updateStats();
  if(mode==='auto') botPath=computeFullPath();
  if(mode==='manual') refreshShortestPath();
  sysLog(`Random obstacles: ${placed-rm} placed`,'sys');showToast(`🎲 ${placed-rm} obstacles!`);
}

// ═══════════════════════════════════════════════════════════════
// MAP EDITOR
// ═══════════════════════════════════════════════════════════════
function setEdit(em){
  editMode=em;
  document.getElementById('editMode').textContent=em.toUpperCase();
  ['eStart','eGoal','eSub','eObs'].forEach(id=>{const el=document.getElementById(id);if(el)el.style.opacity='0.5';});
  const map={start:'eStart',goal:'eGoal',sub:'eSub',obstacle:'eObs'};
  if(map[em]){const el=document.getElementById(map[em]);if(el)el.style.opacity='1';}
}
canvas.addEventListener('click',handleCanvasClick);
canvas.addEventListener('mousemove',handleCanvasHover);
function cellFromEvent(e){
  const rect=canvas.getBoundingClientRect();
  return{gx:Math.floor((e.clientX-rect.left)*(canvas.width/rect.width)/CELL),gy:Math.floor((e.clientY-rect.top)*(canvas.height/rect.height)/CELL)};
}
function handleCanvasHover(e){
  const{gx,gy}=cellFromEvent(e);
  document.getElementById('mapCoord').textContent=(gx>=0&&gy>=0&&gx<GRID&&gy<GRID)?`GRID ${GRID}×${GRID} | (${gx},${gy})`:`GRID ${GRID}×${GRID}`;
}
function handleCanvasClick(e){
  if(!editMode) return;
  const{gx,gy}=cellFromEvent(e);
  if(gx<0||gy<0||gx>=GRID||gy>=GRID) return;
  switch(editMode){
    case'start':
      if(grid[gy][gx]===1) return;
      startPos={x:gx,y:gy};botX=gx;botY=gy;rX=gx;rY=gy;
      manualSteps=0;visitedSet=new Set();completedPath=[];deliveryDone=false;
      sysLog(`Start → (${gx},${gy})`,'sys'); break;
    case'goal':
      if(grid[gy][gx]===1) return;
      goalPos={x:gx,y:gy};deliveryDone=false;
      sysLog(`Goal → (${gx},${gy})`,'sys'); break;
    case'sub':
      if(autoRunning){sysLog('SubGoal disabled during simulation','err');showToast('Stop simulation first');return;}
      if(grid[gy][gx]===1) return;
      if(!subGoals.find(s=>s.x===gx&&s.y===gy)){
        subGoals.push({x:gx,y:gy,priority:'normal'});
        sysLog(`SubGoal #${subGoals.length} → (${gx},${gy})`,'sys');updateStats();
      } break;
    case'obstacle':
      if(gx===botX&&gy===botY) return;
      if(gx===startPos.x&&gy===startPos.y) return;
      if(gx===goalPos.x&&gy===goalPos.y) return;
      grid[gy][gx]=1;statObs++;sysLog(`Obstacle → (${gx},${gy})`,'sys');updateStats();
      if(autoRunning){statReplans++;botPath=computeFullPath();sysLog('D* replan','err');updateStats();
        if(!botPath.length){setNavStatus('blocked');showErrDialog('ALL PATHS BLOCKED','Obstacle sealed every route.',`Bot:(${botX},${botY})`);}}
      break;
    case'erase':
      if(gx===0||gy===0||gx===GRID-1||gy===GRID-1) return;
      grid[gy][gx]=0;subGoals=subGoals.filter(s=>!(s.x===gx&&s.y===gy));
      if(statObs>0) statObs--;sysLog(`Erased (${gx},${gy})`,'sys');updateStats();
      if(autoRunning) botPath=computeFullPath(); break;
  }
  if(mode==='auto') botPath=computeFullPath();
  if(mode==='manual') refreshShortestPath();
}

function clearMap(silent=false){
  autoRunning=false; clearInterval(autoTimer); autoTimer=null;
  clearTimeout(btStopTimer);
  movingObs.forEach(mo=>{if(grid[mo.y]&&grid[mo.y][mo.x]!==undefined)grid[mo.y][mo.x]=0;});
  movingObs=[]; clearInterval(movingObsTimer); movingObsTimer=null;
  const moBtn=document.getElementById('btnMovingObs');
  if(moBtn) moBtn.textContent='🔄 Moving Obstacles';

  subGoals=[];visitedSet=new Set();completedPath=[];deliveryDone=false;
  statSteps=0;statObs=0;statReplans=0;manualSteps=0;missionStart=null;initialOptLen=0;
  lastDeviationWarnStep=-5;

  initGrid();
  // Keep startPos/goalPos at sensible defaults for current GRID
  startPos={x:1,y:1};
  goalPos={x:GRID-2,y:GRID-2};
  botX=1;botY=1;botDir=0;botHeading=0;botPath=[];rX=1;rY=1;rDir=0;
  editMode=null;
  document.getElementById('editMode').textContent='NONE';
  ['eStart','eGoal','eSub','eObs'].forEach(id=>{const el=document.getElementById(id);if(el)el.style.opacity='1';});
  setSubGoalButtonEnabled(true);setNavStatus('idle');updateStats();refreshShortestPath();
  if(!silent) sysLog('Map cleared — reset','sys');
}

// ═══════════════════════════════════════════════════════════════
// STATS & STATUS
// ═══════════════════════════════════════════════════════════════
function updateStats(){
  document.getElementById('statSteps').textContent   =statSteps;
  document.getElementById('statObs').textContent     =statObs;
  document.getElementById('statSubGoals').textContent=subGoals.length;
  document.getElementById('statReplans').textContent =statReplans;
}
function setNavStatus(state){
  const el=document.getElementById('navStatus');el.className='map-status-pill';
  const s={idle:{t:'● IDLE',c:''},running:{t:'▶ RUNNING',c:'running'},blocked:{t:'✕ BLOCKED',c:'blocked'},done:{t:'✓ DELIVERED',c:'done'}}[state]||{t:'● IDLE',c:''};
  el.textContent=s.t;if(s.c)el.classList.add(s.c);
}

// ═══════════════════════════════════════════════════════════════
// ERROR WINDOW
// ═══════════════════════════════════════════════════════════════
function showErrDialog(title,body,meta=''){
  document.getElementById('errTitle').textContent=title;
  document.getElementById('errBody').textContent=body;
  document.getElementById('errMeta').textContent=meta||'—';
  document.getElementById('errOverlay').classList.add('open');
  sysLog(`⛔ ${title}`,'err');
}
function closeErrDialog(){document.getElementById('errOverlay').classList.remove('open');}
function errClearObstacles(){
  for(let r=1;r<GRID-1;r++) for(let c=1;c<GRID-1;c++) grid[r][c]=0;
  clearMovingObstacles();statObs=0;updateStats();
  if(mode==='auto') botPath=computeFullPath();
  if(mode==='manual') refreshShortestPath();
  closeErrDialog();setNavStatus('idle');
  sysLog('Obstacles cleared','sys');showToast('✓ Obstacles cleared!');
}
function errRandomFix(){closeErrDialog();clearMap();placeRandomObstacles();showToast('🎲 Auto-fixed!');}

// ═══════════════════════════════════════════════════════════════
// DELIVERY COMPLETE
// ═══════════════════════════════════════════════════════════════
function showDeliveryDialog(){
  const elapsed=missionStart?((Date.now()-missionStart)/1000).toFixed(1)+'s':'—';
  const steps=mode==='manual'?manualSteps:statSteps;
  const wastedSteps=initialOptLen>0?Math.max(0,steps-initialOptLen):0;
  const effPct=initialOptLen>0?Math.min(100,Math.round((initialOptLen/Math.max(steps,initialOptLen))*100)):100;
  const wastedRow=wastedSteps>0
    ?`<div class="ds-row ds-row-warn"><span>⚠ WASTED STEPS</span><span class="ds-val ds-warn">${wastedSteps} extra</span></div>
      <div class="ds-row"><span>EFFICIENCY</span><span class="ds-val" style="color:${effPct>=90?'#00e676':effPct>=70?'#ffb300':'#ff1744'}">${effPct}%</span></div>`
    :`<div class="ds-row"><span>EFFICIENCY</span><span class="ds-val" style="color:#00e676">100% — Perfect!</span></div>`;
  document.getElementById('deliveryStats').innerHTML=
    `<div class="ds-row"><span>STEPS TAKEN</span><span class="ds-val">${statSteps}</span></div>
     <div class="ds-row"><span>OPTIMAL PATH</span><span class="ds-val">${initialOptLen||completedPath.length-1} cells</span></div>
     ${wastedRow}
     <div class="ds-row"><span>REPLANS</span><span class="ds-val">${statReplans}</span></div>
     <div class="ds-row"><span>TIME</span><span class="ds-val">${elapsed}</span></div>`;
  document.getElementById('deliveryOverlay').classList.add('open');
  showToast('🍔 Package Delivered!');
  sysLog(wastedSteps>0?`🍔 DELIVERED — ${wastedSteps} wasted steps`:'🍔 DELIVERED — Perfect path!','sys');
}
function closeDelivery(){
  document.getElementById('deliveryOverlay').classList.remove('open');
  showToast('↺ Click Clear All to start a new mission');
}

// ═══════════════════════════════════════════════════════════════
// LOG
// ═══════════════════════════════════════════════════════════════
function sysLog(msg,type='sys'){
  const box=document.getElementById('logBox'),now=new Date();
  const t=`${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`;
  const line=document.createElement('div');line.className=`log-line ${type}`;
  line.innerHTML=`<span class="log-time">${t}</span>${escHtml(msg)}`;
  box.appendChild(line);box.scrollTop=box.scrollHeight;
  while(box.children.length>300) box.removeChild(box.firstChild);
}
function clearLog(){document.getElementById('logBox').innerHTML='';}
function escHtml(s){return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}

// ═══════════════════════════════════════════════════════════════
// TOAST
// ═══════════════════════════════════════════════════════════════
let _tT=null;
function showToast(msg){
  const el=document.getElementById('toast');el.textContent=msg;el.classList.add('show');
  clearTimeout(_tT);_tT=setTimeout(()=>el.classList.remove('show'),3200);
}

// ═══════════════════════════════════════════════════════════════
// MODAL (Arduino BT code)
// ═══════════════════════════════════════════════════════════════
function openModal(){document.getElementById('modalOverlay').classList.add('open');}
function closeModal(){document.getElementById('modalOverlay').classList.remove('open');}
function closeModalOutside(e){if(e.target===document.getElementById('modalOverlay'))closeModal();}
function switchTab(tab){
  ['bt','wiring','cmds'].forEach(t=>{
    document.getElementById('tab-'+t).className=t===tab?'mtab active':'mtab inactive';
    document.getElementById('content-'+t).className=t===tab?'tab-content active':'tab-content';
  });
}
window.addEventListener('keydown',e=>{
  if(e.key==='Escape'){closeModal();closeErrDialog();closeDelivery();document.getElementById('prioOverlay')?.classList.remove('open');}
});
