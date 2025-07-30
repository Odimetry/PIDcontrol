// public/app.js
const socket = io();

const portSelect = document.getElementById('comPorts');
const connectBtn = document.getElementById('connectBtn');
const disconnectBtn = document.getElementById('disconnectBtn');
const sendBtn = document.getElementById('sendBtn');
const targetInput = document.getElementById('targetInput');
const logBox = document.getElementById('logBox');
const currentPosition = document.getElementById('currentPosition');
const motorStatus = document.getElementById('motorStatus');
const pGain = document.getElementById('pGain');
const iGain = document.getElementById('iGain');
const dGain = document.getElementById('dGain');
const sendPID = document.getElementById('sendPID');

// 요청: 포트 목록 불러오기
socket.emit('list-ports');

socket.on('ports', (ports) => {
  console.log('🔍 받은 포트 목록:', ports); // 👈 추가
  portSelect.innerHTML = ''; // Clear existing
  ports.forEach((port) => {
    const opt = document.createElement('option');
    opt.value = port;
    opt.textContent = port;
    portSelect.appendChild(opt);
  });
});

connectBtn.onclick = () => {
  const port = portSelect.value;
  if (!port || port === '') {
    alert("⚠️ COM 포트를 먼저 선택하세요.");
    return;
  }
  socket.emit('connect-port', port);
};

disconnectBtn.onclick = () => {
  socket.emit('disconnect-port');
};

sendBtn.onclick = () => {
  const pos = parseInt(targetInput.value);
  socket.emit('send-position', pos);
  log(`Sent position: ${pos}`);
};

sendPID.onclick = () => {
  const p = parseFloat(pGain.value);
  const i = parseFloat(iGain.value);
  const d = parseFloat(dGain.value);
  socket.emit('send-pid', { p, i, d });
  log(`Sent PID: P=${p}, I=${i}, D=${d}`);
};

socket.on('connected', (port) => {
  log(`Connected to ${port}`);
  motorStatus.textContent = 'Connected';
});

socket.on('disconnected', () => {
  log('Disconnected');
  motorStatus.textContent = 'Disconnected';
});

socket.on('serial-data', (data) => {
  log(`Received: ${data}`);
  if (data.startsWith('CUR:')) {
    const pos = data.split(':')[1];
    currentPosition.textContent = pos;
  }
});

function log(msg) {
  logBox.value += msg + '\n';
  logBox.scrollTop = logBox.scrollHeight;
}

// 기본 회전 위젯 (간단한 placeholder)
const canvas = document.getElementById('rotationWidget');
const ctx = canvas.getContext('2d');
canvas.addEventListener('mousedown', dragStart);
canvas.addEventListener('mouseup', dragStop);
canvas.addEventListener('mousemove', dragRotate);

let dragging = false;
let angle = 0;

function dragStart(e) { dragging = true; }
function dragStop(e) { dragging = false; }
function dragRotate(e) {
  if (!dragging) return;
  const rect = canvas.getBoundingClientRect();
  const cx = rect.width / 2;
  const cy = rect.height / 2;
  const dx = e.clientX - rect.left - cx;
  const dy = e.clientY - rect.top - cy;
  angle = Math.atan2(dy, dx);
  const pos = Math.round((angle + Math.PI) / (2 * Math.PI) * 4095); // 0~4095 범위
  socket.emit('send-position', pos);
  drawWidget(angle);
}

function drawWidget(a) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.beginPath();
  ctx.arc(100, 100, 80, 0, 2 * Math.PI);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(100, 100);
  ctx.lineTo(100 + 80 * Math.cos(a), 100 + 80 * Math.sin(a));
  ctx.stroke();
}
