declare module "moleculer-web" {
    import { Errors, ServiceSchema, Context, ActionEndpoint, Service, ActionSchema } from "moleculer";
    import { IncomingMessage, ServerResponse } from "http"

    class InvalidRequestBodyError extends Errors.MoleculerError { constructor(body: any, error: any) }
    class InvalidResponseTypeError extends Errors.MoleculerError { constructor(dataType: string) }
    class UnAuthorizedError extends Errors.MoleculerError { constructor(type: string|null|undefined, data: any) }
    class ForbiddenError extends Errors.MoleculerError { constructor(type: string, data: any) }
    class BadRequestError extends Errors.MoleculerError { constructor(type: string, data: any) }
    class RateLimitExceeded extends Errors.MoleculerClientError { constructor(type: string, data: any) }
    class NotFoundError extends Errors.MoleculerClientError { constructor(type: string, data: any) }
    class ServiceUnavailableError extends Errors.MoleculerError { constructor(type: string, data: any) }

    interface ApiGatewayErrors {
        InvalidRequestBodyError: typeof InvalidRequestBodyError;
        InvalidResponseTypeError: typeof InvalidResponseTypeError;
        UnAuthorizedError: typeof UnAuthorizedError;
        ForbiddenError: typeof ForbiddenError;
        BadRequestError: typeof BadRequestError;
        RateLimitExceeded: typeof RateLimitExceeded;
        NotFoundError: typeof NotFoundError;
        ServiceUnavailableError: typeof ServiceUnavailableError;

        ERR_NO_TOKEN: "ERR_NO_TOKEN";
        ERR_INVALID_TOKEN: "ERR_INVALID_TOKEN";
        ERR_UNABLE_DECODE_PARAM: "ERR_UNABLE_DECODE_PARAM";
        ERR_ORIGIN_NOT_FOUND: "ORIGIN_NOT_FOUND";
    }

    class Alias {
        _generated: boolean
        service: Service
        route: Route
        type: string
        method: string
        path: string
        handler: null | Array<Function>
        action: string
    }

    // From: https://github.com/DefinitelyTyped/DefinitelyTyped/blob/master/types/cors/index.d.ts
    type CustomOrigin = (
        requestOrigin: string | undefined,
        callback: (err: Error | null, allow?: boolean) => void
    ) => void;

    interface CorsOptions {
        origin?: boolean | string | RegExp | (string | RegExp)[] | CustomOrigin;
        methods?: string | string[];
        allowedHeaders?: string | string[];
        exposedHeaders?: string | string[];
        credentials?: boolean;
        maxAge?: number;
        preflightContinue?: boolean;
        optionsSuccessStatus?: number;
    }

    class Route {
        callOptions: any
        cors: CorsOptions
        etag: boolean | "weak" | "strong" | Function
        hasWhitelist: boolean
        logging: boolean
        mappingPolicy: string
        middlewares: Array<Function>
        onBeforeCall?: onBeforeCall
        onAfterCall?: onAfterCall
        opts: any
        path: string
        whitelist: Array<string>
    }

    type onBeforeCall = (ctx: Context, route: Route, req: IncomingMessage, res: ServerResponse) => void
    type onAfterCall = (ctx: Context, route: Route, req: IncomingMessage, res: ServerResponse, data: any) => void

    class IncomingRequest extends IncomingMessage {
        $action: ActionSchema
        $alias: Alias
        $ctx: Context
        $endpoint: ActionEndpoint
        $next: any
        $params: any
        $route: Route
        $service: Service
        $startTime: Array<number>
    }

    class GatewayResponse extends ServerResponse {
        $ctx: Context
        $route: Route
        $service: Service
    }

    const ApiGatewayService: ServiceSchema & { Errors: ApiGatewayErrors, IncomingRequest: IncomingRequest, GatewayResponse: GatewayResponse };
    export = ApiGatewayService;
}
