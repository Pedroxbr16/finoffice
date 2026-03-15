const { sendJson, handleApiError, handlePreflight, methodNotAllowed } = require("../lib/http");

module.exports = async function handler(req, res) {
    if (handlePreflight(req, res)) {
        return;
    }

    if (req.method !== "GET") {
        return methodNotAllowed(res, ["GET", "OPTIONS"]);
    }

    try {
        return sendJson(res, 200, {
            status: "ok",
            service: "finoffice-api",
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        return handleApiError(res, error);
    }
};
