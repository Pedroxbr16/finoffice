const { MongoClient } = require("mongodb");
const { getEnv } = require("./env");

const globalCache = globalThis;
const cacheKey = "__finofficeMongoConnection__";
const indexKey = "__finofficeMongoIndexes__";

async function ensureIndexes(db) {
    if (!globalCache[indexKey]) {
        globalCache[indexKey] = Promise.all([
            db.collection("users").createIndex({ email: 1 }, { unique: true, sparse: true }),
            db.collection("transactions").createIndex({ userId: 1, date: -1 }),
            db.collection("transactions").createIndex({ userId: 1, type: 1 })
        ]);
    }

    await globalCache[indexKey];
}

async function connectToDatabase() {
    if (!globalCache[cacheKey]) {
        const uri = getEnv("MONGODB_URI");
        const dbName = getEnv("MONGODB_DB", "finoffice");
        const client = new MongoClient(uri);

        globalCache[cacheKey] = client.connect().then(() => ({
            client,
            db: client.db(dbName)
        }));
    }

    const connection = await globalCache[cacheKey];
    await ensureIndexes(connection.db);
    return connection;
}

module.exports = {
    connectToDatabase
};
