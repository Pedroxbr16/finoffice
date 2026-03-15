function setCorsHeaders(res) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,PUT,DELETE,OPTIONS");
}

function sendJson(res, statusCode, payload) {
    setCorsHeaders(res);
    res.statusCode = statusCode;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify(payload));
}

function sendError(res, statusCode, message, details) {
    return sendJson(res, statusCode, {
        error: message,
        details: details || null
    });
}

function methodNotAllowed(res, allowedMethods) {
    res.setHeader("Allow", allowedMethods.join(", "));
    return sendError(res, 405, "Metodo nao permitido.");
}

function handlePreflight(req, res) {
    if (req.method !== "OPTIONS") {
        return false;
    }

    setCorsHeaders(res);
    res.statusCode = 204;
    res.end();
    return true;
}

async function readJsonBody(req) {
    if (req.body && typeof req.body === "object") {
        return req.body;
    }

    const chunks = [];

    for await (const chunk of req) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }

    if (chunks.length === 0) {
        return {};
    }

    const rawBody = Buffer.concat(chunks).toString("utf8").trim();

    if (!rawBody) {
        return {};
    }

    try {
        return JSON.parse(rawBody);
    } catch (error) {
        const parseError = new Error("JSON invalido no corpo da requisicao.");
        parseError.statusCode = 400;
        throw parseError;
    }
}

function getUrl(req) {
    const host = req.headers.host || "localhost";
    return new URL(req.url, `http://${host}`);
}

function getParam(req, key) {
    if (req.query && req.query[key] !== undefined) {
        const value = req.query[key];
        return Array.isArray(value) ? value[0] : value;
    }

    if (req.params && req.params[key] !== undefined) {
        return req.params[key];
    }

    return undefined;
}

function handleApiError(res, error) {
    if (error && error.code === 11000) {
        return sendError(res, 409, "Ja existe um registro com esse valor unico.");
    }

    const statusCode = error.statusCode || 500;
    const message = error.message || "Erro interno do servidor.";
    return sendError(res, statusCode, message);
}

module.exports = {
    getParam,
    getUrl,
    handleApiError,
    handlePreflight,
    methodNotAllowed,
    readJsonBody,
    sendError,
    sendJson,
    setCorsHeaders
};
