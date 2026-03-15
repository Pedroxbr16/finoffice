const { connectToDatabase } = require("../../lib/db");
const { generateOtpCode, hashOtpCode } = require("../../lib/auth");
const { sendOtpEmail } = require("../../lib/email");
const { handleApiError, handlePreflight, methodNotAllowed, readJsonBody, sendJson } = require("../../lib/http");
const { validateEmailPayload } = require("../../lib/validation");

const OTP_VALID_MINUTES = 10;

function buildOtpData() {
    const code = generateOtpCode();
    const expiresAt = new Date(Date.now() + OTP_VALID_MINUTES * 60 * 1000).toISOString();

    return {
        code,
        codeHash: hashOtpCode(code),
        expiresAt
    };
}

module.exports = async function handler(req, res) {
    if (handlePreflight(req, res)) {
        return;
    }

    if (req.method !== "POST") {
        return methodNotAllowed(res, ["POST", "OPTIONS"]);
    }

    try {
        const body = await readJsonBody(req);
        const { errors, value } = validateEmailPayload(body);

        if (errors.length > 0) {
            return sendJson(res, 400, { error: "Dados invalidos para recuperacao.", details: errors });
        }

        const { db } = await connectToDatabase();
        const usersCollection = db.collection("users");
        const user = await usersCollection.findOne({ email: value.email });

        if (user && user.emailVerified) {
            const otpData = buildOtpData();
            const now = new Date().toISOString();

            await usersCollection.updateOne(
                { _id: user._id },
                {
                    $set: {
                        passwordReset: {
                            codeHash: otpData.codeHash,
                            expiresAt: otpData.expiresAt,
                            sentAt: now
                        },
                        updatedAt: now
                    }
                }
            );

            await sendOtpEmail({
                toEmail: user.email,
                toName: user.name,
                code: otpData.code,
                validMinutes: OTP_VALID_MINUTES,
                company: user.officeName || "FinOffice"
            });
        }

        return sendJson(res, 200, {
            message: "Se o e-mail existir e estiver confirmado, enviaremos um codigo de recuperacao."
        });
    } catch (error) {
        return handleApiError(res, error);
    }
};
