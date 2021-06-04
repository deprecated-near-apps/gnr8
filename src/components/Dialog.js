import React, { useEffect } from 'react';

export const Dialog = ({ resolve, reject, msg, choices, input, noClose = false, info = false }) => {
    
    useEffect(() => {
        if (input) document.querySelector('#dialog-input-0').focus()
    }, [])

    const resolveInput = () => {
        resolve(input.map((_, i) => document.querySelector('#dialog-input-' + i).value))
    }

    return (
        <div className="dialog" onClick={() => reject()}>
            <div>
                <div onClick={(e) => {
                    e.stopPropagation()
                    return false
                }}>
                    <div>{msg}</div>
                    {
                        input &&
                        input.map(({ placeholder, type = 'text' }, i) => <div key={i}>
                            <input 
                                id={"dialog-input-" + i} type={type} placeholder={placeholder}
                                onKeyUp={(e) => e.key === 'Enter' && resolveInput()}
                            />
                        </div>)
                    }
                    {
                        choices &&
                        choices.map((label, i) => <button key={i} onClick={() => resolve(label)}>{label}</button>)
                    }
                    {!info && !choices && <button
                        onClick={resolveInput}
                    >Accept</button>}
                    {!noClose && <button onClick={() => reject()}>Close</button>}
                </div>
            </div>
        </div>
    )
}