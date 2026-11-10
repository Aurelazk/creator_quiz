"use strict";

const http = require("http");
const fs = require("fs");
const path = require("path");
const { Server } = require("socket.io");

const PORT = Number(process.env.PORT) || 3000;
const ROOT = __dirname;
const LEADERBOARD_FILE = path.join(ROOT, "leaderboard.json");
const MAX_LEADERBOARD = 200;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".txt": "text/plain; charset=utf-8"
};

function loadLeaderboard() {
  try {
    const raw = fs.readFileSync(LEADERBOARD_FILE, "utf8");
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data.filter(isValidEntry) : [];
  } catch (error) {
    return [];
  }
}

function isValidEntry(entry) {
  return entry && typeof entry.id === "string" && Number.isFinite(Number(entry.score));
}

let leaderboard = loadLeaderboard();
let persistTimer = null;

function persistLeaderboard() {
  clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    const data = JSON.stringify(leaderboard.slice(0, MAX_LEADERBOARD), null, 2);
    fs.writeFile(LEADERBOARD_FILE, data, "utf8", () => {});
  }, 250);
}

function topLeaderboard() {
  return leaderboard
    .slice()
    .sort((a, b) => Number(b.score) - Number(a.score))
    .slice(0, 10)
    .map((entry) => ({
      id: entry.id,
      name: entry.name,
      h: entry.h,
      a: entry.a,
      score: Number(entry.score) || 0
    }));
}

function broadcastLeaderboard() {
  io.emit("leaderboard", topLeaderboard());
}

const server = http.createServer((req, res) => {
  const urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
  const requested = urlPath === "/" ? "/guess-answer.html" : urlPath;
  const filePath = path.resolve(ROOT, "." + requested);

  if (!filePath.startsWith(ROOT + path.sep) && filePath !== ROOT) {
    res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Accès refusé");
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Fichier introuvable");
      return;
    }
    const type = MIME[path.extname(filePath).toLowerCase()] || "application/octet-stream";
    res.writeHead(200, {
      "Content-Type": type,
      "Cache-Control": "no-cache"
    });
    res.end(data);
  });
});

const io = new Server(server);

const rooms = new Map();

function roomPeers(roomId) {
  const members = rooms.get(roomId);
  if (!members) return [];
  return Array.from(members.entries()).map(([peer, presence]) => ({
    peer,
    presence: presence || {}
  }));
}

function broadcastPeers(roomId) {
  if (!roomId) return;
  io.to(roomId).emit("peers", roomPeers(roomId));
}

function leaveRoom(socket) {
  const roomId = socket.data.roomId;
  if (!roomId) return;

  const members = rooms.get(roomId);
  if (members) {
    members.delete(socket.id);
    if (members.size === 0) rooms.delete(roomId);
  }

  socket.leave(roomId);
  socket.data.roomId = null;
  socket.data.presence = null;
  broadcastPeers(roomId);
}

function sanitizePresence(value) {
  if (!value || typeof value !== "object") return {};
  const safe = {};
  if (value.role === "host" || value.role === "player") safe.role = value.role;
  if (typeof value.name === "string") safe.name = value.name.slice(0, 20);
  if (Number.isFinite(Number(value.h))) safe.h = Number(value.h);
  if (Number.isFinite(Number(value.a))) safe.a = Number(value.a);
  if (value.st && typeof value.st === "object") safe.st = value.st;
  return safe;
}

io.on("connection", (socket) => {
  socket.emit("leaderboard", topLeaderboard());

  socket.on("join", (payload, ack) => {
    const reply = typeof ack === "function" ? ack : () => {};
    try {
      const roomId = String((payload && payload.room) || "").trim().slice(0, 64);
      if (!roomId) {
        reply({ ok: false, error: "Salle invalide" });
        return;
      }

      if (socket.data.roomId) leaveRoom(socket);

      socket.join(roomId);
      socket.data.roomId = roomId;
      socket.data.presence = sanitizePresence(payload.presence);

      let members = rooms.get(roomId);
      if (!members) {
        members = new Map();
        rooms.set(roomId, members);
      }
      members.set(socket.id, socket.data.presence);

      reply({ ok: true, id: socket.id });
      broadcastPeers(roomId);
    } catch (error) {
      reply({ ok: false, error: "Impossible de rejoindre la salle" });
    }
  });

  socket.on("presence", (data) => {
    const roomId = socket.data.roomId;
    if (!roomId) return;
    const members = rooms.get(roomId);
    if (!members) return;

    socket.data.presence = {
      ...(socket.data.presence || {}),
      ...sanitizePresence(data)
    };
    members.set(socket.id, socket.data.presence);
    broadcastPeers(roomId);
  });

  socket.on("emit", (payload) => {
    const roomId = socket.data.roomId;
    if (!roomId || !payload) return;
    const event = String(payload.event || "").slice(0, 40);
    if (!event) return;
    socket.to(roomId).emit("event", {
      event,
      data: payload.data,
      peer: socket.id
    });
  });

  socket.on("leave", () => leaveRoom(socket));

  socket.on("score", (payload) => {
    if (!payload || typeof payload !== "object") return;

    const id = String(payload.id || socket.id).slice(0, 64);
    const name = String(payload.name || "Joueur").slice(0, 20);
    const score = Math.max(0, Math.min(1000000000, Math.round(Number(payload.score) || 0)));
    const h = Math.max(0, Math.min(4, Math.round(Number(payload.h) || 0)));
    const a = Math.max(0, Math.min(3, Math.round(Number(payload.a) || 0)));

    const existing = leaderboard.find((entry) => entry.id === id);
    if (existing) {
      existing.name = name;
      existing.h = h;
      existing.a = a;
      existing.score = Math.max(Number(existing.score) || 0, score);
      existing.games = (Number(existing.games) || 0) + 1;
    } else {
      leaderboard.push({ id, name, h, a, score, games: 1 });
    }

    leaderboard = leaderboard
      .sort((first, second) => Number(second.score) - Number(first.score))
      .slice(0, MAX_LEADERBOARD);

    persistLeaderboard();
    broadcastLeaderboard();
  });

  socket.on("disconnect", () => leaveRoom(socket));
});

function listen(port, attemptsLeft) {
  const onError = (error) => {
    if (error.code === "EADDRINUSE" && attemptsLeft > 0) {
      console.warn(`Port ${port} occupé, tentative sur ${port + 1}…`);
      setTimeout(() => listen(port + 1, attemptsLeft - 1), 60);
      return;
    }
    console.error(error);
    process.exit(1);
  };

  server.once("error", onError);
  server.listen(port, () => {
    server.removeListener("error", onError);
    console.log(`CREATOR Guess Their Answer → http://localhost:${port}`);
  });
}

listen(PORT, 10);
