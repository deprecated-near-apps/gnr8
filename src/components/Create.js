import React, { useEffect, useState } from 'react';
import AceEditor from "react-ace";
import "ace-builds/src-noconflict/mode-javascript";
import "ace-builds/src-noconflict/theme-github";
import JSON5 from 'json5'
import { contractId } from '../state/near';
import { loadCode } from '../state/iframe';
import { Menu } from './Menu';
import { reglExample } from '../../test/examples/regl-example'

export const Create = ({ app, update, account, contractAccount }) => {

    const [preview, setPreview] = useState(false)
    const [code, setCode] = useState(reglExample.src)

    useEffect(() => {
        onChange(reglExample.src, true)
    }, [contractAccount])

    const getParams = (code) => {
        const paramsMatch = code.match(/@params[^]+@params/g)[0]
        if (!paramsMatch) {
            return alert('Something wrong with @params. Do you have @params at the first and last line of your params?')
        }
        let params
        try {
            params = JSON5.parse(paramsMatch.replaceAll('@params', ''))
        } catch(e) {
            return alert(e)
        }
        return { code: code.replace(paramsMatch, ''), params }
    }

    const onChange = async (newValue, withPreview) => {
        const { code, params } = getParams(newValue)
        loadCode('#test', contractAccount, code, params)
        setCode(newValue)
        setPreview(withPreview)
    }

    const { createMenu } = app

    return <>
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
                                const index = code.indexOf('mint: {') + 'mint: {'.length
                                setCode([
                                    code.slice(0, index),
                                    `\n\t\t${window.prompt('name')}: {\n\t\t\tdefault: ${window.prompt('default value')},\n\t\t\ttype: ${window.prompt('type')},\n\t\t},`,
                                    code.slice(index)
                                ].join(''))
                            },
                            'ᐅ Add Owner Param': () => setCode(code.replace(new RegExp(`max_supply: .*,`, 'g'), `max_supply: '${window.prompt('what?')}',`)),
                            'ᐅ Create Series': async () => {
                                const { code: src, params } = getParams(code)
                                const result = await account.functionCall(contractId, 'create_series', {
                                    name: window.prompt('Name of Series?'),
                                    params: {
                                        max_supply: params.max_supply,
                                        mint: Object.keys(params.mint),
                                        owner: Object.keys(params.owner)
                                    },
                                    src,
                                })
                                console.log(result)
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

        <div className={preview ? 'iframe preview' : 'iframe'}>
            <iframe {...{
                id: 'test',
            }} />
        </div>

    </>;
};

