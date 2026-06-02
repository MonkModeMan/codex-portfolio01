const { readFileSync, existsSync, mkdirSync } = require("node:fs");
const { createServer } = require("node:http");
const { extname, join } = require("node:path");
const { DatabaseSync } = require("node:sqlite");

const PORT = Number(process.env.PORT || 4174);
const ROOT_DIR = __dirname;
const PUBLIC_DIR = join(ROOT_DIR, "public");
const DATA_DIR = join(ROOT_DIR, "data");
const DB_PATH = join(DATA_DIR, "pmo-meeting-hub.sqlite");

if (!existsSync(DATA_DIR)) {
  mkdirSync(DATA_DIR, { recursive: true });
}

const db = new DatabaseSync(DB_PATH);
db.exec(`
  CREATE TABLE IF NOT EXISTS meetings (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    date TEXT NOT NULL,
    attendees TEXT NOT NULL DEFAULT '',
    minutes TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS meeting_items (
    id TEXT PRIMARY KEY,
    meeting_id TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('decisions', 'todos', 'issues')),
    text TEXT NOT NULL,
    owner TEXT NOT NULL DEFAULT '',
    due_date TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT '未着手',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE
  );
`);

seedIfEmpty();

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};

createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${request.headers.host}`);

    if (url.pathname.startsWith("/api/")) {
      await handleApi(request, response, url);
      return;
    }

    serveStatic(response, url.pathname === "/" ? "/index.html" : url.pathname);
  } catch (error) {
    sendJson(response, 500, { error: "Internal Server Error", detail: error.message });
  }
}).listen(PORT, "127.0.0.1", () => {
  console.log(`PMO Meeting Hub SQLite版: http://127.0.0.1:${PORT}/index.html`);
});

async function handleApi(request, response, url) {
  const segments = url.pathname.split("/").filter(Boolean);

  if (request.method === "GET" && url.pathname === "/api/meetings") {
    sendJson(response, 200, getMeetings());
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/meetings") {
    const body = await readJson(request);
    const meeting = createMeeting(body);
    sendJson(response, 201, meeting);
    return;
  }

  if (segments[0] === "api" && segments[1] === "meetings" && segments[2]) {
    const meetingId = segments[2];

    if (request.method === "PUT" && segments.length === 3) {
      const body = await readJson(request);
      sendJson(response, 200, updateMeeting(meetingId, body));
      return;
    }

    if (request.method === "DELETE" && segments.length === 3) {
      deleteMeeting(meetingId);
      sendJson(response, 200, { ok: true });
      return;
    }

    if (request.method === "POST" && segments[3] === "items") {
      const body = await readJson(request);
      sendJson(response, 201, createItem(meetingId, body));
      return;
    }
  }

  if (segments[0] === "api" && segments[1] === "items" && segments[2]) {
    const itemId = segments[2];

    if (request.method === "PUT") {
      const body = await readJson(request);
      sendJson(response, 200, updateItem(itemId, body));
      return;
    }

    if (request.method === "DELETE") {
      deleteItem(itemId);
      sendJson(response, 200, { ok: true });
      return;
    }
  }

  sendJson(response, 404, { error: "Not Found" });
}

function getMeetings() {
  const meetings = db
    .prepare("SELECT id, title, date, attendees, minutes FROM meetings ORDER BY date DESC, created_at DESC")
    .all();
  const items = db
    .prepare("SELECT id, meeting_id, type, text, owner, due_date, status FROM meeting_items ORDER BY created_at ASC")
    .all();

  return meetings.map((meeting) => ({
    ...meeting,
    decisions: mapItems(items, meeting.id, "decisions"),
    todos: mapItems(items, meeting.id, "todos"),
    issues: mapItems(items, meeting.id, "issues"),
  }));
}

function createMeeting(body) {
  const meeting = normalizeMeeting(body);
  db.prepare(
    "INSERT INTO meetings (id, title, date, attendees, minutes) VALUES (?, ?, ?, ?, ?)"
  ).run(meeting.id, meeting.title, meeting.date, meeting.attendees, meeting.minutes);
  return { ...meeting, decisions: [], todos: [], issues: [] };
}

function updateMeeting(id, body) {
  const meeting = normalizeMeeting({ ...body, id });
  db.prepare(
    "UPDATE meetings SET title = ?, date = ?, attendees = ?, minutes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
  ).run(meeting.title, meeting.date, meeting.attendees, meeting.minutes, id);
  return getMeetings().find((item) => item.id === id);
}

function deleteMeeting(id) {
  db.prepare("DELETE FROM meeting_items WHERE meeting_id = ?").run(id);
  db.prepare("DELETE FROM meetings WHERE id = ?").run(id);
}

function createItem(meetingId, body) {
  const item = normalizeItem({ ...body, meetingId });
  db.prepare(
    "INSERT INTO meeting_items (id, meeting_id, type, text, owner, due_date, status) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).run(item.id, meetingId, item.type, item.text, item.owner, item.dueDate, item.status);
  return item;
}

function updateItem(id, body) {
  const current = db
    .prepare("SELECT meeting_id, type, text, owner, due_date, status FROM meeting_items WHERE id = ?")
    .get(id);
  if (!current) return null;

  const item = normalizeItem({
    id,
    meetingId: current.meeting_id,
    type: body.type ?? current.type,
    text: body.text ?? current.text,
    owner: body.owner ?? current.owner,
    dueDate: body.dueDate ?? current.due_date,
    status: body.status ?? current.status,
  });

  db.prepare(
    "UPDATE meeting_items SET type = ?, text = ?, owner = ?, due_date = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
  ).run(item.type, item.text, item.owner, item.dueDate, item.status, id);
  return item;
}

function deleteItem(id) {
  db.prepare("DELETE FROM meeting_items WHERE id = ?").run(id);
}

function mapItems(items, meetingId, type) {
  return items
    .filter((item) => item.meeting_id === meetingId && item.type === type)
    .map((item) => ({
      id: item.id,
      text: item.text,
      owner: item.owner,
      dueDate: item.due_date,
      status: item.status,
    }));
}

function normalizeMeeting(body) {
  return {
    id: body.id || createId(),
    title: String(body.title || "無題の会議").trim(),
    date: String(body.date || new Date().toISOString().slice(0, 10)),
    attendees: String(body.attendees || "").trim(),
    minutes: String(body.minutes || "").trim(),
  };
}

function normalizeItem(body) {
  const allowedTypes = new Set(["decisions", "todos", "issues"]);
  const allowedStatuses = new Set(["未着手", "進行中", "完了", "保留"]);
  return {
    id: body.id || createId(),
    meetingId: body.meetingId,
    type: allowedTypes.has(body.type) ? body.type : "todos",
    text: String(body.text || "").trim(),
    owner: String(body.owner || "").trim(),
    dueDate: String(body.dueDate || ""),
    status: allowedStatuses.has(body.status) ? body.status : "未着手",
  };
}

function seedIfEmpty() {
  const count = db.prepare("SELECT COUNT(*) AS count FROM meetings").get().count;
  if (count > 0) return;

  const meeting = createMeeting({
    title: "基幹システム刷新 定例会",
    date: new Date().toISOString().slice(0, 10),
    attendees: "PMO, 開発リード, 業務部門",
    minutes: "進捗は計画通り。要件確定後の追加要望は変更管理フローに乗せる方針を確認。",
  });
  createItem(meeting.id, {
    type: "decisions",
    text: "追加要望はPMOが一次受付し、影響度を整理する",
    owner: "PMO",
    status: "完了",
  });
  createItem(meeting.id, {
    type: "todos",
    text: "次回会議までに移行リハーサル計画を作成する",
    owner: "開発リード",
    status: "進行中",
  });
  createItem(meeting.id, {
    type: "issues",
    text: "業務部門レビューの参加者確定が遅れている",
    owner: "業務部門",
    status: "未着手",
  });
}

function serveStatic(response, pathname) {
  const safePath = pathname.replace(/^\/+/, "");
  const filePath = join(PUBLIC_DIR, safePath);
  if (!filePath.startsWith(PUBLIC_DIR) || !existsSync(filePath)) {
    sendText(response, 404, "Not Found");
    return;
  }

  response.writeHead(200, {
    "Content-Type": mimeTypes[extname(filePath)] || "application/octet-stream",
  });
  response.end(readFileSync(filePath));
}

function readJson(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) request.destroy();
    });
    request.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(error);
      }
    });
  });
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(payload));
}

function sendText(response, statusCode, text) {
  response.writeHead(statusCode, { "Content-Type": "text/plain; charset=utf-8" });
  response.end(text);
}

function createId() {
  return globalThis.crypto.randomUUID();
}
