import JSON5 from 'json5';
import { contractId } from './near';

const paramLabels = ['mint', 'owner'];

let replaceFrame = {}
let log
let updateState

window.onmessage = ({ data }) => {
	const { type, msg, id, image } = data;
	if (image) {
		if (replaceFrame[id]) {
			const iframe = document.getElementById(id);
			const sample = document.createElement('img')
			sample.src = URL.createObjectURL(new Blob([new Uint8Array(image)]));
			iframe.parentNode.replaceChild(sample, iframe)
			sample.onclick = () => history.push((id.indexOf(':') === -1 ? '/mint/' : '/token/') + id + '/')
			delete replaceFrame[id]
			return
		}
		updateState('app', { image });
	}
	if (/log|warn|error/g.test(type)) {
		window.console[type](msg);
		log(type + ': ' + msg);
	}
	if (/stop/g.test(type)) {
		console.log('stopping', id)
		replaceFrame[id] = true
		const iframe = document.getElementById(id);
		iframe.contentWindow.postMessage({ type: 'image' }, '*');
	}
};

export const loadCodeFromSrc = ({
	id, src, args, owner_id, num_transfers, editor
}) => async ({ getState, update }) => {
	const { contractAccount } = getState();
	
	updateState = update
	if (editor) {
		log = (msg) => {
			const { app: { consoleLog } } = getState();
			update('app', {
				consoleLog: consoleLog.slice(consoleLog.length - 99).concat([msg])
			});
			const output = document.querySelector('.console .output');
			if (output) {
				setTimeout(() => output.scrollTop = 999999, 150);
			}
		};
	}

	const { code, html, css, params, error } = getParams(src);
	if (error) {
		return log(error.message);
	}
	if (args) {
		paramLabels.forEach((label) => {
			Object.entries(params[label]).forEach(([k], i) => {
				const arg = args[label][i];
				if (!arg) return;
				params[label][k].default = arg;
			});
		});
	}
	loadCode({ id, contractAccount, owner_id, num_transfers, params, code, html, css });
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
		console.warn(e);
		return { error: e };
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

const iframeTemplate = (id) => `
    <!doctype html>
    <html lang="en">
    <head>
		@packages
		<style>@css</style>
        <script>
			['log', 'warn', 'error'].forEach((type) => {
				window.console[type] = (msg) => {
					parent.postMessage({ msg, type }, '${window.location.origin}');
				}
			})
			window.onmessage = ({data}) => {
				if (data.type === 'image') {
					document.querySelector('canvas').toBlob(async (blob) => {
						const image = await blob.arrayBuffer()
						parent.postMessage({ id: '${id}', image }, '${window.location.origin}', [image]);
					})
				}
			}
			let strikes = 0
			let t = Date.now()
			setInterval(() => {
				if (Date.now() - t > 1015) {
					strikes++
					if (strikes > 4) {
						parent.postMessage({ id: '${id}', type: 'stop' }, '${window.location.origin}');
					}
				}
				t = Date.now()
			}, 1000)
			// console.log('hey')
			// console.warn('hey')
			// console.error('hey')
		</script>
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
	
	paramLabels.forEach((label) => Object.entries(params[label]).forEach(([k, v]) => {
		// console.log(k)
		// const re = new RegExp(`{{\\s\*${k}\\s\*}}`, 'g')
		// console.log(re.test(code))
		code = code.replace(new RegExp(`{{\\s\*${k}\\s\*}}`, 'g'), typeof v.default === 'string' ? v.default : JSON.stringify(v.default))
	}));

	code = code.replace(/{{\s*OWNER_ID\s*}}/g, `'${owner_id}'`);
	code = code.replace(/{{\s*NUM_TRANSFERS\s*}}/g, num_transfers);
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

	el.src = 'data:text/html;charset=utf-8,' + encodeURI(iframeTemplate(id)
		.replace('@css', `${css}`)
		.replace('@html', `${html}`)
		.replace('@code', `${code}`)
		.replace('@packages', packages.map((src) => `<script src="${src}"></script>`)
		));
};