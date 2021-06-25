import React, { useEffect } from 'react';

export const Dialog = ({ resolve, reject, msg, choices, input, noClose = false, info = false, wait = false }) => {
    
	useEffect(() => {
		if (input) document.querySelector('#dialog-input-0').focus();
	}, []);

	const resolveInput = () => {
		resolve(input.map((_, i) => document.querySelector('#dialog-input-' + i).value));
	};

	return (
		<div className="dialog" onClick={() => wait ? resolve(false) : reject()}>
			<div>
				<div onClick={(e) => {
					e.stopPropagation();
					return false;
				}}>
					<div>{msg}</div>
					{
						input &&
                        input.map(({ placeholder, list, defaultValue, type = 'text' }, i) => <div key={i}>
                        	<input 
                        		id={'dialog-input-' + i} type={type} placeholder={placeholder}
								list={list ? 'dialog-list' : undefined}
                        		onKeyUp={(e) => e.key === 'Enter' && resolveInput()}
								defaultValue={defaultValue}
                        	/>
							{
								list && <datalist id="dialog-list">
									{
										list.map((v, i) => <option key={i} value={v}></option>)
									}
								</datalist>
							}
                        </div>)
					}
					{
						choices &&
                        choices.map((label, i) => <button key={i} onClick={() => resolve(label)}>{label}</button>)
					}
					{!info && !choices && <button
						onClick={resolveInput}
					>Confirm</button>}
					{!noClose && <button onClick={() => wait ? resolve(false) : reject()}>Close</button>}
				</div>
			</div>
		</div>
	);
};