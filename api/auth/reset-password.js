const { connectToDatabase } = require("../../lib/db");
const { hashOtpCode, hashPassword } = require("../../lib/auth");
const { handleApiError, handlePreflight, methodNotAllowed, readJsonBody, sendJson } = require("../../lib/http");
const { validateResetPasswordPayload } = require("../../lib/validation");

module.exports = async function handler(req, res) {
    if (handlePreflight(req, res)) {
        return;
    }

    if (req.method !== "POST") {
        return methodNotAllowed(res, ["POST", "OPTIONS"]);
    }

    try {
        const body = await readJsonBody(req);
        const { errors, value } = validateResetPasswordPayload(body);

        if (errors.length > 0) {
            return sendJson(res, 400, { error: "Dados invalidos para redefinicao.", details: errors });
        }

        const { db } = await connectToDatabase();
        const usersCollection = db.collection("users");
        const codeHash = hashOtpCode(value.code);
        const now = new Date().toISOString();

        const user = await usersCollection.findOne({
            email: value.email,
            "passwordReset.codeHash": codeHash,
            "passwordReset.expiresAt": { $gt: now }
        });

        if (!user) {
            return sendJson(res, 400, { error: "Codigo de recuperacao invalido ou expirado." });
        }

        await usersCollection.updateOne(
            { _id: user._id },
            {
                $set: {
                    passwordHash: await hashPassword(value.password),
                    updatedAt: now
                },
                $unset: {
                    passwordReset: ""
                }
            }
        );

        return sendJson(res, 200, {
            message: "Senha redefinida com sucesso."
        });
    } catch (error) {
        return handleApiError(res, error);
    }
};
