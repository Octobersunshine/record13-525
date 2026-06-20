require('dotenv').config();

const express = require('express');
const cors = require('cors');

const { code2Session } = require('./wechatService');
const { createSession, refreshSession, destroySession, destroySessionsByOpenid } = require('./sessionStore');
const authMiddleware = require('./authMiddleware');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.post('/api/login', async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({
        code: 400,
        message: 'code 不能为空',
      });
    }

    const wechatData = await code2Session(code);
    const session = createSession(wechatData.openid, wechatData.sessionKey);

    res.json({
      code: 0,
      message: '登录成功',
      data: {
        token: session.token,
        expiresAt: session.expiresAt,
        ttl: session.ttl,
        openid: wechatData.openid,
      },
    });
  } catch (error) {
    console.error('登录错误:', error.message);
    res.status(500).json({
      code: 500,
      message: error.message || '登录失败',
    });
  }
});

app.post('/api/logout', authMiddleware, (req, res) => {
  const token = req.session.token;
  destroySession(token);
  res.json({
    code: 0,
    message: '已退出登录',
  });
});

app.post('/api/session/kick-all', authMiddleware, (req, res) => {
  const openid = req.session.openid;
  const destroyed = destroySessionsByOpenid(openid);
  res.json({
    code: 0,
    message: `已下线 ${destroyed.length} 个设备`,
    data: {
      openid,
      kickedCount: destroyed.length,
      kickedSessions: destroyed.map((s) => ({
        tokenPrefix: s.token.substring(0, 8) + '...',
        createdAt: s.createdAt,
      })),
    },
  });
});

app.get('/api/session/refresh', authMiddleware, (req, res) => {
  const result = refreshSession(req.session.token);
  if (!result) {
    return res.status(401).json({
      code: 401,
      message: '会话已失效',
    });
  }
  res.json({
    code: 0,
    message: '会话已刷新',
    data: {
      token: result.token,
      expiresAt: result.expiresAt,
      ttl: result.ttl,
    },
  });
});

app.get('/api/user/info', authMiddleware, (req, res) => {
  res.json({
    code: 0,
    message: '获取成功',
    data: {
      openid: req.session.openid,
      expiresAt: req.session.expiresAt,
    },
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: Date.now(),
  });
});

app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
  console.log(`会话有效期: ${process.env.SESSION_TTL / 1000} 秒`);
});

module.exports = app;
