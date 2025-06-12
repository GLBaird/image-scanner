const crypto = require('crypto');

// generate a 512-bit (64 byte) secret, Base64-encoded
const secret64 = crypto.randomBytes(64).toString('base64');
console.log('Generated key:');
console.log(secret64); // use this for both encrypting & decrypting with A256CBC-HS512
