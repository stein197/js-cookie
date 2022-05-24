import type {Nullable, ObjectMap} from "@stein197/ts-util";

const DATE_ZERO = "Thu, 01 Jan 1970 00:00:00 GMT";
const DEFAULT_ATTRIBUTES: Attributes = {
	path: "/"
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

	public get(key: string): Nullable<string>;

	public get(): ObjectMap<string>;

	public get(key?: string): ObjectMap<string> | Nullable<string> {}

	public set(key: string, value: string, attributes?: Attributes): void;

	public set(object: ObjectMap<string | ValueEntry>): void;

	public set(a: any, b?: any, attributes?: any): void {}

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
	 * Parses cookie string into a key-value object.
	 * @param data Cookie string.
	 * @returns Parsed object. If the string contains key with empty value, then the result will contain that entry with
	 *          empty value.
	 */
	public static parse(data: string): ObjectMap {
		return data
			.trim()
			.split(/\s*;\s*/g)
			.map(pair => pair.split("="))
			.filter(pair => pair[1])
			.map(pair => pair
				.map(s => decodeURIComponent(s)))
			.reduce((prev, cur) => prev[cur[0]] = cur[1], {} as any);
	}

	public static stringify(data: ObjectMap<string | ValueEntry>): string {}
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
 type Attributes = Partial<{
	/** Path to location this cookie is available. By default is `/` */
	path: string,
	/** At which date cookie expires */
	expires: string | Date,
	/** Max age of cookie in seconds */
	maxAge: number,
	/** Domain within which the cookie is available */
	domain: string,
	secure: boolean,
	samesite: boolean,
	httponly: boolean
}>

/** Cookie attributes plus value field */
type ValueEntry = Attributes & {value: string | number}

/**
 * Returns single cookie entry
 * @param key Cookie's key which value should be returned
 * @returns Cookie value or `null` if value
 *          associated with {@link key} does not exist
 */
export function get(key: string): string;

/**
 * Returns all the cookies stored in current location
 */
export function get(): ObjectMap<string>;

export function get(key?: string): Nullable<string> | ObjectMap<string> {
	if (!document.cookie)
		return key ? null : {};
	return key ? getByKey(key) : getAll();
}

/**
 * Sets cookie's value with key `key`
 * @param key Which cookie should ba changed
 * @param value New value
 * @param attributes Additional attributes
 */
export function set(key: string, value: string | number, attributes?: Attributes): void;

/**
 * Sets cookies as map
 * @param object Map-like object. Values could be a string or cookie descriptor
 */
export function set(object: ObjectMap<string | number | ValueEntry>): void;

export function set(a: any, b?: string | number, attributes?: Attributes): void {
	if (typeof a === "string")
		setForKey(a, b, attributes);
	else
		setAsMap(a);
}

/**
 * Stringifies map of cookies.
 * @param data Data to be stringified.
 * @param asHeader If `true` the result will be an array of cookie headers ready to be used in "Set-Cookie" header.
 * @return Stringified cookie.
 */
export function stringify(data: ObjectMap<string | number | ValueEntry>, asHeader: boolean = true): string[] {
	const result: string[] = [];
	const delimiter: string = asHeader ? "; " : ";";
	for (const key in data) {
		if (!key)
			continue;
		result.push(stringifyEntry(key, data[key], delimiter));
	}
	return result;
}

function getByKey(key: string): string {
	for (const [k, v] of Object.entries(parse(document.cookie)))
		if (k === key)
			return v;
	return null;
}

function getAll(): ObjectMap<string> {
	return parse(document.cookie);
}

function setForKey(key: string, value: string | number, attributes?: Attributes): void {
	document.cookie = stringifyEntry(key, {...attributes, value}, ";");
}

function setAsMap(object: ObjectMap<string | number | ValueEntry>): void {
	for (const key in object) {
		const entry = object[key];
		if (isSimple(entry))
			setForKey(key, entry);
		else
			setForKey(key, entry.value, entry);
	}
}

function prop2attr(prop: string): string {
	return prop.split(/(?=[A-Z])/g).join("-");
}

function stringifyEntry(key: string, entry: string | number | ValueEntry, delimiter: string): string {
	const attributes: Attributes = isSimple(entry) ? DEFAULT_ATTRIBUTES : {...DEFAULT_ATTRIBUTES, ...entry};
	delete (attributes as ValueEntry).value;
	const value: string | number = isSimple(entry) ? entry : entry.value;
	let result: string[] = [
		`${encodeURIComponent(key)}=${encodeURIComponent(value)}`
	];
	for (const prop in attributes) {
		const attrValue: string | number | boolean | Date = attributes[prop];
		const attrName: string = prop2attr(prop);
		if (isSimple(attrValue))
			result.push(`${attrName}=${attrValue}`);
		else if (attrValue instanceof Date)
			result.push(`${attrName}=${attrValue.toUTCString()}`);
		else
			result.push(attrName);
	}
	return result.join(delimiter);
}

function isSimple(obj): obj is string | number {
	const type: string = typeof obj;
	return type === "string" || type === "number";
}
