"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = errorHandler;
exports.notFound = notFound;
function errorHandler(err, req, res, next) {
    const statusCode = err.statusCode ?? 500;
    const message = err.message ?? "Internal server error";
    console.error(`[API] Error ${statusCode} on ${req.method} ${req.path}:`, message);
    res.status(statusCode).json({
        error: {
            code: err.code ?? "INTERNAL_ERROR",
            message,
            path: req.path,
            timestamp: new Date().toISOString(),
        },
    });
}
function notFound(req, res) {
    res.status(404).json({
        error: {
            code: "NOT_FOUND",
            message: `Route ${req.method} ${req.path} not found`,
            timestamp: new Date().toISOString(),
        },
    });
}
//# sourceMappingURL=errorHandler.js.map