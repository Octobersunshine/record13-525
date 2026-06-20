const { getSession } = require('./sessionStore');

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.slice(7)
    : null;

  if (!token) {
    return res.status(401).json({
      code: 401,
      message: '未提供认证令牌',
    });
  }

  const session = getSession(token);
  if (!session) {
    return res.status(401).json({
      code: 401,
      message: '登录已过期或无效',
    });
  }

  req.session = {
    token,
    openid: session.openid,
    sessionKey: session.sessionKey,
    expiresAt: session.expiresAt,
  };

  next();
}

module.exports = authMiddleware;
