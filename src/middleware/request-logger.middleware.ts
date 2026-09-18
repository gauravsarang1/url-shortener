import { RequestHandler } from "express";

export const requestLogger: RequestHandler = (req, res, next) => {
    const startedAt = process.hrtime.bigint();
    let logged = false;

    const logRequest = (event: "completed" | "aborted") => {
        if (logged) return;

        logged = true;

        const latencyMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;

        const path = req.originalUrl || req.url;

        if (event === "completed") {
            console.log(
                `✅ ${req.method} ${path} → ${res.statusCode} | ${latencyMs.toFixed(0)} ms`,
            );
        } else {
            console.log(
                `⚠️ ${req.method} ${path} → Request cancelled | ${latencyMs.toFixed(0)} ms`,
            );
        }
    };

    res.once("finish", () => logRequest("completed"));
    res.once("close", () =>
        logRequest(res.writableFinished ? "completed" : "aborted"),
    );

    next();
};
