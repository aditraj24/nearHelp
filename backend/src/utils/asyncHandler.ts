import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { UserDocument } from '../models/user.model.js';

/** A request that has already passed through the `authenticate` middleware. */
export interface AuthenticatedRequest extends Request {
    user: UserDocument;
}

type AsyncRouteHandler<Req extends Request = Request> = (
    req: Req,
    res: Response,
    next: NextFunction
) => Promise<unknown> | unknown;

const asyncHandler = <Req extends Request = Request>(
    fn: AsyncRouteHandler<Req>
): RequestHandler => async (req, res, next) => {
    try {
        await fn(req as unknown as Req, res, next)
    }
    catch (error) {
        const err = error as { statusCode?: number; message?: string };
        res.status(err.statusCode || 500).json({
            success: false,
            message: err.message
        })
    }
}

export { asyncHandler };
