
export const hexToRgb = (hex, one = false, arr = false) => {
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	const ret = result ? {
		r: parseInt(result[1], 16) / (one ? 255 : 1),
		g: parseInt(result[2], 16) / (one ? 255 : 1),
		b: parseInt(result[3], 16) / (one ? 255 : 1),
	} : null;
	return arr ? Object.values(ret) : ret;
};