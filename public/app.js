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
    const pos = parseInt(data.split(':')[1]);
    currentPosition.textContent = pos;
    updateChart(pos); // ✅ 숫자 전달
    currentPosition.textContent = pos;
    updateChart(pos); // ✅ 그래프에 반영
  }
});

function log(msg) {
  logBox.value += msg + '\n';
  logBox.scrollTop = logBox.scrollHeight;
}


// 회전 위젯 요소 참조
const canvas = document.getElementById('rotationWidget');
const ctx = canvas.getContext('2d');

// 중심 좌표
const centerX = canvas.width / 2;
const centerY = canvas.height / 2;
const radius = 100;

let isDragging = false;
let lastAngle = 0;

// 그리기 함수
function drawDial(angleRad) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 외곽 원
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
  ctx.stroke();

  // 포인터
  const x = centerX + radius * Math.cos(angleRad);
  const y = centerY + radius * Math.sin(angleRad);
  ctx.beginPath();
  ctx.moveTo(centerX, centerY);
  ctx.lineTo(x, y);
  ctx.stroke();
}

// 각도 계산 함수
function getAngleFromMouse(x, y) {
  const dx = x - centerX;
  const dy = y - centerY;
  return Math.atan2(dy, dx);
}

// 드래그 핸들링
canvas.addEventListener('mousedown', (e) => {
  isDragging = true;
});

canvas.addEventListener('mouseup', (e) => {
  isDragging = false;
});

canvas.addEventListener('mousemove', (e) => {
  if (!isDragging) return;

  const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;

  const angle = getAngleFromMouse(mouseX, mouseY); // -PI ~ PI
  lastAngle = angle;
  drawDial(angle);

  // 각도 → 위치값 (0~4095) 매핑
  const norm = (angle + Math.PI) / (2 * Math.PI); // 0 ~ 1
  const position = Math.round(norm * 4095);

  // 전송
  socket.emit('send-position', position);
  log(`🔄 Target position: ${position}`);
});

// 초기 그리기
drawDial(0);

const ctx2 = document.getElementById('positionChart').getContext('2d');

const positionChart = new Chart(ctx2, {
  type: 'line',
  data: {
    labels: [], // 시간 축
    datasets: [{
      label: 'Motor Position',
      data: [],
      borderColor: 'blue',
      borderWidth: 2,
      pointRadius: 0,
      tension: 0.2,
    }]
  },
  options: {
    scales: {
      x: {
        title: { display: true, text: 'Time (s)' },
        ticks: { maxTicksLimit: 10 }
      },
      y: {
        title: { display: true, text: 'Position' },
        suggestedMin: 0,
        suggestedMax: 4095
      }
    },
    animation: false,
    responsive: true,
    plugins: {
      legend: { display: true }
    }
  }
});

// === 시간 기준 업데이트 ===
let startTime = Date.now();

function updateChart(position) {
  const now = (Date.now() - startTime) / 1000; // 초 단위 시간
  const data = positionChart.data;

  data.labels.push(now.toFixed(1));
  data.datasets[0].data.push(position);

  // 최대 포인트 수 제한 (예: 50개)
  if (data.labels.length > 50) {
    data.labels.shift();
    data.datasets[0].data.shift();
  }

  positionChart.update();
}
