const crypto = require("crypto");

const KEY_LENGTH = 64;
const SALT_LENGTH = 16;
function normalizePassword(value) {
    return typeof value === "string" ? value : "";
}

function deriveKey(password, salt) {
    return new Promise((resolve, reject) => {
        crypto.scrypt(password, salt, KEY_LENGTH, (error, derivedKey) => {
            if (error) {
                reject(error);
                return;
            }

            resolve(derivedKey.toString("hex"));
        });
    });
}

async function hashPassword(password) {
    const normalizedPassword = normalizePassword(password);
    const salt = crypto.randomBytes(SALT_LENGTH).toString("hex");
    const hash = await deriveKey(normalizedPassword, salt);
    return `${salt}:${hash}`;
}

async function verifyPassword(password, storedHash) {
    if (!storedHash || !storedHash.includes(":")) {
        return false;
    }

    const [salt, hash] = storedHash.split(":");
    const candidateHash = await deriveKey(normalizePassword(password), salt);
    const hashBuffer = Buffer.from(hash, "hex");
    const candidateBuffer = Buffer.from(candidateHash, "hex");

    if (hashBuffer.length !== candidateBuffer.length) {
        return false;
    }

    return crypto.timingSafeEqual(hashBuffer, candidateBuffer);
}

function generateOtpCode(length = 6) {
    let code = "";

    while (code.length < length) {
        code += crypto.randomInt(0, 10).toString();
    }

    return code.slice(0, length);
}

function hashOtpCode(code) {
    return crypto.createHash("sha256").update(code).digest("hex");
}

module.exports = {
    hashPassword,
    hashOtpCode,
    generateOtpCode,
    verifyPassword
};
