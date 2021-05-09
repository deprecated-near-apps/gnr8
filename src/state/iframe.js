import { contractId } from './near';

const paramLabels = ['mint', 'owner'];
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
	paramLabels.forEach((l) => Object.entries(params[l])
		.forEach(([k, v]) => code = code.replace(new RegExp(`{{${k}}}`, 'g'), JSON.stringify(v.default)))
	);
	const packages = await Promise.all(params.packages.map(async (name_version) => {
		if (packageCache[name_version]) {
			return { [name_version]: packageCache[name_version] };
		}
		return { [name_version]: (await account.viewFunction(contractId, 'get_package', { name_version })).urls[0] };
	}));
	packages.map((obj) => Object.entries(obj)[0]).forEach(([k, v]) => packageCache[k] = v);
	document.querySelector(id).src = 'data:text/html;charset=utf-8,' + encodeURI(iframeTemplate
		.replace('@code', code)
		.replace('@packages', packages.map((obj) => `<script src="${Object.values(obj)[0]}"></script>`)
		));
};