const { authenticateTelegram } = require('./_telegram');

module.exports = async function handler(req, res) {
  try {
    const user = authenticateTelegram(req);
    return res.status(200).json({
      id: user.id,
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      username: user.username || ''
    });
  } catch (e) {
    return res.status(401).json({ error: e.message || 'Ошибка авторизации' });
  }
};
