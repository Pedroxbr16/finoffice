const VALID_TRANSACTION_TYPES = new Set(["entrada", "saida"]);

function normalizeText(value) {
    return typeof value === "string" ? value.trim() : "";
}

function normalizeCategories(categories) {
    return {
        entrada: normalizeCategoryList(categories?.entrada),
        saida: normalizeCategoryList(categories?.saida)
    };
}

function normalizeCategoryList(values) {
    if (!Array.isArray(values)) {
        return [];
    }

    return [...new Set(values.map((value) => normalizeText(value)).filter(Boolean))].sort((a, b) =>
        a.localeCompare(b, "pt-BR")
    );
}

function isIsoDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return false;
    }

    const parsed = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(parsed.getTime());
}

function validateUserPayload(payload, options = {}) {
    const partial = Boolean(options.partial);
    const errors = [];
    const value = {};

    if (!partial || payload.name !== undefined) {
        const name = normalizeText(payload.name);

        if (!name) {
            errors.push('O campo "name" e obrigatorio.');
        } else {
            value.name = name;
        }
    }

    if (payload.email !== undefined) {
        const email = normalizeText(payload.email).toLowerCase();

        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            errors.push('O campo "email" precisa ser um e-mail valido.');
        } else if (email) {
            value.email = email;
        } else {
            value.email = undefined;
        }
    }

    if (!partial || payload.officeName !== undefined) {
        const officeName = normalizeText(payload.officeName);
        value.officeName = officeName || normalizeText(payload.name) || "Escritorio Central";
    }

    if (payload.categories !== undefined) {
        value.categories = normalizeCategories(payload.categories);
    }

    return { errors, value };
}

function validateTransactionPayload(payload, options = {}) {
    const partial = Boolean(options.partial);
    const errors = [];
    const value = {};

    if (!partial || payload.userId !== undefined) {
        const userId = normalizeText(payload.userId);

        if (!userId) {
            errors.push('O campo "userId" e obrigatorio.');
        } else {
            value.userId = userId;
        }
    }

    if (!partial || payload.description !== undefined) {
        const description = normalizeText(payload.description);

        if (!description) {
            errors.push('O campo "description" e obrigatorio.');
        } else {
            value.description = description;
        }
    }

    if (!partial || payload.amount !== undefined) {
        const amount = Number(payload.amount);

        if (!Number.isFinite(amount) || amount <= 0) {
            errors.push('O campo "amount" precisa ser um numero maior que zero.');
        } else {
            value.amount = Number(amount.toFixed(2));
        }
    }

    if (!partial || payload.date !== undefined) {
        const date = normalizeText(payload.date);

        if (!isIsoDate(date)) {
            errors.push('O campo "date" precisa estar no formato YYYY-MM-DD.');
        } else {
            value.date = date;
        }
    }

    if (!partial || payload.type !== undefined) {
        const type = normalizeText(payload.type);

        if (!VALID_TRANSACTION_TYPES.has(type)) {
            errors.push('O campo "type" precisa ser "entrada" ou "saida".');
        } else {
            value.type = type;
        }
    }

    if (!partial || payload.category !== undefined) {
        const category = normalizeText(payload.category);

        if (!category) {
            errors.push('O campo "category" e obrigatorio.');
        } else {
            value.category = category;
        }
    }

    return { errors, value };
}

module.exports = {
    normalizeCategories,
    validateTransactionPayload,
    validateUserPayload
};
