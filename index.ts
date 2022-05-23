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

	public get(key: string): string;

	public get(): TypedMap;

	public get(key?: string): string | TypedMap {}

	public set(key: string, value: string | number, attributes?: Attributes): void;

	public set(object: TypedMap<string | number | ValueEntry>): void;

	public set(a: any, b?: string | number, attributes?: Attributes): void {}

	public unset(key: string): void {}

	public clean(): void {}

	public toString(): string {}

	public static parse(data: string): TypedMap {}

	public static stringify(data: TypedMap<string | number | ValueEntry>, asHeader: boolean = true): string {}
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

/** Simple wrap around generic type {[key: string]: <type>} */
type TypedMap<T = string> = {[key: string]: T}

/** Cookie attributes plus value field */
type ValueEntry = Attributes & {value: string | number}

const DEFAULT_ATTRIBUTES: Attributes = {
	path: "/"
};

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
export function get(): TypedMap;

export function get(key?: string): string | TypedMap {
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
export function set(object: TypedMap<string | number | ValueEntry>): void;

export function set(a: any, b?: string | number, attributes?: Attributes): void {
	if (typeof a === "string")
		setForKey(a, b, attributes);
	else
		setAsMap(a);
}

/**
 * Deletes cookie by provided key
 * @param key Key by which cookie should be removed
 */
export function unset(key: string): void {
	let zeroDate = new Date;
	zeroDate.setTime(0);
	document.cookie = `${encodeURIComponent(key)}=;expires=${zeroDate.toUTCString()};path=/`;
}

/**
 * Tries to delete all cookies in page (or domain)
 */
export function clean(): void {
	for (let key in getAll())
		unset(key);
}

/**
 * Parses cookie string into a key-value object.
 * @param data Cookie string.
 * @returns Parsed object. If the string contains key with empty value, then the result will contain that entry with
 *          empty value. If the string contains entry with empty value, then the result will not contain that entry.
 */
export function parse(data: string): TypedMap {
	const pairs: string[] = data.trim().split(/\s*;\s*/g).filter(pair => pair.length);
	const result: TypedMap = {};
	for (let pair of pairs) {
		let [key, value] = pair.split("=").map(entry => entry.trim());
		if (!key)
			continue;
		result[decodeURIComponent(key)] = decodeURIComponent(value);
	}
	return result;
}

/**
 * Stringifies map of cookies.
 * @param data Data to be stringified.
 * @param asHeader If `true` the result will be an array of cookie headers ready to be used in "Set-Cookie" header.
 * @return Stringified cookie.
 */
export function stringify(data: TypedMap<string | number | ValueEntry>, asHeader: boolean = true): string[] {
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

function getAll(): TypedMap {
	return parse(document.cookie);
}

function setForKey(key: string, value: string | number, attributes?: Attributes): void {
	document.cookie = stringifyEntry(key, {...attributes, value}, ";");
}

function setAsMap(object: TypedMap<string | number | ValueEntry>): void {
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
