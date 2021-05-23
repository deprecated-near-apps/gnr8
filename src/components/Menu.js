import React from 'react';

export const Menu = ({ app, menuKey, update, options = {} }) => {
	if (!Object.keys(options).length) {
		setTimeout(() => update('app.' + menuKey, false), 1);
		return null; 
	}
	return <div className={app[menuKey]}>
		<div className="close" onClick={() => {
			update('app.' + menuKey, false);
		}}>✕</div>
		{
			Object.entries(options).map(([k, v]) => 
				<div key={k} className="item" onClick={(e) => {
					if (typeof v === 'object') {
						if (!v.fn) return
						if (v.close) update('app.' + menuKey, false);
						return v.fn(e);
					}
					v(e)
					update('app.' + menuKey, false);
				}}>
					{k}
					&nbsp;
					{ typeof v === 'object' && v.frag }
				</div>	
			)
		}
	</div>;
};

