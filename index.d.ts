declare module "moleculer-web" {
	import { Errors, ServiceSchema, Context, ActionEndpoint, Service, ActionSchema, CallingOptions } from 'moleculer'
	import { IncomingMessage, ServerResponse } from "http"


	/**
	 * DefinitelyTyped body-parser
	 * @see https://github.com/DefinitelyTyped/DefinitelyTyped/blob/master/types/body-parser/index.d.ts#L24
	 */
	namespace BodyParser {
		interface Options {
			/** When set to true, then deflated (compressed) bodies will be inflated; when false, deflated bodies are rejected. Defaults to true. */
			inflate?: boolean | undefined;
			/**
			 * Controls the maximum request body size. If this is a number,
			 * then the value specifies the number of bytes; if it is a string,
			 * the value is passed to the bytes library for parsing. Defaults to '100kb'.
			 */
			limit?: number | string | undefined;
			/**
			 * The type option is used to determine what media type the middleware will parse
			 */
			type?: string | string[] | ((req: IncomingMessage) => any) | undefined;

			/**
			 * The verify option, if supplied, is called as verify(req, res, buf, encoding),
			 * where buf is a Buffer of the raw request body and encoding is the encoding of the request.
			 */
			verify?(req: IncomingMessage, res: ServerResponse, buf: Buffer, encoding: string): void;
		}

		interface OptionsJson extends Options {
			/**
			 *
			 * The reviver option is passed directly to JSON.parse as the second argument.
			 */
			reviver?(key: string, value: any): any;

			/**
			 * When set to `true`, will only accept arrays and objects;
			 * when `false` will accept anything JSON.parse accepts. Defaults to `true`.
			 */
			strict?: boolean | undefined;
		}

		interface OptionsText extends Options {
			/**
			 * Specify the default character set for the text content if the charset
			 * is not specified in the Content-Type header of the request.
			 * Defaults to `utf-8`.
			 */
			defaultCharset?: string | undefined;
		}

		interface OptionsUrlencoded extends Options {
			/**
			 * The extended option allows to choose between parsing the URL-encoded data
			 * with the querystring library (when `false`) or the qs library (when `true`).
			 */
			extended?: boolean | undefined;
			/**
			 * The parameterLimit option controls the maximum number of parameters
			 * that are allowed in the URL-encoded data. If a request contains more parameters than this value,
			 * a 413 will be returned to the client. Defaults to 1000.
			 */
			parameterLimit?: number | undefined;
		}
	}

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
	type onAfterCall = (ctx: Context, route: Route, req: IncomingMessage, res: ServerResponse, data: any) => any

	/**
	 * Expressjs next function<br>
	 * /@types/express-serve-static-core/index.d.ts:36
	 * @see https://www.npmjs.com/package/@types/express-serve-static-core
	 */
	interface NextFunction {
		(err?: any): void;
		/**
		 * "Break-out" of a router by calling {next('router')};
		 * @see {https://expressjs.com/en/guide/using-middleware.html#middleware.router}
		 */
		(deferToNext: 'router'): void;
		/**
		 * "Break-out" of a route by calling {next('route')};
		 * @see {https://expressjs.com/en/guide/using-middleware.html#middleware.application}
		 */
		(deferToNext: 'route'): void;
	}


	type routeMiddleware = (req: IncomingMessage, res: ServerResponse, next: NextFunction) => void
	type routeMiddlewareError = (err: any, req: IncomingMessage, res: ServerResponse, next: NextFunction) => void

	type bodyParserOptions = {
		json?: BodyParser.OptionsJson | boolean
		urlencoded?: BodyParser.OptionsUrlencoded | boolean
		text?: BodyParser.OptionsText | boolean
		raw?: BodyParser.Options | boolean
	}
	export type RouteSchema = {
		/**
		 * You can use alias names instead of action names. You can also specify the method. Otherwise it will handle every method types.<br>
		 * Using named parameters in aliases is possible. Named parameters are defined by prefixing a colon to the parameter name (:name).
		 * @see https://moleculer.services/docs/0.14/moleculer-web.html#Aliases
		 */
		aliases: boolean
		/**
		 * To enable the support for authentication, you need to do something similar to what is describe in the Authorization paragraph.<br>
		 * Also in this case you have to:
		 * 1. Set `authentication: true` in your routes
		 * 2. Define your custom authenticate method in your service
		 * 3. The returned value will be set to the `ctx.meta.user` property. You can use it in your actions to get the logged in user entity.
		 * @see https://moleculer.services/docs/0.14/moleculer-web.html#Authentication
		 */
		authentication: boolean
		/**
		 * You can implement authorization. Do 2 things to enable it.
		 * 1. Set authorization: true in your routes
		 * 2. Define the authorize method in service.
		 * @see https://moleculer.services/docs/0.14/moleculer-web.html#Authorization
		 */
		authorization: boolean
		/**
		 * The auto-alias feature allows you to declare your route alias directly in your services.<br>
		 * The gateway will dynamically build the full routes from service schema.
		 * Gateway will regenerate the routes every time a service joins or leaves the network.<br>
		 * Use `whitelist` parameter to specify services that the Gateway should track and build the routes.
		 * @see https://moleculer.services/docs/0.14/moleculer-web.html#Auto-alias
		 */
		autoAliases: boolean
		/**
		 * Parse incoming request bodies, available under the `ctx.params` property
		 * @see https://www.npmjs.com/package/body-parser
		 */
		bodyParsers?: bodyParserOptions | boolean
		/**
		 * The route has a callOptions property which is passed to broker.call. So you can set timeout, retries or fallbackResponse options for routes.
		 * @see https://moleculer.services/docs/0.14/actions.html#Call-services
		 */
		callingOptions: CallingOptions
		/**
		 * Enable/disable logging
		 */
		logging: boolean
		/**
		 * The route has a `mappingPolicy` property to handle routes without aliases.<br>
		 * Available options:<br>
		 * `all` - enable to request all routes with or without aliases (default)<br>
		 * `restrict` - enable to request only the routes with aliases.
		 * @see https://moleculer.services/docs/0.14/moleculer-web.html#Mapping-policy
		 */
		mappingPolicy: 'all' | 'restrict'
		/**
		 * To disable parameter merging set `mergeParams: false` in route settings.<br>
		 * Default is `true`
		 * @see https://moleculer.services/docs/0.14/moleculer-web.html#Disable-merging
		 */
		mergeParams?: boolean
		/**
		 * The route has before & after call hooks. You can use it to set `ctx.meta`, access `req.headers` or modify the response data.
		 * @see https://moleculer.services/docs/0.14/moleculer-web.html#Route-hooks
		 */
		onBeforeCall: onBeforeCall
		/**
		 * You could manipulate the data in `onAfterCall`.<br>
		 * `Must always return the new or original data`.
		 * @see https://moleculer.services/docs/0.14/moleculer-web.html#Route-hooks
		 */
		onAfterCall: onAfterCall
		/**
		 * You can add route-level & global-level custom error handlers.<br>
		 * In handlers, you must call the `res.end`. Otherwise, the request is unhandled.
		 * @see https://moleculer.services/docs/0.14/moleculer-web.html#Error-handlers
		 */
		onError: (req: IncomingMessage, res: ServerResponse, error: Error) => void
		/**
		 * the root path that this route handles
		 */
		path: string
		/**
		 * If you don’t want to publish all actions, you can filter them with whitelist option.<br>
		 * Use match strings or regexp in list. To enable all actions, use "**" item.<br>
		 * "posts.*": `Access any actions in 'posts' service`<br>
		 * "users.list": `Access call only the 'users.list' action`<br>
		 * /^math\.\w+$/: `Access any actions in 'math' service`<br>
		 * @see https://moleculer.services/docs/0.14/moleculer-web.html#Whitelist
		 */
		whitelist?: Array<string|RegExp>
		/**
		 * It supports Connect-like middlewares in global-level, route-level & alias-level.<br>
		 * Signature: function (req, res, next) {...}.<br>
		 * Signature: function (err, req, res, next) {...}.<br>
		 * For more info check [express middleware](https://expressjs.com/en/guide/using-middleware.html)
		 * @see https://moleculer.services/docs/0.14/moleculer-web.html#Middlewares
		 */
		use?: Array<routeMiddleware | routeMiddlewareError>
	}

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
	export default ApiGatewayService;
}
