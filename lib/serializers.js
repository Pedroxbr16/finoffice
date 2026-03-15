const { ObjectId } = require("mongodb");

function ensureCategories(categories) {
    return {
        entrada: Array.isArray(categories?.entrada) ? categories.entrada : [],
        saida: Array.isArray(categories?.saida) ? categories.saida : []
    };
}

function serializeUser(user) {
    return {
        id: user._id.toString(),
        name: user.name,
        email: user.email || "",
        officeName: user.officeName || "",
        categories: ensureCategories(user.categories),
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
    };
}

function serializeTransaction(transaction) {
    return {
        id: transaction._id.toString(),
        userId: transaction.userId.toString(),
        description: transaction.description,
        amount: transaction.amount,
        date: transaction.date,
        type: transaction.type,
        category: transaction.category,
        createdAt: transaction.createdAt,
        updatedAt: transaction.updatedAt
    };
}

function toObjectId(value, fieldName) {
    if (!ObjectId.isValid(value)) {
        const error = new Error(`O campo "${fieldName}" precisa ser um ObjectId valido.`);
        error.statusCode = 400;
        throw error;
    }

    return new ObjectId(value);
}

module.exports = {
    ensureCategories,
    serializeTransaction,
    serializeUser,
    toObjectId
};
