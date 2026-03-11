import { Request, Response, NextFunction } from "express";
export interface AppError extends Error {
    statusCode?: number;
    code?: string;
}
export declare function errorHandler(err: AppError, req: Request, res: Response, next: NextFunction): void;
export declare function notFound(req: Request, res: Response): void;
//# sourceMappingURL=errorHandler.d.ts.map