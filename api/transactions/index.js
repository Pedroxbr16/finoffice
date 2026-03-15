const { connectToDatabase } = require("../../lib/db");
const { getUrl, handleApiError, handlePreflight, methodNotAllowed, readJsonBody, sendJson } = require("../../lib/http");
const { serializeTransaction, toObjectId } = require("../../lib/serializers");
const { validateTransactionPayload } = require("../../lib/validation");

async function ensureUserExists(usersCollection, userId) {
    const user = await usersCollection.findOne({ _id: userId });

    if (!user) {
        const error = new Error("Usuario nao encontrado.");
        error.statusCode = 404;
        throw error;
    }

    return user;
}

async function syncUserCategory(usersCollection, userId, type, category) {
    await usersCollection.updateOne(
        { _id: userId },
        {
            $addToSet: {
                [`categories.${type}`]: category
            },
            $set: {
                updatedAt: new Date().toISOString()
            }
        }
    );
}

module.exports = async function handler(req, res) {
    if (handlePreflight(req, res)) {
        return;
    }

    try {
        const { db } = await connectToDatabase();
        const transactionsCollection = db.collection("transactions");
        const usersCollection = db.collection("users");

        if (req.method === "GET") {
            const url = getUrl(req);
            const userIdValue = url.searchParams.get("userId");
            const month = url.searchParams.get("month");
            const type = url.searchParams.get("type");

            if (!userIdValue) {
                return sendJson(res, 400, { error: 'O parametro "userId" e obrigatorio.' });
            }

            const userId = toObjectId(userIdValue, "userId");
            const filter = { userId };

            if (month) {
                if (!/^\d{4}-\d{2}$/.test(month)) {
                    return sendJson(res, 400, { error: 'O parametro "month" precisa estar no formato YYYY-MM.' });
                }

                filter.date = { $regex: `^${month}` };
            }

            if (type) {
                if (!["entrada", "saida"].includes(type)) {
                    return sendJson(res, 400, { error: 'O parametro "type" precisa ser "entrada" ou "saida".' });
                }

                filter.type = type;
            }

            const transactions = await transactionsCollection.find(filter).sort({ date: -1, createdAt: -1 }).toArray();

            return sendJson(res, 200, {
                transactions: transactions.map(serializeTransaction)
            });
        }

        if (req.method === "POST") {
            const body = await readJsonBody(req);
            const { errors, value } = validateTransactionPayload(body);

            if (errors.length > 0) {
                return sendJson(res, 400, { error: "Dados da transacao invalidos.", details: errors });
            }

            const userId = toObjectId(value.userId, "userId");
            await ensureUserExists(usersCollection, userId);

            const timestamp = new Date().toISOString();
            const transaction = {
                userId,
                description: value.description,
                amount: value.amount,
                date: value.date,
                type: value.type,
                category: value.category,
                createdAt: timestamp,
                updatedAt: timestamp
            };

            const result = await transactionsCollection.insertOne(transaction);
            await syncUserCategory(usersCollection, userId, value.type, value.category);

            return sendJson(res, 201, {
                transaction: serializeTransaction({
                    ...transaction,
                    _id: result.insertedId
                })
            });
        }

        return methodNotAllowed(res, ["GET", "POST", "OPTIONS"]);
    } catch (error) {
        return handleApiError(res, error);
    }
};
