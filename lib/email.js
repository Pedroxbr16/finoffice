const { getEnv } = require("./env");

const EMAILJS_ENDPOINT = "https://api.emailjs.com/api/v1.0/email/send";

async function sendOtpEmail({ toEmail, toName, code, validMinutes, company }) {
    const response = await fetch(EMAILJS_ENDPOINT, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            service_id: getEnv("EMAILJS_SERVICE_ID"),
            template_id: getEnv("EMAILJS_TEMPLATE_ID"),
            user_id: getEnv("EMAILJS_PUBLIC_KEY"),
            accessToken: getEnv("EMAILJS_PRIVATE_KEY"),
            template_params: {
                to_email: toEmail,
                to_name: toName,
                code,
                valid_minutes: String(validMinutes),
                company
            }
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        const error = new Error(`Falha ao enviar e-mail pelo EmailJS: ${errorText || response.statusText}`);
        error.statusCode = 502;
        throw error;
    }
}

module.exports = {
    sendOtpEmail
};
