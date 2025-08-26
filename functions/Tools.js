const { defineSecret } = require('firebase-functions/params');

const ctmCryptSecretKey = defineSecret('CTM_CRYPT_SECRET_KEY');
const ctmCryptIvLength = defineSecret('CTM_CRYPT_IV_LENGTH');

function utf8Encode(str) {
  return Buffer.from(str, "utf8");
}

function utf8Decode(buf) {
  return buf.toString("utf8");
}

function xorWithKeyAndIv(data, key, iv) {
  const out = Buffer.alloc(data.length);
  for (let i = 0; i < data.length; i++) {
    out[i] = data[i] ^ key[i % key.length] ^ iv[i % iv.length];
  }
  return out;
}

function decryptBack(b64) {
  const packed = Buffer.from(b64, "base64");
  const iv = packed.slice(0, ctmCryptIvLength.value());
  const cipher = packed.slice(ctmCryptIvLength.value());

  const keyBytes = utf8Encode(ctmCryptSecretKey.value());
  const plainBytes = xorWithKeyAndIv(cipher, keyBytes, iv);

  return utf8Decode(plainBytes);
}

module.exports = { decryptBack };
