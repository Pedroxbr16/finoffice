const { connectToDatabase } = require("../../lib/db");
const { generateOtpCode, hashOtpCode, hashPassword } = require("../../lib/auth");
const { sendOtpEmail } = require("../../lib/email");
const { handleApiError, handlePreflight, methodNotAllowed, readJsonBody, sendJson } = require("../../lib/http");
const { serializeUser } = require("../../lib/serializers");
const { validateRegisterPayload } = require("../../lib/validation");

const OTP_VALID_MINUTES = 10;

function createVerificationData() {
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
        const { errors, value } = validateRegisterPayload(body);

        if (errors.length > 0) {
            return sendJson(res, 400, { error: "Dados de cadastro invalidos.", details: errors });
        }

        const { db } = await connectToDatabase();
        const usersCollection = db.collection("users");
        const existingUser = await usersCollection.findOne({ email: value.email });

        if (existingUser) {
            return sendJson(res, 409, { error: "Ja existe um usuario com esse e-mail." });
        }

        const timestamp = new Date().toISOString();
        const verificationData = createVerificationData();
        const user = {
            name: value.name,
            email: value.email,
            officeName: value.officeName,
            passwordHash: await hashPassword(value.password),
            emailVerified: false,
            emailVerification: {
                codeHash: verificationData.codeHash,
                expiresAt: verificationData.expiresAt,
                sentAt: timestamp
            },
            categories: { entrada: [], saida: [] },
            createdAt: timestamp,
            updatedAt: timestamp
        };

        const result = await usersCollection.insertOne(user);
        let emailSent = true;
        let warning = null;

        try {
            await sendOtpEmail({
                toEmail: user.email,
                toName: user.name,
                code: verificationData.code,
                validMinutes: OTP_VALID_MINUTES,
                company: user.officeName || "FinOffice"
            });
        } catch (error) {
            emailSent = false;
            warning = error.message;
        }

        return sendJson(res, 201, {
            user: serializeUser({
                ...user,
                _id: result.insertedId
            }),
            emailSent,
            warning,
            message: emailSent
                ? "Conta criada. Confira seu e-mail para pegar o codigo de confirmacao."
                : "Conta criada, mas nao foi possivel enviar o codigo de confirmacao agora."
        });
    } catch (error) {
        return handleApiError(res, error);
    }
};
