import React, { useEffect, useState } from 'react';
import AceEditor from "react-ace";
import "ace-builds/src-noconflict/mode-javascript";
import "ace-builds/src-noconflict/theme-github";
import { GAS, contractId, parseNearAmount } from '../state/near';
import { loadCodeFromSrc, getParams } from '../state/code';
import { Menu } from './Menu';
import { reglExample } from '../../test/examples/regl-example';

export const Create = ({ app, update, dispatch, account }) => {

	const [preview, setPreview] = useState(false);
	const [code, setCode] = useState(reglExample.src);

	useEffect(() => {
		onChange(reglExample.src, true);
	}, []);

	const onChange = async (newValue, withPreview) => {
		dispatch(loadCodeFromSrc('create-preview', code))
		setCode(newValue);
		setPreview(withPreview === true);
	};

	const { createMenu } = app;

	return <>
		<div className="create">
			<div className="menu no-barcode">
				<div className="bar">
					<div onClick={() => update('app.createMenu', createMenu === 'left' ? false : 'left')}>Options</div>
					<div onClick={() => setPreview(!preview)}>Preview</div>
				</div>
				{
					createMenu === 'left' && <div className="sub below">
						<Menu {...{
							app, menuKey: 'createMenu', update, options: {
								'ᐅ Max Supply': () => setCode(code.replace(/max_supply:.*,/g, `max_supply: '${window.prompt('what?')}',`)),
								'ᐅ Add Mint Param': () => {
									const index = code.indexOf('mint: {') + 'mint: {'.length;
									setCode([
										code.slice(0, index),
										`\n\t\t${window.prompt('name')}: {\n\t\t\tdefault: ${window.prompt('default value')},\n\t\t\ttype: ${window.prompt('type')},\n\t\t},`,
										code.slice(index)
									].join(''));
								},
								'ᐅ Add Owner Param': () => setCode(code.replace(new RegExp(`max_supply: .*,`, 'g'), `max_supply: '${window.prompt('what?')}',`)),
								'ᐅ Create Series': () => {
									const { params } = getParams(code);

									if (window.confirm('Mint the series now?')) {
										account.functionCall(contractId, 'create_series_and_mint_batch', {
											name: window.prompt('Name of Series?'),
											params: {
												max_supply: params.max_supply,
												enforce_unique_args: true,
												mint: Object.keys(params.mint),
												owner: Object.keys(params.owner),
												packages: params.packages,
											},
											src: code,
										}, GAS, parseNearAmount('1'));
									} else {
										account.functionCall(contractId, 'create_series', {
											name: window.prompt('Name of Series?'),
											params: {
												max_supply: params.max_supply,
												enforce_unique_args: true,
												mint: Object.keys(params.mint),
												owner: Object.keys(params.owner),
												packages: params.packages,
											},
											src: code,
										}, GAS, parseNearAmount('0.1'));
									}
									
								},
							}
						}} />
					</div>
				}
			</div>

			<div className={preview ? 'editor preview' : 'editor'}>
				<AceEditor
					mode="javascript"
					theme="github"
					value={code}
					onChange={onChange}
					name="ace-editor"
					width="100%"
					height="100%"
					fontSize="0.8rem"
					editorProps={{
						$blockScrolling: true,
					}}
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

