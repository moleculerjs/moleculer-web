declare module "moleculer-web" {
	import { IncomingMessage, ServerResponse } from "http";
	import type {
		ActionEndpoint,
		ActionSchema,
		CallingOptions,
		Context,
		LogLevels,
		Service,
		ServiceBroker,
		ServiceSchema,
	} from "moleculer";
	import { Errors } from "moleculer";
	import { IParseOptions } from 'qs';
	import type { Server as NetServer } from 'net';
	import type { Server as TLSServer } from 'tls';
	import type { Server as HttpServer } from 'http';
	import type { Server as HttpsServer } from 'https';
	import type { Http2SecureServer, Http2Server } from 'http2';


	// RateLimit
	export type generateRateLimitKey = (req: IncomingMessage) => string;

	export interface RateLimitSettings {
		/**
		 * How long to keep record of requests in memory (in milliseconds).
		 * @default 60000 (1 min)
		 */
		window?: number;

		/**
		 * Max number of requests during window.
		 * @default 30
		 */
		limit?: number;

		/**
		 * Set rate limit headers to response.
		 * @default false
		 */
		headers?: boolean;

		/**
		 * Function used to generate keys.
		 * @default req => req.headers["x-forwarded-for"] || req.connection.remoteAddress || req.socket.remoteAddress || req.connection.socket.remoteAddress
		 */
		key?: generateRateLimitKey;

		/**
		 * use rate limit Custom Store
		 * @default MemoryStore
		 * @see https://moleculer.services/docs/0.14/moleculer-web.html#Custom-Store-example
		 */
		StoreFactory?: typeof RateLimitStore;
	}

	export abstract class RateLimitStore {
		resetTime: number;
		constructor(clearPeriod: number, opts?: RateLimitSettings, broker?: ServiceBroker);
		inc(key: string): number | Promise<number>;
	}

	export interface RateLimitStores {
		MemoryStore: typeof MemoryStore;
	}

	class MemoryStore extends RateLimitStore {
		constructor(clearPeriod: number, opts?: RateLimitSettings, broker?: ServiceBroker);

		/**
		 * Increment the counter by key
		 */
		inc(key: string): number;

		/**
		 * Reset all counters
		 */
		reset(): void;
	}

	// bodyParserOptions
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

	type bodyParserOptions = {
		json?: BodyParser.OptionsJson | boolean;
		urlencoded?: BodyParser.OptionsUrlencoded | boolean;
		text?: BodyParser.OptionsText | boolean;
		raw?: BodyParser.Options | boolean;
	};

	// BusboyConfig
	namespace busboy {
		interface BusboyConfig {
			headers?: any;
			highWaterMark?: number | undefined;
			fileHwm?: number | undefined;
			defCharset?: string | undefined;
			preservePath?: boolean | undefined;
			limits?:
				| {
						fieldNameSize?: number | undefined;
						fieldSize?: number | undefined;
						fields?: number | undefined;
						fileSize?: number | undefined;
						files?: number | undefined;
						parts?: number | undefined;
						headerPairs?: number | undefined;
				  }
				| undefined;
		}

		interface Busboy extends NodeJS.WritableStream {
			on(
				event: "field",
				listener: (
					fieldname: string,
					val: any,
					fieldnameTruncated: boolean,
					valTruncated: boolean,
					encoding: string,
					mimetype: string,
				) => void,
			): this;
			on(
				event: "file",
				listener: (
					fieldname: string,
					file: NodeJS.ReadableStream,
					filename: string,
					encoding: string,
					mimetype: string,
				) => void,
			): this;
			on(event: "finish", callback: () => void): this;
			on(event: "partsLimit", callback: () => void): this;
			on(event: "filesLimit", callback: () => void): this;
			on(event: "fieldsLimit", callback: () => void): this;
			on(event: string, listener: Function): this;
		}
	}

	type onEventBusboyConfig<T> = (busboy: busboy.Busboy, alias: T, service: Service) => void;
	type BusboyConfig<T> = busboy.BusboyConfig & {
		onFieldsLimit?: T;
		onFilesLimit?: T;
		onPartsLimit?: T;
	};

	// AssetsConfig
	// From: https://github.com/DefinitelyTyped/DefinitelyTyped/blob/master/types/serve-static/index.d.ts
	interface ServeStaticOptions {
		/**
		 * Enable or disable setting Cache-Control response header, defaults to true.
		 * Disabling this will ignore the immutable and maxAge options.
		 */
		cacheControl?: boolean | undefined;

		/**
		 * Set how "dotfiles" are treated when encountered. A dotfile is a file or directory that begins with a dot (".").
		 * Note this check is done on the path itself without checking if the path actually exists on the disk.
		 * If root is specified, only the dotfiles above the root are checked (i.e. the root itself can be within a dotfile when when set to "deny").
		 * The default value is 'ignore'.
		 * 'allow' No special treatment for dotfiles
		 * 'deny' Send a 403 for any request for a dotfile
		 * 'ignore' Pretend like the dotfile does not exist and call next()
		 */
		dotfiles?: string | undefined;

		/**
		 * Enable or disable etag generation, defaults to true.
		 */
		etag?: boolean | undefined;

		/**
		 * Set file extension fallbacks. When set, if a file is not found, the given extensions will be added to the file name and search for.
		 * The first that exists will be served. Example: ['html', 'htm'].
		 * The default value is false.
		 */
		extensions?: string[] | false | undefined;

		/**
		 * Let client errors fall-through as unhandled requests, otherwise forward a client error.
		 * The default value is true.
		 */
		fallthrough?: boolean | undefined;

		/**
		 * Enable or disable the immutable directive in the Cache-Control response header.
		 * If enabled, the maxAge option should also be specified to enable caching. The immutable directive will prevent supported clients from making conditional requests during the life of the maxAge option to check if the file has changed.
		 */
		immutable?: boolean | undefined;

		/**
		 * By default this module will send "index.html" files in response to a request on a directory.
		 * To disable this set false or to supply a new index pass a string or an array in preferred order.
		 */
		index?: boolean | string | string[] | undefined;

		/**
		 * Enable or disable Last-Modified header, defaults to true. Uses the file system's last modified value.
		 */
		lastModified?: boolean | undefined;

		/**
		 * Provide a max-age in milliseconds for http caching, defaults to 0. This can also be a string accepted by the ms module.
		 */
		maxAge?: number | string | undefined;

		/**
		 * Redirect to trailing "/" when the pathname is a dir. Defaults to true.
		 */
		redirect?: boolean | undefined;

		/**
		 * Function to set custom headers on response. Alterations to the headers need to occur synchronously.
		 * The function is called as fn(res, path, stat), where the arguments are:
		 * res the response object
		 * path the file path that is being sent
		 * stat the stat object of the file that is being sent
		 */
		setHeaders?: ((res: ServerResponse, path: string, stat: any) => any) | undefined;
	}

	type AssetsConfig = {
		/**
		 * Root folder of assets
		 */
		folder: string;
		/**
		 * Further options to `server-static` module
		 */
		options?: ServeStaticOptions;
	};

	// CorsOptions
	// From: https://github.com/DefinitelyTyped/DefinitelyTyped/blob/master/types/cors/index.d.ts
	type CustomOrigin = (origin: string) => boolean;

	export interface CorsOptions {
		origin?: boolean | string | RegExp | (string | RegExp)[] | CustomOrigin;
		methods?: string | string[];
		allowedHeaders?: string | string[];
		exposedHeaders?: string | string[];
		credentials?: boolean;
		maxAge?: number;
		preflightContinue?: boolean;
		optionsSuccessStatus?: number;
	}

	class InvalidRequestBodyError extends Errors.MoleculerError {
		constructor(body: any, error: any);
	}
	class InvalidResponseTypeError extends Errors.MoleculerError {
		constructor(dataType: string);
	}
	class UnAuthorizedError extends Errors.MoleculerError {
		constructor(type: string | null | undefined, data: any);
	}
	class ForbiddenError extends Errors.MoleculerError {
		constructor(type: string, data: any);
	}
	class BadRequestError extends Errors.MoleculerError {
		constructor(type: string, data: any);
	}
	class RateLimitExceeded extends Errors.MoleculerClientError {
		constructor(type: string, data: any);
	}
	class NotFoundError extends Errors.MoleculerClientError {
		constructor(type: string, data: any);
	}
	class ServiceUnavailableError extends Errors.MoleculerError {
		constructor(type: string, data: any);
	}

	export interface ApiGatewayErrors {
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

	export class Alias {
		_generated: boolean;
		service: Service;
		route: Route;
		type: string;
		method: string;
		path: string;
		handler: null | Function[];
		action: string;
	}

	export class Route {
		callOptions: any;
		cors: CorsOptions;
		etag: boolean | "weak" | "strong" | Function;
		hasWhitelist: boolean;
		hasBlacklist: boolean;
		logging: boolean;
		mappingPolicy: string;
		middlewares: Function[];
		onBeforeCall?: onBeforeCall;
		onAfterCall?: onAfterCall;
		opts: any;
		path: string;
		whitelist: string[];
		blacklist: string[];
	}

	type onBeforeCall = (
		ctx: Context,
		route: Route,
		req: IncomingRequest,
		res: GatewayResponse,
	) => void;
	type onAfterCall = (
		ctx: Context,
		route: Route,
		req: IncomingRequest,
		res: GatewayResponse,
		data: any,
	) => any;

	/**
	 * Expressjs next function<br>
	 * /@types/express-serve-static-core/index.d.ts:36
	 * @see https://www.npmjs.com/package/@types/express-serve-static-core
	 */
	interface NextFunction {
		(err?: any): void;
		/**
		 * "Break-out" of a router by calling {next('router')};
		 * @see https://expressjs.com/en/guide/using-middleware.html#middleware.router
		 */
		(deferToNext: "router"): void;
		/**
		 * "Break-out" of a route by calling {next('route')};
		 * @see https://expressjs.com/en/guide/using-middleware.html#middleware.application
		 */
		(deferToNext: "route"): void;
	}

	type routeMiddleware = (req: IncomingRequest, res: GatewayResponse, next: NextFunction) => void;
	type routeMiddlewareError = (
		err: any,
		req: IncomingRequest,
		res: GatewayResponse,
		next: NextFunction,
	) => void;

	type ETagFunction = (body: any) => string;
	type AliasFunction = (
		req: IncomingRequest,
		res: GatewayResponse,
		next?: (err?: any) => void,
	) => void;
	type AliasRouteSchema = {
		type?: "call" | "multipart" | "stream" | string;
		method?: "GET" | "POST" | "PUT" | "DELETE" | "*" | "HEAD" | "OPTIONS" | "PATCH" | string;
		path?: string;
		handler?: AliasFunction;
		action?: string;
		busboyConfig?: BusboyConfig<onEventBusboyConfig<Alias>>;
		[k: string]: any;
	};

	type CommonSettingSchema = {
		/**
		 * Cross-origin resource sharing configuration (using module [cors](https://www.npmjs.com/package/cors))<br>
		 * @example {
			// Configures the Access-Control-Allow-Origin CORS header.
			origin: "*", // ["http://localhost:3000", "https://localhost:4000"],
			// Configures the Access-Control-Allow-Methods CORS header.
			methods: ["GET", "OPTIONS", "POST", "PUT", "DELETE"],
			// Configures the Access-Control-Allow-Headers CORS header.
			allowedHeaders: [],
			// Configures the Access-Control-Expose-Headers CORS header.
			exposedHeaders: [],
			// Configures the Access-Control-Allow-Credentials CORS header.
			credentials: false,
			// Configures the Access-Control-Max-Age CORS header.
			maxAge: 3600
		}
		 * @see https://moleculer.services/docs/0.14/moleculer-web.html#CORS-headers
		 */
		cors?: CorsOptions;
		/**
		 * The etag option value can be `false`, `true`, `weak`, `strong`, or a custom `Function`
		 * @default settings.etag (null)
		 * @see https://moleculer.services/docs/0.14/moleculer-web.html#ETag
		 */
		etag?: boolean | "weak" | "strong" | ETagFunction;
		/**
		 * You can add route-level & global-level custom error handlers.<br>
		 * In handlers, you must call the `res.end`. Otherwise, the request is unhandled.
		 * @see https://moleculer.services/docs/0.14/moleculer-web.html#Error-handlers
		 */
		onError?: (req: IncomingRequest, res: ServerResponse, error: Error) => void;
		/**
		 * The Moleculer-Web has a built-in rate limiter with a memory store.
		 * @see https://moleculer.services/docs/0.14/moleculer-web.html#Rate-limiter
		 */
		rateLimit?: RateLimitSettings;
		/**
		 * It supports Connect-like middlewares in global-level, route-level & alias-level.<br>
		 * Signature: function (req, res, next) {...}.<br>
		 * Signature: function (err, req, res, next) {...}.<br>
		 * For more info check [express middleware](https://expressjs.com/en/guide/using-middleware.html)
		 * @see https://moleculer.services/docs/0.14/moleculer-web.html#Middlewares
		 */
		use?: (routeMiddleware | routeMiddlewareError)[];
	};
	export interface ApiRouteSchema extends CommonSettingSchema {
		/**
		 * You can use alias names instead of action names. You can also specify the method. Otherwise it will handle every method types.<br>
		 * Using named parameters in aliases is possible. Named parameters are defined by prefixing a colon to the parameter name (:name).
		 * @see https://moleculer.services/docs/0.14/moleculer-web.html#Aliases
		 */
		aliases?: {
			[k: string]: string | AliasFunction | (AliasFunction | string)[] | AliasRouteSchema;
		};
		/**
		 * To enable the support for authentication, you need to do something similar to what is describe in the Authorization paragraph.<br>
		 * Also in this case you have to:
		 * 1. Set `authentication: true` in your routes
		 * 2. Define your custom authenticate method in your service
		 * 3. The returned value will be set to the `ctx.meta.user` property. You can use it in your actions to get the logged in user entity.
		 * <br>`From v0.10.3`: You can define custom `authentication` and `authorization` methods for every routes.
		 * In this case you should set `the method name` instead of `true` value.
		 * @see https://moleculer.services/docs/0.14/moleculer-web.html#Authentication
		 */
		authentication?: boolean | string;
		/**
		 * You can implement authorization. Do 2 things to enable it.
		 * 1. Set authorization: true in your routes.
		 * 2. Define the authorize method in service.
		 * <br>`From v0.10.3`: You can define custom `authentication` and `authorization` methods for every routes.
		 * In this case you should set `the method name` instead of `true` value.
		 * @see https://moleculer.services/docs/0.14/moleculer-web.html#Authorization
		 */
		authorization?: boolean | string;
		/**
		 * The auto-alias feature allows you to declare your route alias directly in your services.<br>
		 * The gateway will dynamically build the full routes from service schema.
		 * Gateway will regenerate the routes every time a service joins or leaves the network.<br>
		 * Use `whitelist` parameter to specify services that the Gateway should track and build the routes.
		 * And `blacklist` parameter to specify services that the Gateway should not track and build the routes.
		 * @see https://moleculer.services/docs/0.14/moleculer-web.html#Auto-alias
		 */
		autoAliases?: boolean;
		/**
		 * Parse incoming request bodies, available under the `ctx.params` property
		 * @see https://www.npmjs.com/package/body-parser
		 */
		bodyParsers?: bodyParserOptions | boolean;
		/**
		 * API Gateway has implemented file uploads.<br>
		 * You can upload files as a multipart form data (thanks to [busboy](https://github.com/mscdex/busboy) library) or as a raw request body.<br>
		 * In both cases, the file is transferred to an action as a Stream.<br>
		 * In multipart form data mode you can upload multiple files, as well.<br>
		 * `Please note`: you have to disable other body parsers in order to accept files.
		 */
		busboyConfig?: BusboyConfig<onEventBusboyConfig<Alias>>;
		/**
		 * The route has a callOptions property which is passed to broker.call. So you can set timeout, retries or fallbackResponse options for routes.
		 * @see https://moleculer.services/docs/0.14/actions.html#Call-services
		 */
		callOptions?: CallingOptions;
		/**
		 * If alias handler not found, `api` will try to call service by action name<br>
		 * This option will convert request url to camelCase before call action
		 * @example `/math/sum-all` => `math.sumAll`
		 * @default: null
		 */
		camelCaseNames?: boolean;
		/**
		 * Debounce wait time before call to regenerated aliases when got event "$services.changed"
		 * @default 500
		 */
		debounceTime?: number;
		/**
		 * Enable/disable logging
		 * @default true
		 */
		logging?: boolean;
		/**
		 * The route has a `mappingPolicy` property to handle routes without aliases.<br>
		 * Available options:<br>
		 * `all` - enable to request all routes with or without aliases (default)<br>
		 * `restrict` - enable to request only the routes with aliases.
		 * @see https://moleculer.services/docs/0.14/moleculer-web.html#Mapping-policy
		 */
		mappingPolicy?: "all" | "restrict";
		/**
		 * To disable parameter merging set `mergeParams: false` in route settings.<br>
		 * Default is `true`
		 * @see https://moleculer.services/docs/0.14/moleculer-web.html#Disable-merging
		 */
		mergeParams?: boolean;
		/**
		 * `From v0.10.2`
		 * <br>Support multiple routes with the same path.
		 * <br>You should give a unique name for the routes if they have same path.
		 * @see https://github.com/moleculerjs/moleculer-web/releases/tag/v0.10.2
		 */
		name?: string;
		/**
		 * The route has before & after call hooks. You can use it to set `ctx.meta`, access `req.headers` or modify the response data.
		 * @see https://moleculer.services/docs/0.14/moleculer-web.html#Route-hooks
		 */
		onBeforeCall?: onBeforeCall;
		/**
		 * You could manipulate the data in `onAfterCall`.<br>
		 * `Must always return the new or original data`.
		 * @see https://moleculer.services/docs/0.14/moleculer-web.html#Route-hooks
		 */
		onAfterCall?: onAfterCall;
		/**
		 * Path prefix to this route
		 */
		path: string;
		/**
		 * If you don’t want to publish all actions, you can filter them with whitelist option.<br>
		 * Use match strings or regexp in list. To enable all actions, use "**" item.<br>
		 * "posts.*": `Access any actions in 'posts' service`<br>
		 * "users.list": `Access call only the 'users.list' action`<br>
		 * /^math\.\w+$/: `Access any actions in 'math' service`<br>
		 * @see https://moleculer.services/docs/0.14/moleculer-web.html#Whitelist
		 */
		whitelist?: (string | RegExp)[];
		/**
		 * If you don’t want to publish all actions, you can filter them with blacklist option.<br>
		 * Use match strings or regexp in list. To enable all actions, use "**" item.<br>
		 * "posts.*": `Access any actions in 'posts' service`<br>
		 * "users.list": `Access call only the 'users.list' action`<br>
		 * /^math\.\w+$/: `Access any actions in 'math' service`<br>
		 * @see https://moleculer.services/docs/0.14/moleculer-web.html#Blacklist
		 */
		blacklist?: (string | RegExp)[];
	}

	type APISettingServer =
		| boolean
		| HttpServer
		| HttpsServer
		| Http2Server
		| Http2SecureServer
		| NetServer
		| TLSServer;

	export interface ApiSettingsSchema extends CommonSettingSchema {
		/**
		 * It serves assets with the [serve-static](https://github.com/expressjs/serve-static) module like ExpressJS.
		 * @see https://moleculer.services/docs/0.14/moleculer-web.html#Serve-static-files
		 */
		assets?: AssetsConfig;
		/**
		 * Use HTTP2 server (experimental)
		 * @default false
		 */
		http2?: boolean;

		/**
		 * HTTP Server Timeout
		 * @default null
		 */
		httpServerTimeout?: number;

		/**
		 * Special char for internal services<br>
		 * Note: `RegExp` type is not official
		 * @default "~"
		 * @example "~" => /~node/~action => /$node/~action
		 * @example /[0-9]+/g => /01234demo/hello2021 => /demo/hello `(not official)`
		 */
		internalServiceSpecialChar?: string | RegExp;

		/**
		 * Exposed IP
		 * @default process.env.IP || "0.0.0.0"
		 */
		ip?: string;

		/**
		 * If set to true, it will log 4xx client errors, as well
		 * @default false
		 */
		log4XXResponses?: boolean;

		/**
		 * Log each request (default to "info" level)
		 * @default "info"
		 */
		logRequest?: LogLevels | null;

		/**
		 * Log the request ctx.params (default to "debug" level)
		 * @default "debug"
		 */
		logRequestParams?: LogLevels | null;

		/**
		 * Log each response (default to "info" level)
		 * @default "info"
		 */
		logResponse?: LogLevels | null;

		/**
		 * Log the response data (default to disable)
		 * @default null
		 */
		logResponseData?: LogLevels | null;

		/**
		 * Log the route registration/aliases related activity
		 * @default "info"
		 */
		logRouteRegistration?: LogLevels | null;

		/**
		 * Optimize route order
		 * @default true
		 */
		optimizeOrder?: boolean;

		/**
		 * Global path prefix
		 */
		path?: string;
		/**
		 * Exposed port
		 * @default process.env.PORT || 3000
		 */
		port?: number;

		/**
		 * Gateway routes
		 * @default []
		 */
		routes?: ApiRouteSchema[];

		/**
		 * CallOption for the root action `api.rest`
		 * @default null
		 */
		rootCallOptions?: CallingOptions;

		/**
		 * Used server instance. If null, it will create a new HTTP(s)(2) server<br>
		 * If false, it will start without server in middleware mode
		 * @default true
		 */
		server?: APISettingServer;

		/**
		 * Options passed on to qs
		 * @see https://moleculer.services/docs/0.14/moleculer-web.html#Query-string-parameters
		 */
		qsOptions?: IParseOptions;

		/**
		 * for extra setting's keys
		 */
		[k: string]: any;
	}

	export class IncomingRequest extends IncomingMessage {
		$action: ActionSchema;
		$alias: Alias;
		$ctx: Context<{ req: IncomingMessage; res: ServerResponse; }>;
		$endpoint: ActionEndpoint;
		$next: any;
		$params: any;
		$route: Route;
		$service: Service;
		$startTime: number[];
		originalUrl: string;
		parsedUrl: string;
		query: Record<string, string>;
	}

	export class GatewayResponse extends ServerResponse {
		$ctx: Context;
		$route: Route;
		$service: Service;
		locals: Record<string, unknown>;
	}

	const ApiGatewayService: ServiceSchema & {
		Errors: ApiGatewayErrors;
		RateLimitStores: RateLimitStores;
	};
	export default ApiGatewayService;
}
