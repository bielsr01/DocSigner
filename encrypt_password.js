const crypto = require('crypto');

const ENCRYPTION_KEY = 'your-32-char-encryption-key-here!!';
const ALGORITHM = 'aes-256-cbc';

function encryptPassword(password) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipher(ALGORITHM, ENCRYPTION_KEY);
  let encrypted = cipher.update(password, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

console.log(encryptPassword('12345678'));