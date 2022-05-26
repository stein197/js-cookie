import type {Nullable, ObjectMap} from "@stein197/ts-util";

const DATE_ZERO = "Thu, 01 Jan 1970 00:00:00 GMT";
const DEFAULT_ATTRIBUTES: Attributes = {
	path: "/"
}
const ATTR_MAP: {[K in keyof Required<Attributes>]: {DOM: string; HTTP: string}} = {
	path: {
		DOM: "path",
		HTTP: "Path"
	},
	expires: {
		DOM: "expires",
		HTTP: "Expires"
	},
	maxAge: {
		DOM: "max-age",
		HTTP: "Max-Age"
	},
	domain: {
		DOM: "domain",
		HTTP: "Domain"
	},
	secure: {
		DOM: "secure",
		HTTP: "Secure"
	},
	sameSite: {
		DOM: "samesite",
		HTTP: "SameSite"
	},
	httpOnly: {
		DOM: "httponly",
		HTTP: "HttpOnly"
	},
}

export default class Cookie {

	/**
	 * Checks if cookie are enabled in a browser.
	 * @returns `true` if cookies are enabled in browser.
	 */
	public get enabled(): boolean {
		const defaultView = this.document.defaultView;
		if (defaultView?.navigator && "cookieEnabled" in defaultView.navigator)
			return defaultView.navigator.cookieEnabled;
		this.set("__cookie", "true");
		const exists = this.get("__cookie") === "true";
		this.unset("__cookie");
		return exists;
	}

	public constructor(private readonly document: Document) {}

	/**
	 * Returns single cookie entry.
	 * @param key Cookie's key which value should be returned.
	 * @returns Cookie value or `null` if value associated with the key does not exist.
	 */
	public get(key: string): Nullable<string>;

	/**
	 * Returns all cookies.
	 */
	public get(): ObjectMap<string>;

	public get(key?: string): ObjectMap<string> | Nullable<string> {
		if (!document.cookie)
			return key ? null : {};
		if (!key)
			return Cookie.parse(this.document.cookie);
		for (const [k, v] of Object.entries(Cookie.parse(this.document.cookie)))
			if (k === key)
				return v;
		return null;
	}

	/**
	 * Sets cookie's value with key `key`
	 * @param key Which cookie should ba changed
	 * @param value New value
	 * @param attributes Additional attributes
	 */
	public set(key: string, value: string, attributes?: Attributes): void;

	/**
	 * Sets cookies as map
	 * @param object Map-like object. Values could be a string or cookie descriptor
	 */
	public set(object: ObjectMap<string | Attributes<true>>): void;

	public set(a: string | ObjectMap<string | Attributes<true>>, b?: string, attributes?: Attributes): void {
		const data = typeof a === "string" ? {
			[a]: {
				...attributes,
				value: b!
			}
		} : a;
		for (const key in data) {
			const entry = data[key];
			const value = typeof entry === "string" ? entry : entry.value;
			this.document.cookie = Cookie.stringify(key, value, attributes);
		}
	}

	/**
	 * Deletes cookie by provided key.
	 * @param key Key by which cookie should be removed.
	 * @param attributes Attributes.
	 */
	public unset(key: string, attributes: Attributes = DEFAULT_ATTRIBUTES): void {
		this.set(key, "", {
			...mergeAttributes(attributes),
			expires: DATE_ZERO
		});
	}
	
	/**
	 * Tries to delete all cookies in page (or domain)
	 */
	public clean(): void {
		Object.keys(this.get()).forEach(key => this.unset(key));
	}

	public toString(): string {
		return this.document.cookie;
	}

	/**
	 * Parses cookie DOM string into a key-value object.
	 * @param data Cookie string.
	 * @returns Parsed object.
	 */
	public static parse(data: string): ObjectMap<string> {
		return data
			.trim()
			.split(/\s*;\s*/g)
			.map(pair => pair.split("="))
			.filter(pair => pair[1])
			.map(pair => pair
				.map(s => decodeURIComponent(s)))
			.reduce((prev, cur) => prev[cur[0]] = cur[1], {} as any);
	}

	/**
	 * Stringifies map of cookies.
	 * @param key Which cookie should ba changed
	 * @param value New value
	 * @param attributes Data to be stringified.
	 * @param http
	 * @return Stringified cookie.
	 */
	public static stringify(key: string, value: string, attributes?: Attributes, http?: boolean): string {
		const result = [
			`${encodeURIComponent(key)}=${encodeURIComponent(value)}`
		];
		if (attributes)
			for (const [k, v] of Object.entries(attributes) as [keyof Attributes, any][]) {
				const kName = ATTR_MAP[k][http ? "HTTP" : "DOM"];
				const vType = typeof v;
				if (v === true)
					result.push(kName);
				else if (v instanceof Date)
					result.push(`${kName}=${v.toUTCString()}`);
				else if (vType === "number" || vType === "string")
					result.push(`${kName}=${v}`);
			}
		return result.join("; ");
	}
}

function mergeAttributes(a: Attributes): Attributes {
	return a === DEFAULT_ATTRIBUTES ? a : {
		...DEFAULT_ATTRIBUTES,
		...a
	};
}

/**
 * Represent cookie's additional attributes
 */
type Attributes<IncludeValue extends boolean = false> = Partial<{
	/** Path to location this cookie is available. By default is `/` */
	path: string;
	/** At which date cookie expires */
	expires: string | Date;
	/** Max age of cookie in seconds */
	maxAge: number;
	/** Domain within which the cookie is available */
	domain: string;
	secure: boolean;
	sameSite: "Strict" | "Lax" | "None";
	httpOnly: boolean;
}> & (IncludeValue extends true ? {value: string} : {})
