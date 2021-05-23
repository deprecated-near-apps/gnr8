import React from 'react';

export const Frame = ({ items, menu = true }) => {
    return items.map(({ codeId, owner_id, params, sales = [], claimed = 0 }) =>
        <div key={codeId} className="iframe">
            <iframe {...{ id: codeId }} />
            {
                menu && <>
                    <div onClick={() => params ? history.push('/mint/' + codeId) : history.push('/token/' + codeId)}>
                        <div>{codeId}</div>
                        <div>{owner_id}</div>
                    </div>
                    {params && sales.length === 1 && <div>
                        <div>{claimed} / {params.max_supply} Claimed</div>
                        {claimed < params.max_supply &&
                            <div onClick={() => history.push('/mint/' + codeId)}>Mint</div>
                        }
                    </div>}
                </>
            }
        </div>
    );
};

