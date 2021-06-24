import React, { useEffect, useState } from 'react';
import { get, set, del } from '../utils/storage';
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
	'app.js': '// hello world'
}

let changeTimeout, editor;

export const Editor = (props) => {

    const { preview, example, dispatch } = props

	const [state, setState] = useState({});
	const [tab, setTab] = useState('');

    useEffect(() => {
		const state = get(EDITOR_STATE, null) || DEFAULT_STATE
		const keys = Object.keys(state)
		setState(state)
        setTab(keys[0])
		updateEditor(state[keys[0]].code)
    }, [])

	useEffect(() => {
		if (example === -1) return
		const ex = examples[example]
		const state = {
			[ex.series_name]: ex.src
		}
        setState(state)
        setTab(ex.series_name)
		updateEditor(state[ex.series_name])
    }, [example])

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
		setCode(newValue);
		// setPreview(preview || showPreview);
		if (changeTimeout) {
			clearTimeout(changeTimeout);
		}
		changeTimeout = setTimeout(() => updateEditor(newValue), DEBOUNCE_TIME);
	};

    return <div className="editor">

        <div className="tabs">
            {
                Object.entries(state).map(([k, v]) => {

                    return <p key={k}>{k}</p>
                })
            }
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