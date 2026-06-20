const axios = require('axios');

const APPID = process.env.WECHAT_APPID;
const SECRET = process.env.WECHAT_SECRET;

async function code2Session(code) {
  if (!APPID || APPID === 'your_wechat_appid') {
    throw new Error('WECHAT_APPID 未配置');
  }
  if (!SECRET || SECRET === 'your_wechat_secret') {
    throw new Error('WECHAT_SECRET 未配置');
  }
  if (!code) {
    throw new Error('code 不能为空');
  }

  const url = 'https://api.weixin.qq.com/sns/jscode2session';
  const params = {
    appid: APPID,
    secret: SECRET,
    js_code: code,
    grant_type: 'authorization_code',
  };

  try {
    const response = await axios.get(url, { params });
    const data = response.data;

    if (data.errcode) {
      throw new Error(`微信接口错误: ${data.errmsg} (errcode: ${data.errcode})`);
    }

    return {
      openid: data.openid,
      sessionKey: data.session_key,
      unionid: data.unionid || null,
    };
  } catch (error) {
    if (error.response) {
      throw new Error(`微信接口请求失败: HTTP ${error.response.status}`);
    }
    throw error;
  }
}

module.exports = {
  code2Session,
};
