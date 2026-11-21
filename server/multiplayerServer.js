/**
 * server/multiplayerServer.js — 청풍사 · 차경루 무의존성(Zero-dependency) 실시간 멀티플레이어 & 정적 웹 서버
 *
 * - 외부 패키지 설치 없이 Node.js 내장 모듈(node:http, node:crypto, node:fs, node:path)만으로 즉시 구동됩니다.
 * - 방당 정원 21명(차경루 7열 × 3줄 방석 수) 자동 샤딩: 21명 초과 시 제2산방, 제3산방 자동 생성·배정
 * - 서버 권위(Authoritative) 좌석 배정:
 *   1) 자동 배정(auto): 현재 캐릭터 위치(x, z)에서 가장 가까운 빈 방석부터 순차 배정
 *   2) 수동 선택(manual): 본인이 3D 방석을 클릭해 선택한 특정 방석(0~20) 중복 점유 검증 및 즉시 배정
 * - 소원 연등 & 합장 전 산방(전체 채널) 실시간 공유 및 영속화
 */

import http from 'node:http';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  ANYANGRU_CONFIG,
  ANYANGRU_CUSHIONS,
  MAX_VISITORS_PER_ROOM
} from '../src/config/worldConfig.js';
import { INITIAL_WISHES, WANDERER_POETIC_NAMES } from '../src/config/constants.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const DATA_DIR = path.join(__dirname, 'data');
const WISHES_FILE = path.join(DATA_DIR, 'wishes.json');

const PORT = Number(process.env.PORT) || 8080;
const WS_GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.glb': 'model/gltf-binary',
  '.gltf': 'model/gltf+json',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.txt': 'text/plain; charset=utf-8'
};

/* =========================================================================
   1. 전체 산방 공유 소원 연등 저장소 (디스크 영속화)
   ========================================================================= */
function loadPersistedWishes() {
  try {
    if (fs.existsSync(WISHES_FILE)) {
      const raw = fs.readFileSync(WISHES_FILE, 'utf8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('[SansaServer] 소원 데이터 로드 폴백:', err.message);
  }
  return INITIAL_WISHES.map((w) => ({ ...w }));
}

let sharedWishes = loadPersistedWishes();

function savePersistedWishes() {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(WISHES_FILE, JSON.stringify(sharedWishes, null, 2), 'utf8');
  } catch (err) {
    console.warn('[SansaServer] 소원 데이터 저장 실패:', err.message);
  }
}

/* =========================================================================
   2. 산방(Room · 정원 21명) 및 좌석(0~20) 상태 관리
   ========================================================================= */
// roomId (number) -> Map<clientId, ClientSession>
const rooms = new Map();
const allClients = new Set();

function getOrCreateRoom(roomId) {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, new Map());
  }
  return rooms.get(roomId);
}

function getRoomsSummary() {
  const list = [];
  const sortedIds = [...rooms.keys()].sort((a, b) => a - b);
  for (const rId of sortedIds) {
    const members = rooms.get(rId);
    if (members && members.size > 0) {
      list.push({
        roomId: rId,
        count: members.size,
        maxCapacity: MAX_VISITORS_PER_ROOM
      });
    }
  }
  if (list.length === 0) {
    list.push({ roomId: 1, count: 0, maxCapacity: MAX_VISITORS_PER_ROOM });
  }
  return list;
}

function pickAvailableRoomId(preferredRoom = null) {
  if (
    Number.isInteger(preferredRoom) &&
    preferredRoom >= 1 &&
    preferredRoom <= 999
  ) {
    const target = getOrCreateRoom(preferredRoom);
    if (target.size < MAX_VISITORS_PER_ROOM) {
      return preferredRoom;
    }
  }

  let rId = 1;
  while (rId < 999) {
    const room = getOrCreateRoom(rId);
    if (room.size < MAX_VISITORS_PER_ROOM) {
      return rId;
    }
    rId++;
  }
  return 1;
}

function ensureUniqueRoomNickname(roomMap, desiredName, selfId) {
  const taken = new Set();
  for (const [cid, session] of roomMap.entries()) {
    if (cid !== selfId && session.player?.name) {
      taken.add(session.player.name);
    }
  }
  if (desiredName && !taken.has(desiredName)) {
    return desiredName;
  }
  const available = WANDERER_POETIC_NAMES.find((n) => !taken.has(n));
  if (available) return available;
  return `${desiredName || '산사 나그네'} · ${roomMap.size + 1}`;
}

function getRoomOccupiedSeats(roomMap, excludeClientId = null) {
  const occupied = new Map();
  for (const [cid, session] of roomMap.entries()) {
    if (cid === excludeClientId) continue;
    const sIdx = session.player?.seatIndex;
    if (Number.isInteger(sIdx) && sIdx >= 0 && sIdx < ANYANGRU_CUSHIONS.length) {
      occupied.set(sIdx, session.player);
    }
  }
  return occupied;
}

const FRONT_CENTER_PRIORITY_CUSHIONS = [...ANYANGRU_CUSHIONS].sort((a, b) => {
  if (a.row !== b.row) return a.row - b.row;
  const distCenterA = Math.abs(a.col - 4);
  const distCenterB = Math.abs(b.col - 4);
  if (distCenterA !== distCenterB) return distCenterA - distCenterB;
  return a.col - b.col;
});

function assignNearestSeatInRoom(roomMap, clientId, _x = 0, _z = 0) {
  const occupied = getRoomOccupiedSeats(roomMap, clientId);

  // 차경루 가운데 앞자리(1줄 중앙 -> 좌우 -> 2줄 -> 3줄)부터 순차 배정
  for (const c of FRONT_CENTER_PRIORITY_CUSHIONS) {
    if (!occupied.has(c.index)) {
      return c.index;
    }
  }

  return null;
}

/* =========================================================================
   3. RFC 6455 WebSocket 인코더 & 디코더
   ========================================================================= */
function encodeWsFrame(opcode, payloadBuffer) {
  const len = payloadBuffer.length;
  let header;

  if (len < 126) {
    header = Buffer.alloc(2);
    header[0] = 0x80 | opcode;
    header[1] = len;
  } else if (len < 65536) {
    header = Buffer.alloc(4);
    header[0] = 0x80 | opcode;
    header[1] = 126;
    header.writeUInt16BE(len, 2);
  } else {
    header = Buffer.alloc(10);
    header[0] = 0x80 | opcode;
    header[1] = 127;
    header.writeBigUInt64BE(BigInt(len), 2);
  }

  return Buffer.concat([header, payloadBuffer]);
}

function sendJson(session, obj) {
  if (!session || session.closed || session.socket.destroyed) return;
  try {
    const data = Buffer.from(JSON.stringify(obj), 'utf8');
    session.socket.write(encodeWsFrame(0x01, data));
  } catch {
    // ignore socket write error
  }
}

function broadcastToRoom(roomId, obj, excludeClientId = null) {
  const room = rooms.get(roomId);
  if (!room) return;
  const frame = encodeWsFrame(0x01, Buffer.from(JSON.stringify(obj), 'utf8'));
  for (const [cid, session] of room.entries()) {
    if (cid === excludeClientId || session.closed || session.socket.destroyed) continue;
    try {
      session.socket.write(frame);
    } catch {
      // ignore
    }
  }
}

function broadcastToAll(obj, excludeClientId = null) {
  const frame = encodeWsFrame(0x01, Buffer.from(JSON.stringify(obj), 'utf8'));
  for (const session of allClients) {
    if (session.id === excludeClientId || session.closed || session.socket.destroyed) continue;
    try {
      session.socket.write(frame);
    } catch {
      // ignore
    }
  }
}

function broadcastRoomsSummary() {
  broadcastToAll({
    type: 'rooms_summary',
    rooms: getRoomsSummary()
  });
}

/* =========================================================================
   4. 클라이언트 메시지 핸들러
   ========================================================================= */
function removeSessionFromCurrentRoom(session) {
  if (!session.roomId) return;
  const oldRoomId = session.roomId;
  const room = rooms.get(oldRoomId);
  if (room) {
    room.delete(session.id);
    if (room.size === 0) {
      rooms.delete(oldRoomId);
    } else {
      broadcastToRoom(oldRoomId, {
        type: 'peer_left',
        peerId: session.id
      });
    }
  }
  session.roomId = null;
}

function handleClientMessage(session, msg) {
  if (!msg || typeof msg !== 'object') return;
  session.lastSeenAt = Date.now();

  switch (msg.type) {
    case 'ping': {
      sendJson(session, { type: 'pong', t: Date.now() });
      break;
    }

    case 'join': {
      const incoming = msg.player || {};
      session.id = String(incoming.id || session.id);

      const preferred = Number.isInteger(msg.preferredRoom) ? msg.preferredRoom : null;
      const assignedRoomId = pickAvailableRoomId(preferred);
      const room = getOrCreateRoom(assignedRoomId);

      const uniqueName = ensureUniqueRoomNickname(
        room,
        String(incoming.name || '산사 나그네').slice(0, 18),
        session.id
      );

      session.roomId = assignedRoomId;
      session.player = {
        id: session.id,
        name: uniqueName,
        paletteIdx: Math.abs(Number(incoming.paletteIdx) || 0) % 4,
        x: Number.isFinite(incoming.x) ? Number(incoming.x) : 0,
        z: Number.isFinite(incoming.z) ? Number(incoming.z) : 1.5,
        yaw: Number.isFinite(incoming.yaw) ? Number(incoming.yaw) : 0,
        posture: incoming.posture === 'kneel' ? 'kneel' : 'walk',
        seatIndex: null
      };

      room.set(session.id, session);

      const peersInRoom = [];
      for (const [cid, other] of room.entries()) {
        if (cid !== session.id && other.player) {
          peersInRoom.push(other.player);
        }
      }

      sendJson(session, {
        type: 'welcome',
        roomId: assignedRoomId,
        assignedName: uniqueName,
        seatIndex: null,
        peers: peersInRoom,
        rooms: getRoomsSummary(),
        wishes: sharedWishes
      });

      broadcastToRoom(
        assignedRoomId,
        {
          type: 'peer_joined',
          player: session.player
        },
        session.id
      );

      broadcastRoomsSummary();
      break;
    }

    case 'switch_room': {
      if (!session.player) return;
      const requestedRoom = Math.max(1, Math.min(999, Number(msg.targetRoom) || 1));
      removeSessionFromCurrentRoom(session);

      const finalRoomId = pickAvailableRoomId(requestedRoom);
      const newRoom = getOrCreateRoom(finalRoomId);

      session.roomId = finalRoomId;
      session.player.seatIndex = null;
      session.player.posture = 'walk';
      session.player.name = ensureUniqueRoomNickname(
        newRoom,
        session.player.name,
        session.id
      );
      newRoom.set(session.id, session);

      const peersInRoom = [];
      for (const [cid, other] of newRoom.entries()) {
        if (cid !== session.id && other.player) {
          peersInRoom.push(other.player);
        }
      }

      sendJson(session, {
        type: 'room_roster',
        roomId: finalRoomId,
        assignedName: session.player.name,
        peers: peersInRoom,
        rooms: getRoomsSummary()
      });

      broadcastToRoom(
        finalRoomId,
        {
          type: 'peer_joined',
          player: session.player
        },
        session.id
      );

      broadcastRoomsSummary();
      break;
    }

    case 'state': {
      if (!session.roomId || !session.player || !msg.player) return;
      const p = msg.player;
      if (Number.isFinite(p.x)) session.player.x = Math.max(-25, Math.min(25, Number(p.x)));
      if (Number.isFinite(p.z)) session.player.z = Math.max(-25, Math.min(25, Number(p.z)));
      if (Number.isFinite(p.yaw)) session.player.yaw = Number(p.yaw);
      if (p.posture === 'walk' || p.posture === 'kneel') {
        session.player.posture = p.posture;
      }
      if (Number.isFinite(p.paletteIdx)) {
        session.player.paletteIdx = Math.abs(Math.floor(p.paletteIdx)) % 4;
      }
      if (p.seatIndex === null) {
        session.player.seatIndex = null;
      }

      broadcastToRoom(
        session.roomId,
        {
          type: 'peer_state',
          player: session.player
        },
        session.id
      );
      break;
    }

    case 'claim_seat': {
      if (!session.roomId || !session.player) return;
      const room = rooms.get(session.roomId);
      if (!room) return;

      const reqId = msg.reqId || '';
      const mode = msg.mode === 'manual' ? 'manual' : 'auto';

      if (mode === 'manual') {
        const idx = Number(msg.seatIndex);
        if (!Number.isInteger(idx) || idx < 0 || idx >= ANYANGRU_CUSHIONS.length) {
          sendJson(session, { type: 'seat_result', reqId, ok: false, reason: 'invalid_seat' });
          return;
        }
        const occupied = getRoomOccupiedSeats(room, session.id);
        if (occupied.has(idx)) {
          const holder = occupied.get(idx);
          sendJson(session, {
            type: 'seat_result',
            reqId,
            ok: false,
            reason: 'occupied',
            seatIndex: idx,
            occupantName: holder?.name || '다른 나그네'
          });
          return;
        }

        session.player.seatIndex = idx;
        sendJson(session, { type: 'seat_result', reqId, ok: true, seatIndex: idx });
        broadcastToRoom(
          session.roomId,
          { type: 'peer_state', player: session.player },
          session.id
        );
        return;
      }

      // Auto 배정: 현재 캐릭터 위치(x, z)에서 가장 가까운 빈자리 방석 배정
      const assignedIdx = assignNearestSeatInRoom(
        room,
        session.id,
        Number(msg.x) || 0,
        Number(msg.z) || 0
      );
      if (assignedIdx === null) {
        sendJson(session, { type: 'seat_result', reqId, ok: false, reason: 'full' });
        return;
      }

      session.player.seatIndex = assignedIdx;
      sendJson(session, { type: 'seat_result', reqId, ok: true, seatIndex: assignedIdx });
      broadcastToRoom(
        session.roomId,
        { type: 'peer_state', player: session.player },
        session.id
      );
      break;
    }

    case 'release_seat': {
      if (!session.roomId || !session.player) return;
      if (session.player.seatIndex !== null) {
        session.player.seatIndex = null;
        broadcastToRoom(
          session.roomId,
          { type: 'peer_state', player: session.player },
          session.id
        );
      }
      break;
    }

    case 'action': {
      if (!session.roomId || !session.player) return;
      const allowedActions = new Set(['greet', 'bell', 'palette']);
      if (!allowedActions.has(msg.actionType)) return;
      broadcastToRoom(
        session.roomId,
        {
          type: 'peer_action',
          peerId: session.id,
          actionType: msg.actionType,
          payload: msg.payload || {}
        },
        session.id
      );
      break;
    }

    case 'wish_add': {
      const w = msg.wish;
      if (!w || typeof w.text !== 'string' || !w.text.trim()) return;
      if (sharedWishes.some((item) => item.id === w.id)) return;

      const sanitized = {
        id: String(w.id || `wish-${Date.now()}`).slice(0, 48),
        space: 'cheongpungsa',
        color: ['amber', 'lotus', 'jade', 'moon'].includes(w.color) ? w.color : 'amber',
        author: String(w.author || '산사 나그네').slice(0, 18),
        tag: String(w.tag || '마음 평안').slice(0, 18),
        text: String(w.text).trim().slice(0, 95),
        date: String(w.date || ''),
        hapjang: Math.max(1, Number(w.hapjang) || 1)
      };

      sharedWishes.push(sanitized);
      if (sharedWishes.length > 120) {
        sharedWishes = [
          ...sharedWishes.slice(0, 16),
          ...sharedWishes.slice(sharedWishes.length - 104)
        ];
      }
      savePersistedWishes();

      broadcastToAll({ type: 'wish_added', wish: sanitized }, session.id);
      break;
    }

    case 'wish_hapjang': {
      const target = sharedWishes.find((item) => item.id === msg.wishId);
      if (!target) return;
      target.hapjang = (Number(target.hapjang) || 0) + 1;
      savePersistedWishes();

      broadcastToAll(
        {
          type: 'wish_hapjang',
          wishId: target.id,
          hapjang: target.hapjang
        },
        session.id
      );
      break;
    }

    default:
      break;
  }
}

/* =========================================================================
   5. HTTP 정적 서빙 + /api/rooms 상태 조회 + /ws 업그레이드 서버
   ========================================================================= */
const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const rawUrl = req.url || '/';
  const pathname = decodeURIComponent(rawUrl.split('?')[0]);

  if (pathname === '/api/rooms') {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(
      JSON.stringify({
        maxCapacityPerRoom: MAX_VISITORS_PER_ROOM,
        totalCushions: ANYANGRU_CUSHIONS.length,
        totalOnlineVisitors: allClients.size,
        rooms: getRoomsSummary()
      })
    );
    return;
  }

  const relPath = pathname === '/' ? '/index.html' : pathname;
  const resolved = path.resolve(ROOT_DIR, `.${relPath}`);

  if (!resolved.startsWith(ROOT_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  let filePath = resolved;
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  }

  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not Found');
    return;
  }

  const stat = fs.statSync(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  const isHeavyStaticAsset =
    ['.glb', '.gltf', '.jpg', '.jpeg', '.png', '.webp', '.svg', '.ico', '.mp3', '.ogg', '.wav'].includes(
      ext
    ) || pathname.startsWith('/node_modules/three/');

  const etag = `W/"${stat.size}-${Math.floor(stat.mtimeMs)}"`;
  res.setHeader('ETag', etag);
  res.setHeader(
    'Cache-Control',
    isHeavyStaticAsset ? 'public, max-age=0, must-revalidate' : 'no-cache'
  );

  if (req.headers['if-none-match'] === etag && !req.headers.range) {
    res.writeHead(304);
    res.end();
    return;
  }

  const range = req.headers.range;
  if (range) {
    const match = /bytes=(\d*)-(\d*)/.exec(range);
    if (match) {
      const start = match[1] ? parseInt(match[1], 10) : 0;
      const end = match[2] ? parseInt(match[2], 10) : stat.size - 1;
      if (start >= 0 && start <= end && end < stat.size) {
        res.writeHead(206, {
          'Content-Range': `bytes ${start}-${end}/${stat.size}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': end - start + 1,
          'Content-Type': contentType
        });
        fs.createReadStream(filePath, { start, end }).pipe(res);
        return;
      }
    }
  }

  res.writeHead(200, {
    'Content-Type': contentType,
    'Content-Length': stat.size,
    'Accept-Ranges': 'bytes'
  });
  fs.createReadStream(filePath).pipe(res);
});

server.on('upgrade', (req, socket) => {
  const pathname = (req.url || '').split('?')[0];
  if (pathname !== '/ws') {
    socket.destroy();
    return;
  }

  const secKey = req.headers['sec-websocket-key'];
  if (!secKey) {
    socket.destroy();
    return;
  }

  const acceptKey = crypto
    .createHash('sha1')
    .update(secKey + WS_GUID)
    .digest('base64');

  socket.write(
    [
      'HTTP/1.1 101 Switching Protocols',
      'Upgrade: websocket',
      'Connection: Upgrade',
      `Sec-WebSocket-Accept: ${acceptKey}`,
      '',
      ''
    ].join('\r\n')
  );

  socket.setNoDelay(true);

  const session = {
    id: `conn-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    socket,
    roomId: null,
    player: null,
    closed: false,
    lastSeenAt: Date.now()
  };

  allClients.add(session);

  let buffer = Buffer.alloc(0);

  const cleanup = () => {
    if (session.closed) return;
    session.closed = true;
    allClients.delete(session);
    const hadRoom = Boolean(session.roomId);
    removeSessionFromCurrentRoom(session);
    if (hadRoom) {
      broadcastRoomsSummary();
    }
    try {
      socket.destroy();
    } catch {
      // ignore
    }
  };

  socket.on('data', (chunk) => {
    buffer = Buffer.concat([buffer, chunk]);

    while (buffer.length >= 2) {
      const firstByte = buffer[0];
      const secondByte = buffer[1];
      const opcode = firstByte & 0x0f;
      const isMasked = (secondByte & 0x80) !== 0;
      let payloadLen = secondByte & 0x7f;
      let offset = 2;

      if (payloadLen === 126) {
        if (buffer.length < 4) return;
        payloadLen = buffer.readUInt16BE(2);
        offset = 4;
      } else if (payloadLen === 127) {
        if (buffer.length < 10) return;
        payloadLen = Number(buffer.readBigUInt64BE(2));
        offset = 10;
      }

      if (payloadLen > 1024 * 256) {
        cleanup();
        return;
      }

      const maskLen = isMasked ? 4 : 0;
      if (buffer.length < offset + maskLen + payloadLen) {
        return;
      }

      let payload = buffer.subarray(offset + maskLen, offset + maskLen + payloadLen);
      if (isMasked) {
        const maskKey = buffer.subarray(offset, offset + 4);
        const unmasked = Buffer.allocUnsafe(payloadLen);
        for (let i = 0; i < payloadLen; i++) {
          unmasked[i] = payload[i] ^ maskKey[i & 3];
        }
        payload = unmasked;
      }

      buffer = buffer.subarray(offset + maskLen + payloadLen);

      if (opcode === 0x08) {
        cleanup();
        return;
      }
      if (opcode === 0x09) {
        try {
          socket.write(encodeWsFrame(0x0a, payload));
        } catch {
          // ignore
        }
        continue;
      }
      if (opcode === 0x01) {
        try {
          const parsed = JSON.parse(payload.toString('utf8'));
          handleClientMessage(session, parsed);
        } catch {
          // ignore malformed JSON
        }
      }
    }
  });

  socket.on('close', cleanup);
  socket.on('end', cleanup);
  socket.on('error', cleanup);
});

const sweepTimer = setInterval(() => {
  const now = Date.now();
  for (const session of allClients) {
    if (now - session.lastSeenAt > 25000) {
      session.socket.destroy();
    }
  }
}, 8000);
sweepTimer.unref?.();

export { server };

const isDirectRun =
  process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename);

if (isDirectRun) {
  server.listen(PORT, () => {
    console.log(
      `\n🏮 [산사 View-mung 멀티플레이 서버] http://localhost:${PORT} 실행 완료` +
        `\n   - 차경루 방석: 총 ${ANYANGRU_CUSHIONS.length}석 (1줄 전망 7석 · 2줄 중간 7석 · 3줄 뒷줄 7석)` +
        `\n   - 산방 정원제: 방당 최대 ${MAX_VISITORS_PER_ROOM}명 (정원 도달 시 다음 산방 자동 증설)\n`
    );
  });
}
