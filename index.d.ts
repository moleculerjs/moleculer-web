declare module "moleculer-web" {
    import { Errors, ServiceSchema } from "moleculer";
    class InvalidRequestBodyError extends Errors.MoleculerError { constructor(body: any, error: any) }
    class InvalidResponseTypeError extends Errors.MoleculerError { constructor(dataType: string) }
    class UnAuthorizedError extends Errors.MoleculerError { constructor(type: string|null|undefined, data: any) }
    class ForbiddenError extends Errors.MoleculerError { constructor(type: string, data: any) }
    class BadRequestError extends Errors.MoleculerError { constructor(type: string, data: any) }
    class RateLimitExceeded extends Errors.MoleculerClientError { constructor(type: string, data: any) }

    interface ApiGatewayErrors {
        InvalidRequestBodyError: typeof InvalidRequestBodyError;
        InvalidResponseTypeError: typeof InvalidResponseTypeError;
        UnAuthorizedError: typeof UnAuthorizedError;
        ForbiddenError: typeof ForbiddenError;
        BadRequestError: typeof BadRequestError;
        RateLimitExceeded: typeof RateLimitExceeded;

        ERR_NO_TOKEN: "ERR_NO_TOKEN";
        ERR_INVALID_TOKEN: "ERR_INVALID_TOKEN";
        ERR_UNABLE_DECODE_PARAM: "ERR_UNABLE_DECODE_PARAM";
    }

    const ApiGatewayService: ServiceSchema & { Errors: ApiGatewayErrors };
    export = ApiGatewayService;
}
