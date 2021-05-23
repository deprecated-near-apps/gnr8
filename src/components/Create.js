import React, { useEffect, useState } from 'react';
import {get, set, del} from '../utils/storage';
import AceEditor from "react-ace";
import "ace-builds/src-noconflict/mode-jsx";
import "ace-builds/src-noconflict/mode-markdown";
import "ace-builds/src-noconflict/mode-javascript";
import "ace-builds/src-noconflict/theme-chrome";
import "ace-builds/src-min-noconflict/ext-searchbox";
import "ace-builds/src-min-noconflict/ext-language_tools";
import { getPackageRange } from '../state/views';
import { GAS, contractId, marketId, parseNearAmount } from '../state/near';
import { loadCodeFromSrc, getParams } from '../state/code';

import { sha256 } from 'js-sha256'

import { Menu } from './Menu';
import { reglExample } from '../../test/examples/regl-example';
import { three1 } from '../../test/examples/three-1';
import { three2 } from '../../test/examples/three-2';
import { three3 } from '../../test/examples/three-3';
import { p51 } from '../../test/examples/p5-1';

const examples = [
	reglExample,
	three1,
	three2,
	three3,
	p51,
];

const PENDING_SERIES_UPDATE = '__PENDING_SERIES_UPDATE';

export const Create = ({ app, views, update, dispatch, account }) => {

	const { packages } = views

	const [preview, setPreview] = useState(false);
	const [code, setCode] = useState();
	const [editor, setEditor] = useState();
	const [showPackages, setShowPackages] = useState(false);
	const [packageFilter, setPackageFilter] = useState('');

	useEffect(() => {
		onChange(p51.src, true);
		dispatch(getPackageRange())
		checkSeriesUpdate();
	}, []);

	const checkSeriesUpdate = async() => {
		const {series_name, src, attempts} = get(PENDING_SERIES_UPDATE + account.accountId);
		if (series_name) {
			const data = await account.viewFunction(contractId, 'series_data', { series_name }, GAS);
			if (data.src === src) {
				return del(PENDING_SERIES_UPDATE + account.accountId);
			}
			const result = await account.functionCall(contractId, 'series_update', { series_name, src }, GAS);
			console.log('series updated', result);
		}
	};

	const resize = (editor) => {
		if (!editor) return;
		setTimeout(() => {
			editor.resize();
			editor.renderer.updateFull();
		}, 250);
	};

	const onLoad = (editor) => {
		setEditor(editor);
		resize(editor);
	};

	const onChange = async (newValue, showPreview) => {
		dispatch(loadCodeFromSrc('create-preview', newValue));
		setCode(newValue);
		setPreview(preview || showPreview === true);
		resize(editor);
	};

	const includePackage = (i) => {
		const { params } = getParams(code);
		const pkg = packages[i].name_version
		if (!params.packages.includes(pkg)) params.packages.push(pkg)
		setCode(code.replace(new RegExp(`packages: .*,`, 'g'), `packages: ${JSON.stringify(params.packages)},`))
	}

	const addPackage = async () => {
		const name_version = window.prompt('name@version (exactly like this)')
		const urls = [window.prompt('CDN URL?')]
		const src_hash = sha256(await fetch(urls[0]).then(r => r.text()))

		await account.functionCall(contractId, 'add_package', {
			name_version,
			urls,
			src_hash
		}, GAS, parseNearAmount('1'));
	}

	const { createMenu } = app;

	const packageMenu = {
		'- Add New Package': addPackage,
		'- Filter': { frag: <input type="text" onChange={(e) => setPackageFilter(e.target.value)} /> },
	};
	packages.filter(({ name_version }) => name_version.indexOf(packageFilter) > -1)
		.forEach(({ name_version }, i) => packageMenu['- ' + name_version] = () => includePackage(i))

	const options = {
		[showPackages ? '▽ Hide Packages' : '▷ Show Packages']: {
			fn: () => { setShowPackages(!showPackages) },
			close: false
		},
		...(showPackages ? packageMenu : {}),
		'▷ Max Supply': () => setCode(code.replace(/max_supply:.*,/g, `max_supply: '${window.prompt('What should the max supply be?')}',`)),
		'▷ Add Mint Parameter': () => {
			const index = code.indexOf('mint: {') + 'mint: {'.length;
			setCode([
				code.slice(0, index),
				`\n\t\t${window.prompt('name')}: {\n\t\t\tdefault: ${window.prompt('default value')},\n\t\t\ttype: ${window.prompt('type')},\n\t\t},`,
				code.slice(index)
			].join(''));
		},
		'▷ Add Owner Parameter': () => setCode(code.replace(new RegExp(`max_supply: .*,`, 'g'), `max_supply: '${window.prompt('what?')}',`)),
		'▷ Create Series': () => {
			const { params } = getParams(code);

			const series_name = window.prompt('Name of Series?');
			const sellNow = window.confirm('Sell series now?');
			const price = window.prompt('What price in NEAR?');

			set(PENDING_SERIES_UPDATE + account.accountId, { series_name, src: code, attempts: 0 });

			if (sellNow) {
				account.functionCall(contractId, 'series_create_and_approve', {
					series_name,
					bytes: code.length.toString(),
					params: {
						max_supply: params.max_supply,
						enforce_unique_args: true,
						mint: Object.keys(params.mint),
						owner: Object.keys(params.owner),
						packages: params.packages,
					},
					account_id: marketId,
					msg: JSON.stringify({
						sale_conditions: [
							{ ft_token_id: "near", price: parseNearAmount(price)}
						]
					})
				}, GAS, parseNearAmount('1'));
			} else {
				account.functionCall(contractId, 'series_create', {
					series_name,
					bytes: code.length.toString(),
					params: {
						max_supply: params.max_supply,
						enforce_unique_args: true,
						mint: Object.keys(params.mint),
						owner: Object.keys(params.owner),
						packages: params.packages,
					},
				}, GAS, parseNearAmount('1'));
			}
			
		},
	}

	return <>
		<div className="create">
			<div className="menu no-barcode">
				<div className="bar">
					<div onClick={() => update('app.createMenu', createMenu === 'left' ? false : 'left')}>Options</div>
					<div onClick={() => {
						setPreview(!preview);
						resize(editor);
					}}>Preview</div>
				</div>
				{
					createMenu === 'left' && <div className="sub below">
						<Menu {...{
							app, menuKey: 'createMenu', update, options,
						}} />
					</div>
				}
			</div>

			<div className={preview ? 'editor preview' : 'editor'}>
				<AceEditor
					mode="jsx"
					theme="chrome"
					value={code}
					name="ace-editor"
					width="100%"
					height="100%"
					fontSize="0.8rem"
					debounceChangePeriod={100}
					editorProps={{
						$blockScrolling: true,
					}}
					setOptions={{
						useWorker: false,
						showLineNumbers: true,
						tabSize: 4
					}}
					onChange={onChange}
					onLoad={onLoad}
				/>
			</div>

			<div className={preview ? 'iframe' : 'iframe display-none'}>
				<iframe {...{
					id: 'create-preview',
				}} />
			</div>
		</div>

	</>;
};

