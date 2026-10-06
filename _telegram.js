const crypto = require('crypto');

function safeEqualHex(a, b) {
  try {
    const aa = Buffer.from(a, 'hex');
    const bb = Buffer.from(b, 'hex');
    return aa.length === bb.length && crypto.timingSafeEqual(aa, bb);
  } catch (_) {
    return false;
  }
}

function authenticateTelegram(req) {
  const botToken = process.env.BOT_TOKEN;
  if (!botToken) throw new Error('BOT_TOKEN не настроен в Vercel');

  const initData = req.headers['x-telegram-init-data'];
  if (!initData || typeof initData !== 'string') {
    throw new Error('Telegram initData отсутствует');
  }

  const params = new URLSearchParams(initData);
  const receivedHash = params.get('hash');
  if (!receivedHash) throw new Error('Telegram hash отсутствует');
  params.delete('hash');

  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

  const secretKey = crypto
    .createHmac('sha256', 'WebAppData')
    .update(botToken)
    .digest();

  const calculatedHash = crypto
    .createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex');

  if (!safeEqualHex(calculatedHash, receivedHash)) {
    throw new Error('Неверная подпись Telegram');
  }

  const authDate = Number(params.get('auth_date'));
  if (!authDate || Math.abs(Date.now() / 1000 - authDate) > 86400) {
    throw new Error('Данные Telegram устарели');
  }

  const userRaw = params.get('user');
  if (!userRaw) throw new Error('Пользователь Telegram отсутствует');

  let user;
  try { user = JSON.parse(userRaw); } catch (_) { throw new Error('Некорректные данные пользователя'); }
  if (!user || !user.id) throw new Error('Telegram user_id отсутствует');

  return user;
}

module.exports = { authenticateTelegram };
