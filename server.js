const fs = require("fs");
const http = require("http");
const path = require("path");

const healthHandler = require("./api/health");
const usersHandler = require("./api/users/index");
const userByIdHandler = require("./api/users/[id]");
const transactionsHandler = require("./api/transactions/index");
const transactionByIdHandler = require("./api/transactions/[id]");
const { setCorsHeaders } = require("./lib/http");

const port = Number(process.env.PORT || 3000);
const rootDir = __dirname;

function serveIndex(res) {
    const indexPath = path.join(rootDir, "index.html");
    const html = fs.readFileSync(indexPath, "utf8");
    res.statusCode = 200;
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.end(html);
}

function serveNotFound(res) {
    res.statusCode = 404;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ error: "Rota nao encontrada." }));
}

function assignQuery(req, parsedUrl) {
    req.query = {};

    for (const [key, value] of parsedUrl.searchParams.entries()) {
        req.query[key] = value;
    }
}

const server = http.createServer(async (req, res) => {
    const parsedUrl = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    assignQuery(req, parsedUrl);

    if (parsedUrl.pathname === "/" || parsedUrl.pathname === "/index.html") {
        return serveIndex(res);
    }

    if (parsedUrl.pathname === "/api/health") {
        return healthHandler(req, res);
    }

    if (parsedUrl.pathname === "/api/users") {
        return usersHandler(req, res);
    }

    if (parsedUrl.pathname.startsWith("/api/users/")) {
        req.params = {
            id: parsedUrl.pathname.split("/").pop()
        };
        return userByIdHandler(req, res);
    }

    if (parsedUrl.pathname === "/api/transactions") {
        return transactionsHandler(req, res);
    }

    if (parsedUrl.pathname.startsWith("/api/transactions/")) {
        req.params = {
            id: parsedUrl.pathname.split("/").pop()
        };
        return transactionByIdHandler(req, res);
    }

    if (req.method === "OPTIONS" && parsedUrl.pathname.startsWith("/api/")) {
        setCorsHeaders(res);
        res.statusCode = 204;
        res.end();
        return;
    }

    return serveNotFound(res);
});

server.listen(port, () => {
    console.log(`FinOffice rodando em http://localhost:${port}`);
});
