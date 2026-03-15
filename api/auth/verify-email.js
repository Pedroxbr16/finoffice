const { connectToDatabase } = require("../../lib/db");
const { hashOtpCode } = require("../../lib/auth");
const { handleApiError, handlePreflight, methodNotAllowed, readJsonBody, sendJson } = require("../../lib/http");
const { serializeUser } = require("../../lib/serializers");
const { validateOtpPayload } = require("../../lib/validation");

module.exports = async function handler(req, res) {
    if (handlePreflight(req, res)) {
        return;
    }

    if (req.method !== "POST") {
        return methodNotAllowed(res, ["POST", "OPTIONS"]);
    }

    try {
        const body = await readJsonBody(req);
        const { errors, value } = validateOtpPayload(body);

        if (errors.length > 0) {
            return sendJson(res, 400, { error: "Dados invalidos para confirmacao.", details: errors });
        }

        const { db } = await connectToDatabase();
        const usersCollection = db.collection("users");
        const now = new Date().toISOString();
        const codeHash = hashOtpCode(value.code);

        const user = await usersCollection.findOne({
            email: value.email,
            "emailVerification.codeHash": codeHash,
            "emailVerification.expiresAt": { $gt: now }
        });

        if (!user) {
            return sendJson(res, 400, { error: "Codigo de verificacao invalido ou expirado." });
        }

        await usersCollection.updateOne(
            { _id: user._id },
            {
                $set: {
                    emailVerified: true,
                    updatedAt: now
                },
                $unset: {
                    emailVerification: ""
                }
            }
        );

        const updatedUser = await usersCollection.findOne({ _id: user._id });
        return sendJson(res, 200, {
            user: serializeUser(updatedUser),
            message: "Conta confirmada com sucesso."
        });
    } catch (error) {
        return handleApiError(res, error);
    }
};
