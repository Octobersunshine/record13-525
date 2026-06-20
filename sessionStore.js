const { v4: uuidv4 } = require('uuid');

const SESSION_TTL = parseInt(process.env.SESSION_TTL || '7200000', 10);

const sessions = new Map();

function createSession(openid, sessionKey) {
  const token = uuidv4();
  const expiresAt = Date.now() + SESSION_TTL;
  sessions.set(token, {
    openid,
    sessionKey,
    createdAt: Date.now(),
    expiresAt,
  });
  return { token, expiresAt, ttl: SESSION_TTL };
}

function getSession(token) {
  const session = sessions.get(token);
  if (!session) {
    return null;
  }
  if (Date.now() > session.expiresAt) {
    sessions.delete(token);
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
    return null;
  }
  session.expiresAt = Date.now() + SESSION_TTL;
  return { token, expiresAt: session.expiresAt, ttl: SESSION_TTL };
}

function destroySession(token) {
  return sessions.delete(token);
}

function cleanupExpiredSessions() {
  const now = Date.now();
  for (const [token, session] of sessions.entries()) {
    if (now > session.expiresAt) {
      sessions.delete(token);
    }
  }
}

setInterval(cleanupExpiredSessions, 60 * 1000);

module.exports = {
  createSession,
  getSession,
  refreshSession,
  destroySession,
};
