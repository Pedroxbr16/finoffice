const { connectToDatabase } = require("../../lib/db");
const { getParam, handleApiError, handlePreflight, methodNotAllowed, readJsonBody, sendJson } = require("../../lib/http");
const { serializeUser, toObjectId } = require("../../lib/serializers");
const { validateUserPayload } = require("../../lib/validation");

module.exports = async function handler(req, res) {
    if (handlePreflight(req, res)) {
        return;
    }

    try {
        const userId = toObjectId(getParam(req, "id"), "id");
        const { db } = await connectToDatabase();
        const usersCollection = db.collection("users");
        const transactionsCollection = db.collection("transactions");

        if (req.method === "GET") {
            const user = await usersCollection.findOne({ _id: userId });

            if (!user) {
                return sendJson(res, 404, { error: "Usuario nao encontrado." });
            }

            return sendJson(res, 200, {
                user: serializeUser(user)
            });
        }

        if (req.method === "PATCH") {
            const existingUser = await usersCollection.findOne({ _id: userId });

            if (!existingUser) {
                return sendJson(res, 404, { error: "Usuario nao encontrado." });
            }

            const body = await readJsonBody(req);
            const mergedPayload = {
                name: body.name !== undefined ? body.name : existingUser.name,
                email: body.email !== undefined ? body.email : existingUser.email,
                officeName: body.officeName !== undefined ? body.officeName : existingUser.officeName,
                categories: body.categories !== undefined ? body.categories : existingUser.categories
            };

            const { errors, value } = validateUserPayload(mergedPayload);

            if (errors.length > 0) {
                return sendJson(res, 400, { error: "Dados do usuario invalidos.", details: errors });
            }

            const updateDocument = {
                name: value.name,
                officeName: value.officeName,
                categories: value.categories || existingUser.categories || { entrada: [], saida: [] },
                updatedAt: new Date().toISOString()
            };

            if (value.email) {
                updateDocument.email = value.email;
            }

            await usersCollection.updateOne(
                { _id: userId },
                {
                    $set: updateDocument,
                    $unset: value.email ? {} : { email: "" }
                }
            );

            const updatedUser = await usersCollection.findOne({ _id: userId });
            return sendJson(res, 200, {
                user: serializeUser(updatedUser)
            });
        }

        if (req.method === "DELETE") {
            const deleteResult = await usersCollection.deleteOne({ _id: userId });

            if (deleteResult.deletedCount === 0) {
                return sendJson(res, 404, { error: "Usuario nao encontrado." });
            }

            await transactionsCollection.deleteMany({ userId });

            return sendJson(res, 200, {
                success: true
            });
        }

        return methodNotAllowed(res, ["GET", "PATCH", "DELETE", "OPTIONS"]);
    } catch (error) {
        return handleApiError(res, error);
    }
};
