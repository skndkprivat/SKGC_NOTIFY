const crypto = require('crypto');
const logger = require('../utils/logger');

const IV_LENGTH = 16;

function generateKey() {
    return process.env.ENCRYPTION_KEY 
        ? Buffer.from(process.env.ENCRYPTION_KEY, 'hex') 
        : crypto.randomBytes(32);
}

// Sikrer at nøglen er præcis 32 bytes
const ENCRYPTION_KEY = generateKey();
if (ENCRYPTION_KEY.length !== 32) {
    logger.warn('Encryption key is not 32 bytes. Generating a new key.');
    ENCRYPTION_KEY = generateKey();
}

function encrypt(text) {
    try {
        const iv = crypto.randomBytes(IV_LENGTH);
        const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        return iv.toString('hex') + ':' + encrypted;
    } catch (error) {
        logger.error('Encryption error', { 
            message: error.message, 
            stack: error.stack 
        });
        throw error;
    }
}

function decrypt(text) {
    try {
        const textParts = text.split(':');
        const iv = Buffer.from(textParts.shift(), 'hex');
        const encryptedText = Buffer.from(textParts.join(':'), 'hex');
        const decipher = crypto.createDecipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
        let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    } catch (error) {
        logger.error('Decryption error', { 
            message: error.message, 
            stack: error.stack 
        });
        throw error;
    }
}

module.exports = {
    encrypt,
    decrypt,
    ENCRYPTION_KEY
};