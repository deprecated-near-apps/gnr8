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

const examples = [
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

const defaultExample = p57;
const EDITOR_CHANGES = '__PENDING_SERIES_UPDATE__';
const EDITOR_STATE = '__EDITOR_STATE__';

const DEBOUNCE_TIME = 750;

let changeTimeout, editor;

export const Editor = (props) => {

    const { preview, dispatch } = props

	const [code, setCode] = useState();
	let [tabs, setTabs] = useState({});

    useEffect(() => {
        setTabs(get(EDITOR_STATE))
        setCode(get(EDITOR_CHANGES).code)
    }, [])

    const updateEditorAndPreview = (newValue) => {
		if (!newValue) return;
		set(EDITOR_CHANGES, { code: newValue });
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
		const { code } = get(EDITOR_CHANGES);
		if (code) {
			onChange(code, true);
		} else {
			onChange(defaultExample.src, true);
		}
	};

	const onChange = async (newValue, showPreview = false) => {
		setCode(newValue);
		// setPreview(preview || showPreview);
		if (changeTimeout) {
			clearTimeout(changeTimeout);
		}
		changeTimeout = setTimeout(() => updateEditorAndPreview(newValue), DEBOUNCE_TIME);
	};

    if (!Object.keys(tabs).length) {
        tabs = {
            'tab': code
        }
    }

    const tab = tabs['tab']

    return <div className="editor">

        <div className="tabs">
            {
                Object.entries(tabs).map(([k, v]) => {

                    return <p key={k}>{k}</p>
                })
            }
        </div>
        
        { tab && 
            <div className={preview ? 'ace preview' : 'ace'}>
                <Ace {...{
                    value: code,
                    onChange,
                    onLoad,
                }} />
            </div>
        }
    </div>
}