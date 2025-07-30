// ============================
// 1. server/serialServer.js
// ============================

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

let serialPort;
let parser;

app.use(express.static(path.join(__dirname, '../public')));

// 소켓 통신 처리
io.on('connection', (socket) => {
  console.log('🟢 Web client connected');

  socket.on('list-ports', async () => {
    try {
      const ports = await SerialPort.list();
      socket.emit('ports', ports.map(p => p.path));
    } catch (err) {
      console.error('❌ Failed to list ports:', err);
      socket.emit('ports', []);
    }
  });

  socket.on('connect-port', (portPath) => {
    if (!portPath || typeof portPath !== 'string') {
      console.error('❌ Invalid portPath:', portPath);
      socket.emit('error-message', 'COM 포트를 선택하지 않았거나 잘못됨');
      return;
    }

    try {
      serialPort = new SerialPort({
        path: portPath,
        baudRate: 57600,
      });

      parser = serialPort.pipe(new ReadlineParser({ delimiter: '\n' }));

      parser.on('data', (data) => {
        io.emit('serial-data', data.trim());
      });

      serialPort.on('open', () => {
        console.log(`🔌 Connected to ${portPath}`);
        socket.emit('connected', portPath);
      });

      serialPort.on('error', (err) => {
        console.error('❌ Serial port error:', err.message);
        socket.emit('error-message', '시리얼 포트 오류 발생');
      });
    } catch (err) {
      console.error('❌ Failed to open serial port:', err);
      socket.emit('error-message', '시리얼 포트 열기 실패');
    }
  });

  socket.on('disconnect-port', () => {
    if (serialPort && serialPort.isOpen) {
      serialPort.close(() => {
        socket.emit('disconnected');
        console.log('🔌 Serial port disconnected');
      });
    }
  });

  socket.on('send-position', (pos) => {
    if (serialPort && serialPort.isOpen) {
      serialPort.write(`POS:${pos}\n`);
    }
  });

  socket.on('send-pid', ({ p, i, d }) => {
    if (serialPort && serialPort.isOpen) {
      serialPort.write(`PID:${p},${i},${d}\n`);
    }
  });
});

server.listen(3000, () => {
  console.log('🌐 Server running at http://localhost:3000');
});
