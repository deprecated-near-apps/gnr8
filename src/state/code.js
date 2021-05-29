import JSON5 from 'json5';
import { contractId } from './near';

const paramLabels = ['mint', 'owner'];

export const loadCodeFromSrc = ({ id, src, args, owner_id, num_transfers }) => async ({ getState }) => {
	const { contractAccount } = getState();
	const { code, html, css, params } = getParams(src);
	if (args) {
		paramLabels.forEach((label) => {
			Object.entries(params[label]).forEach(([k], i) => {
				const arg = args[label][i];
				if (!arg) return;
				params[label][k].default = arg;
			});
		});
	}
	loadCode({id, contractAccount, owner_id, num_transfers, params, code, html, css });
};

export const getParams = (code) => {
	const paramsMatch = code.match(/@params[^]+@params/g)?.[0]?.split('@params')?.filter((_, i) => i % 2 === 1);
	if (!paramsMatch) {
		return alert('Something wrong with @params. Do you have @params at the first and last line of your params?');
	}
	let params;
	try {
		params = JSON5.parse(paramsMatch[0]);
	} catch (e) {
		return console.warn(e);
	}
	if (!params.mint) params.mint = {};
	if (!params.owner) params.owner = {};

	code = code.replace(paramsMatch[0], '').replaceAll('@params', '');

	let html = '';
	const htmlMatch = code.match(/@html[^]+@html/g)?.[0]?.split('@html')?.filter((_, i) => i % 2 === 1);
	if (htmlMatch) {
		html = htmlMatch.join('\n');
	}

	let css = '';
	const cssMatch = code.match(/@css[^]+@css/g)?.[0]?.split('@css')?.filter((_, i) => i % 2 === 1);
	if (cssMatch) {
		css = cssMatch.join('\n');
	}
	
	const jsMatch = code.match(/@js[^]+@js/g)?.[0]?.split('@js')?.filter((_, i) => i % 2 === 1);
	if (jsMatch) {
		code = jsMatch.join('\n');
	}

	return { code: code.replace(paramsMatch, ''), html, css, params };
};

const iframeTemplate = `
    <!doctype html>
    <html lang="en">
    <head>
		@packages
		<style>@css</style>
	</head>
    <body>
		@html
        <script>@code</script>
    </body>
    </html>
`;

const packageCache = {};
export const loadCode = async ({
	id, contractAccount, params, code, html = '', css = '',
	owner_id = 'account.near',
	num_transfers = 0
}) => {
	paramLabels.forEach((label) => Object.entries(params[label]).forEach(([k, v]) =>
		code = code.replace(new RegExp(`{{${k}}}`, 'g'), typeof v.default === 'string' ? v.default : JSON.stringify(v.default))
	));

	code = code.replace(/{{OWNER_ID}}/g, `'${owner_id}'`)
	code = code.replace(/{{NUM_TRANSFERS}}/g, num_transfers)
	const packages = await Promise.all(params.packages.map(async (name_version) => {
		if (packageCache[name_version]) {
			return packageCache[name_version];
		}
		const url = (await contractAccount.viewFunction(contractId, 'get_package', { name_version })).urls[0];
		packageCache[name_version] = url;
		return url;
	}));

	const el = document.getElementById(id);
	if (!el) {
		return console.warn('element not found', id);
	}

	el.src = 'data:text/html;charset=utf-8,' + encodeURI(iframeTemplate
		.replace('@css', `${css}`)
		.replace('@html', `${html}`)
		.replace('@code', `${code}`)
		.replace('@packages', packages.map((src) => `<script src="${src}"></script>`)
		));
};