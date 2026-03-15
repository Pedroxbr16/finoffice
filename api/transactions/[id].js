const { connectToDatabase } = require("../../lib/db");
const { getParam, handleApiError, handlePreflight, methodNotAllowed, readJsonBody, sendJson } = require("../../lib/http");
const { serializeTransaction, toObjectId } = require("../../lib/serializers");
const { validateTransactionPayload } = require("../../lib/validation");

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
        const transactionId = toObjectId(getParam(req, "id"), "id");
        const { db } = await connectToDatabase();
        const transactionsCollection = db.collection("transactions");
        const usersCollection = db.collection("users");

        if (req.method === "GET") {
            const transaction = await transactionsCollection.findOne({ _id: transactionId });

            if (!transaction) {
                return sendJson(res, 404, { error: "Transacao nao encontrada." });
            }

            return sendJson(res, 200, {
                transaction: serializeTransaction(transaction)
            });
        }

        if (req.method === "PATCH") {
            const existingTransaction = await transactionsCollection.findOne({ _id: transactionId });

            if (!existingTransaction) {
                return sendJson(res, 404, { error: "Transacao nao encontrada." });
            }

            const body = await readJsonBody(req);
            const mergedPayload = {
                userId: body.userId !== undefined ? body.userId : existingTransaction.userId.toString(),
                description: body.description !== undefined ? body.description : existingTransaction.description,
                amount: body.amount !== undefined ? body.amount : existingTransaction.amount,
                date: body.date !== undefined ? body.date : existingTransaction.date,
                type: body.type !== undefined ? body.type : existingTransaction.type,
                category: body.category !== undefined ? body.category : existingTransaction.category
            };

            const { errors, value } = validateTransactionPayload(mergedPayload);

            if (errors.length > 0) {
                return sendJson(res, 400, { error: "Dados da transacao invalidos.", details: errors });
            }

            const userId = toObjectId(value.userId, "userId");
            const user = await usersCollection.findOne({ _id: userId });

            if (!user) {
                return sendJson(res, 404, { error: "Usuario nao encontrado." });
            }

            const updateDocument = {
                userId,
                description: value.description,
                amount: value.amount,
                date: value.date,
                type: value.type,
                category: value.category,
                updatedAt: new Date().toISOString()
            };

            await transactionsCollection.updateOne(
                { _id: transactionId },
                {
                    $set: updateDocument
                }
            );

            await syncUserCategory(usersCollection, userId, value.type, value.category);

            const updatedTransaction = await transactionsCollection.findOne({ _id: transactionId });
            return sendJson(res, 200, {
                transaction: serializeTransaction(updatedTransaction)
            });
        }

        if (req.method === "DELETE") {
            const deleteResult = await transactionsCollection.deleteOne({ _id: transactionId });

            if (deleteResult.deletedCount === 0) {
                return sendJson(res, 404, { error: "Transacao nao encontrada." });
            }

            return sendJson(res, 200, {
                success: true
            });
        }

        return methodNotAllowed(res, ["GET", "PATCH", "DELETE", "OPTIONS"]);
    } catch (error) {
        return handleApiError(res, error);
    }
};
