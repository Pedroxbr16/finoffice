const { connectToDatabase } = require("../../lib/db");
const { handleApiError, handlePreflight, methodNotAllowed, readJsonBody, sendJson } = require("../../lib/http");
const { serializeUser } = require("../../lib/serializers");
const { validateUserPayload } = require("../../lib/validation");

module.exports = async function handler(req, res) {
    if (handlePreflight(req, res)) {
        return;
    }

    try {
        const { db } = await connectToDatabase();
        const usersCollection = db.collection("users");

        if (req.method === "GET") {
            const users = await usersCollection.find({}).sort({ createdAt: 1 }).toArray();
            return sendJson(res, 200, {
                users: users.map(serializeUser)
            });
        }

        if (req.method === "POST") {
            const body = await readJsonBody(req);
            const { errors, value } = validateUserPayload(body);

            if (errors.length > 0) {
                return sendJson(res, 400, { error: "Dados do usuario invalidos.", details: errors });
            }

            const timestamp = new Date().toISOString();
            const user = {
                name: value.name,
                email: value.email,
                officeName: value.officeName,
                categories: value.categories || { entrada: [], saida: [] },
                createdAt: timestamp,
                updatedAt: timestamp
            };

            const result = await usersCollection.insertOne(user);

            return sendJson(res, 201, {
                user: serializeUser({
                    ...user,
                    _id: result.insertedId
                })
            });
        }

        return methodNotAllowed(res, ["GET", "POST", "OPTIONS"]);
    } catch (error) {
        return handleApiError(res, error);
    }
};
