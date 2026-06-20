const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const SESSION_TTL = parseInt(process.env.SESSION_TTL || '7200000', 10);
const SESSION_FILE = process.env.SESSION_FILE || path.join(__dirname, 'sessions.json');

const sessions = new Map();

function loadSessions() {
  try {
    if (fs.existsSync(SESSION_FILE)) {
      const data = fs.readFileSync(SESSION_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      const now = Date.now();
      for (const [token, session] of Object.entries(parsed)) {
        if (now <= session.expiresAt) {
          sessions.set(token, session);
        }
      }
      console.log(`从持久化存储恢复 ${sessions.size} 个有效会话`);
    }
  } catch (error) {
    console.error('加载持久化会话失败:', error.message);
  }
}

function saveSessions() {
  try {
    const obj = {};
    for (const [token, session] of sessions.entries()) {
      obj[token] = session;
    }
    fs.writeFileSync(SESSION_FILE, JSON.stringify(obj, null, 2), 'utf-8');
  } catch (error) {
    console.error('持久化会话失败:', error.message);
  }
}

function createSession(openid, sessionKey) {
  const token = uuidv4();
  const expiresAt = Date.now() + SESSION_TTL;
  const sessionData = {
    openid,
    sessionKey,
    createdAt: Date.now(),
    expiresAt,
  };
  sessions.set(token, sessionData);
  saveSessions();
  return { token, expiresAt, ttl: SESSION_TTL };
}

function getSession(token) {
  const session = sessions.get(token);
  if (!session) {
    return null;
  }
  if (Date.now() > session.expiresAt) {
    sessions.delete(token);
    saveSessions();
    return null;
  }
  return session;
}

function refreshSession(token) {
  const session = sessions.get(token);
  if (!session) {
    return null;
  }
  if (Date.now() > session.expiresAt) {
    sessions.delete(token);
    saveSessions();
    return null;
  }
  session.expiresAt = Date.now() + SESSION_TTL;
  sessions.set(token, session);
  saveSessions();
  return { token, expiresAt: session.expiresAt, ttl: SESSION_TTL };
}

function destroySession(token) {
  const existed = sessions.delete(token);
  if (existed) {
    saveSessions();
  }
  return existed;
}

function cleanupExpiredSessions() {
  const now = Date.now();
  let changed = false;
  for (const [token, session] of sessions.entries()) {
    if (now > session.expiresAt) {
      sessions.delete(token);
      changed = true;
    }
  }
  if (changed) {
    saveSessions();
  }
}

loadSessions();
setInterval(cleanupExpiredSessions, 60 * 1000);

module.exports = {
  createSession,
  getSession,
  refreshSession,
  destroySession,
};
