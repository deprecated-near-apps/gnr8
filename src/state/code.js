import JSON5 from 'json5';
import { contractId } from './near';

const paramLabels = ['mint', 'owner'];

export const loadCodeFromSrc = (id, src, args) => async ({ getState }) => {
	const { contractAccount } = getState()
	const { code, params } = getParams(src)
	if (args) {
		paramLabels.forEach((label) => {
			Object.entries(params[label]).forEach(([k], i) => {
				const arg = args[label][i]
				if (!arg) return
				params[label][k].default = arg
			});
		})
	}
	loadCode(id, contractAccount, code, params)
}


export const getParams = (code) => {
	const paramsMatch = code.match(/@params[^]+@params/g)[0];
	if (!paramsMatch) {
		return alert('Something wrong with @params. Do you have @params at the first and last line of your params?');
	}
	let params;
	try {
		params = JSON5.parse(paramsMatch.replaceAll('@params', ''));
	} catch (e) {
		return console.warn(e);
	}
	return { code: code.replace(paramsMatch, ''), params };
};

const iframeTemplate = `
    <!doctype html>
    <html lang="en">
    <head>@packages</head>
    <body>
        <script>@code</script>
    </body>
    </html>
`;

const packageCache = {};
export const loadCode = async (id, account, code, params) => {
	paramLabels.forEach((label) => Object.entries(params[label]).forEach(([k, v]) =>
		code = code.replace(new RegExp(`{{${k}}}`, 'g'), typeof v.default === 'string' ? v.default : JSON.stringify(v.default))
	));
	const packages = await Promise.all(params.packages.map(async (name_version) => {
		if (packageCache[name_version]) {
			return { [name_version]: packageCache[name_version] };
		}
		return { [name_version]: (await account.viewFunction(contractId, 'get_package', { name_version })).urls[0] };
	}));
	packages.map((obj) => Object.entries(obj)[0]).forEach(([k, v]) => packageCache[k] = v);
	const el = document.getElementById(id)
	if (!el) {
		return console.warn('element not found', id)
	}

	el.src = 'data:text/html;charset=utf-8,' + encodeURI(iframeTemplate
		.replace('@code', `${code}`)
		.replace('@packages', packages.map((obj) => `<script src="${Object.values(obj)[0]}"></script>`)
		));
};