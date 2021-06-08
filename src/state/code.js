import JSON5 from 'json5';
import { contractId } from './near';
import localIframeSrc from 'url:../frame.html';

const paramLabels = ['mint', 'owner'];
let replaceFrame = {};
let log;
let updateState;
let iframeHelperTimeout;
export const IFRAME_SRC = !/localhost/g.test(window.origin) ? 'https://near-apps.github.io/gnr8/frame.html' : localIframeSrc;
export const IFRAME_ALLOW = 'accelerometer; camera; encrypted-media; geolocation; gyroscope; microphone; midi; clipboard-read; clipboard-write';

// main window listener for iframe messages (all frame)
window.onmessage = ({ data }) => {
	const { type, msg, id, image } = data;
	if (image) {
		if (replaceFrame[id]) {
			const iframe = document.getElementById(id);
			const sample = document.createElement('img');
			sample.src = URL.createObjectURL(new Blob([new Uint8Array(image)]));
			iframe.parentNode.replaceChild(sample, iframe);
			sample.onclick = () => history.push((id.indexOf(':') === -1 ? '/mint/' : '/token/') + id + '/');
			delete replaceFrame[id];
			return;
		}
		updateState('app', { image });
	}
	if (/log|warn|error/g.test(type)) {
		log(type + ': ' + msg.join(','));
	}
	if (/stop/g.test(type)) {
		console.log('stopping', id);
		replaceFrame[id] = true;
		const iframe = document.getElementById(id);
		iframe.contentWindow.postMessage({ type: 'image' }, '*');
	}
};

export const loadCodeFromSrc = ({
	id, src, args, page, owner_id, num_transfers, editor
}) => async ({ getState, update }) => {
	const { contractAccount } = getState();
	
	updateState = update;
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
	loadCode({ id, contractAccount, page, editor, owner_id, num_transfers, params, code, html, css });
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

const packageCache = {};
export const loadCode = async ({
	id, contractAccount, page, editor, params, code, html = '', css = '',
	owner_id = 'account.near',
	num_transfers = 0
}) => {
	
	paramLabels.forEach((label) => Object.entries(params[label]).forEach(([k, v]) => {
		// console.log(k)
		// const re = new RegExp(`{{\\s\*${k}\\s\*}}`, 'g')
		// console.log(re.test(code))
		code = code.replace(new RegExp(`{{\\s\*${k}\\s\*}}`, 'g'), typeof v.default === 'string' ? v.default : JSON.stringify(v.default));
	}));

	code = code.replace(/{{\s*OWNER_ID\s*}}/g, `'${owner_id}'`);
	code = code.replace(/{{\s*NUM_TRANSFERS\s*}}/g, num_transfers);
	const packages = await Promise.all(params.packages.filter(p => p.length).map(async (name_version) => {
		if (packageCache[name_version]) {
			return packageCache[name_version];
		}
		const url = (await contractAccount.viewFunction(contractId, 'get_package', { name_version })).urls[0];
		packageCache[name_version] = url;
		return url;
	}));

	const iframe = document.getElementById(id);
	if (!iframe) {
		return console.warn('iframe not found', id);
	}
	// const newFrame = document.createElement('iframe')
	// newFrame.id = id
	// newFrame.setAttribute('allow', IFRAME_ALLOW)
	iframe.onload = () => {
		const msg = html + 
			`<style>${css}</style>` +
			packages.map((p) => `<script src="${p}"></script>`).join('') + 
			`<script src="https://cdn.jsdelivr.net/gh/nearprotocol/near-api-js/dist/near-api-js.js"></script>` +
			`<script type="module" src="./wasm-music/wasm-music.js"></script>` +
			`<script>${code}</script>` +
			iframeHelpers;
		iframe.contentWindow.postMessage({ type: 'write', msg }, '*');
		if (iframeHelperTimeout) clearTimeout(iframeHelperTimeout);
		iframeHelperTimeout = setTimeout(() => {
			iframe.contentWindow.postMessage({ type: 'id', msg: id }, '*');
			if (editor) iframe.contentWindow.postMessage({ type: 'editor' }, '*');
			if (page) iframe.contentWindow.postMessage({ type: 'page' }, '*');
		}, 250);
	};
	iframe.src = IFRAME_SRC;
	// iframe.parentNode.replaceChild(newFrame, iframe);
};

const iframeHelpers = `
<script>
	let id;
	['alert', 'prompt', 'confirm'].forEach((type) => {
		window[type] = (...msg) => {
			console.log(...msg)
		}
	})
	window.onmessage = (e) => {
		const origin = document.location.ancestorOrigins[0]
		const { data } = e
		switch (data.type) {
			case 'id':
				id = data.msg
				break;
			case 'image':
				const canvas = document.querySelector('canvas')
				if (canvas) {
					return document.querySelector('canvas').toBlob(async (blob) => {
						const image = await blob.arrayBuffer()
						parent.postMessage({ id, image }, origin, [image]);
					})
				}
				const image = new ArrayBuffer()
				parent.postMessage({ id, image }, origin, [image]);
				break;
			case 'editor':
				['log', 'warn', 'error'].forEach((type) => {
					const prev = {
						[type]: window.console[type]
					}
					window.console[type] = (...msg) => {
						prev[type](...msg);
						try {
							parent.postMessage({ msg, type }, origin);
						} catch (e) { }
					}
				})
				// console.log('hey')
				// console.warn('hey')
				// console.error('hey')
				break;
			case 'page':
				let strikes = 0
				let t = Date.now()
				setInterval(() => {
					if (Date.now() - t > 1015) {
						strikes++
						if (strikes > 4) {
							parent.postMessage({ id, type: 'stop' }, origin);
						}
					}
					t = Date.now()
				}, 1000)
				break;
		}
	}
</script>
`;

