export const get = (k, d = {}) => {
	let v = localStorage.getItem(k);
	if (typeof d !== 'object') {
		return v;
	}
	try {
		return JSON.parse(v || JSON.stringify(d));
	} catch (e) {
		return v;
	}
};
export const set = (k, v) => localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v));
export const del = (k) => localStorage.removeItem(k);

export function ab2str(buf) {
	return Buffer.from(buf).toString('base64')
}
export function str2ab(str) {
	return new Uint8Array(Buffer.from(str, 'base64'))
}