const dotenv = require("dotenv");

dotenv.config();

function getEnv(name, fallback) {
    const value = process.env[name] ?? fallback;

    if (value === undefined || value === "") {
        const error = new Error(`A variavel de ambiente "${name}" nao foi definida.`);
        error.statusCode = 500;
        throw error;
    }

    return value;
}

module.exports = {
    getEnv
};
