const fetch = require('node-fetch');
const { sha256 } = require('js-sha256');

const packages = [
	'p5@1.3.1',
	'three.js@r128',
	'regl@2.1.0',
];

exports.packages = packages;

exports.getPackages = async () => {

	const p5 = {
		name_version: packages[0],
		src_hash: sha256(await fetch('https://cdn.jsdelivr.net/npm/p5@1.3.1/lib/p5.js').then(r => r.text())),
		urls: ['https://cdn.jsdelivr.net/npm/p5@1.3.1/lib/p5.js']
	};

	const threeUrls = [
		'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js',
	];
	const three = {
		name_version: packages[1],
		src_hash: sha256(await fetch(threeUrls[0]).then(r => r.text())),
		urls: threeUrls
	};

	const reglUrls = [
		'https://cdnjs.cloudflare.com/ajax/libs/regl/2.1.0/regl.min.js',
	];
	const regl = {
		name_version: packages[2],
		src_hash: sha256(await fetch(reglUrls[0]).then(r => r.text())),
		urls: reglUrls
	};

	return {
		p5, regl, three,
	};
};