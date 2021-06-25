import React, { useEffect, useState } from 'react';
import { get, set, del } from '../utils/storage';
import { setDialog } from '../state/app';
import {Ace} from './Ace';
import { loadCodeFromSrc } from '../state/code';

import { reglExample } from '../../test/examples/regl-example';
import { three1 } from '../../test/examples/three-1';
import { three2 } from '../../test/examples/three-2';
import { three3 } from '../../test/examples/three-3';
import { p51 } from '../../test/examples/p5-1';
import { p52 } from '../../test/examples/p5-2';
import { p53 } from '../../test/examples/p5-3';
import { p54 } from '../../test/examples/p5-4';
import { p55 } from '../../test/examples/p5-5';
import { p56 } from '../../test/examples/p5-6';
import { p57 } from '../../test/examples/p5-7';
import { three4 } from '../../test/examples/three-4';
import { pixi } from '../../test/examples/pixi';

export const examples = [
	p57,
	three4,
	p56,
	p55,
	p54,
	p53,
	p52,
	p51,
	reglExample,
	pixi,
	three1,
	three2,
	three3,
];

const EDITOR_STATE = '__EDITOR_STATE__';
const DEBOUNCE_TIME = 750;
const DEFAULT_STATE = {
	__tab: 'app.js',
	'app.js': '// hello world'
}

const noMeta = (k) => !/__/.test(k)

let changeTimeout, editor;

export const Editor = (props) => {

    const { preview, example, dispatch } = props

	const [state, setState] = useState({});
	const [tab, setTab] = useState('');

    useEffect(() => {
		const state = get(EDITOR_STATE, null) || DEFAULT_STATE
        updateState(state, state.__tab)
    }, [])

	useEffect(() => {
		if (example === -1) return
		const ex = examples[example]
		const state = {
			[ex.series_name]: ex.src
		}
        updateState(state, ex.series_name)
    }, [example])

	const updateState = (newState, newTab) => {
		setState(newState)
        setTab(newTab)
		newState.__tab = newTab
		set(EDITOR_STATE, newState)
		updateEditor(Object.values(newState).join('\n\n\n'))
	}

    const updateEditor = (newValue) => {
		if (!newValue) return;
		dispatch(loadCodeFromSrc({
			id: 'create-preview', src: newValue || code, editor: true
		}));
		setTimeout(() => {
			editor.resize();
			editor.renderer.updateFull();
		}, 250);
	};

	const onLoad = (target) => {
		editor = target;
		// if (code) {
		// 	onChange(code, true);
		// } else {
		// 	onChange(defaultExample.src, true);
		// }
	};

	const onChange = async (newValue, showPreview = false) => {
		updateState({ ...state, [tab]: newValue }, tab)
		// setPreview(preview || showPreview);
		if (changeTimeout) {
			clearTimeout(changeTimeout);
		}
		changeTimeout = setTimeout(() => updateEditor(newValue), DEBOUNCE_TIME);
	};

	const handleNewTab = async () => {
		const dialog = async (defaultValue) => {
			const result = await dispatch(setDialog({
				msg: 'New Tab',
				input: [
					{placeholder: 'name', defaultValue},
				]
			}));
			if (!result) return;
			if (!/\.js|\.html|\.css/.test(result)) {
				await dispatch(setDialog({
					msg: 'Please use an extension of either .html, .css or .js' ,
					info: true,
					wait: true,
				}))
				return dialog(result)
			}
			return result
		}
		const result = await dialog()
		
		const [name] = result;
		const newState = {
			...state,
			[name]: ''
		}
		updateState(newState, name)
	}

	const handleDelTab = async (tab) => {
		const choice = await dispatch(setDialog({
			msg: 'Are you sure you want to delete the tab: ' + tab,
			choices: ['Yes', 'No'],
			noClose: true,
		}))
		if (choice !== 'Yes') return
		const newState = {
			...state,
		}
		delete newState[tab]
		// set tab and check if need a new blank tab
		const tabs = Object.keys(newState).filter(noMeta)
		tab = tabs[0]
		if (!tabs.length) {
			newState['app.js'] = '// hello world!'
			tab = 'app.js'
		}
		updateState(newState, tab)
	}

	console.log(state, tab)
	
	const tabs = Object.keys(state).filter(noMeta)

    return <div className="editor">

        <div className="tabs">
            {
                tabs.map((k) => 
					<p key={k} onClick={() => setTab(k)} className={k === tab ? 'active' : ''}>
						{k}
						<span onClick={() => handleDelTab(k)}> ✕</span>
					</p>
				)
            }
			<p onClick={() => handleNewTab()}>new +</p>
        </div>
        
        { tab && 
            <div className={preview ? 'ace preview' : 'ace'}>
                <Ace {...{
                    value: state[tab],
                    onChange,
                    onLoad,
                }} />
            </div>
        }
    </div>
}