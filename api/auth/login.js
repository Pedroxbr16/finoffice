const { connectToDatabase } = require("../../lib/db");
const { verifyPassword } = require("../../lib/auth");
const { handleApiError, handlePreflight, methodNotAllowed, readJsonBody, sendJson } = require("../../lib/http");
const { serializeUser } = require("../../lib/serializers");
const { validateLoginPayload } = require("../../lib/validation");

module.exports = async function handler(req, res) {
    if (handlePreflight(req, res)) {
        return;
    }

    if (req.method !== "POST") {
        return methodNotAllowed(res, ["POST", "OPTIONS"]);
    }

    try {
        const body = await readJsonBody(req);
        const { errors, value } = validateLoginPayload(body);

        if (errors.length > 0) {
            return sendJson(res, 400, { error: "Dados de login invalidos.", details: errors });
        }

        const { db } = await connectToDatabase();
        const usersCollection = db.collection("users");
        const user = await usersCollection.findOne({ email: value.email });

        if (!user || !user.passwordHash) {
            return sendJson(res, 401, { error: "E-mail ou senha invalidos." });
        }

        if (!user.emailVerified) {
            return sendJson(res, 403, {
                error: "Seu e-mail ainda nao foi confirmado.",
                code: "EMAIL_NOT_VERIFIED"
            });
        }

        const isValidPassword = await verifyPassword(value.password, user.passwordHash);

        if (!isValidPassword) {
            return sendJson(res, 401, { error: "E-mail ou senha invalidos." });
        }

        return sendJson(res, 200, {
            user: serializeUser(user)
        });
    } catch (error) {
        return handleApiError(res, error);
    }
};
