import { useEffect } from 'react';

(function(history){
	var pushState = history.pushState;
	history.pushState = function(state) {
		if (typeof history.onpushstate == "function") {
			history.onpushstate({state: state});
		}
		// whatever else you want to do
		// maybe call onhashchange e.handler
		return pushState.apply(history, arguments);
	};
})(window.history);

export const useHistory = (callback, hash = false) => {
	if (hash) {
		window.history.push = (path) => {
			window.history.pushState({}, '', window.location.origin + '/#' + path);
		};
	} else {
		window.history.push = (path) => {
			window.history.pushState({}, '', window.location.origin + path);
		};
	}
	useEffect(() => {
		window.onpopstate = history.onpushstate = () => {
			setTimeout(callback, 10);
		};
		return () => window.onpopstate = history.onpushstate = null;
	}, [callback]);
};

export const pathAndArgs = () => {
	let path = window.location.href;
	let args = url2args(window.location.href);
	if (path.indexOf('#') > -1) {
		path = path.split('#/')[1].split('?')[0];
		args = url2args(window.location.href.replace('/#/', '/'));
	} else {
		path = window.location.pathname;
	}
	path = ('/' + path.split('/').filter(s => !!s.length).join('/').toLowerCase());
	return {
		path,
		pathParts: path.split('/').map((p) => p.split('?')[0]),
		args,
	};
};

const url2args = (url) => Array.from(new URL(url).searchParams.entries())
	.map(([k, v]) => ({ [k]: v }))
	.reduce((a, c) => ({ ...a, ...c }), {});
