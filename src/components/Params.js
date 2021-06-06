import React from 'react';
import BN from 'bn.js';
import { hexToRgb, rgbToHex } from '../utils/color';

export const Params = ({ params, args, updateArgs }) => {

	// console.log(params)

	const minMaxUpdate = (id) => {
		const els = document.querySelector('#' + id).querySelectorAll('input')
		updateArgs(id, `[${els[0].value},${els[1].value}]`)
	}

	return params.map(({ name, type, init, min = 0, max = Number.MAX_SAFE_INTEGER }) => {
		let value = args[name] || JSON.stringify(init);
		try {
			value = JSON.parse(value);
		} catch (e) {
			console.warn(e);
		}
		const isSlider = max !== Number.MAX_SAFE_INTEGER

		switch (type) {

			case 'int':
				return <div key={name}>
					{
						isSlider
							?
							<>
								<input type="range" step="1" min={min} max={max} defaultValue={parseInt(value, 10)} onChange={(e) => updateArgs(name, e.target.value)} />
								<label>{name} Min</label>
							</>
							:
							<>
								<input type="number" step="1" min={min} max={max} defaultValue={parseInt(value, 10)} onChange={(e) => updateArgs(name, e.target.value)} />
								<label>{name}</label>
							</>
					}
				</div>;

			case 'float':
				return <div key={name}>
					<input type="number" step="0.01" defaultValue={parseFloat(value, 10)} onChange={(e) => updateArgs(name, e.target.value)} />
					<label>{name}</label>
				</div>;

			case 'int-min-max':
				return <div id={name} key={name}>
					<input type="range" step="1" min={min} max={max} defaultValue={parseInt(value, 10)} onChange={() => minMaxUpdate(name)} />
					<label>{name} Min</label>
					<input type="range" step="1" min={min} max={max} defaultValue={parseInt(value, 10)} onChange={() => minMaxUpdate(name)} />
					<label>{name} Max</label>
				</div>;

			case 'webgl-float':
				return <div key={name}>
					<input type="number" step="0.01" defaultValue={parseFloat(value, 10)} onChange={(e) => {
						const input = e.target.value;
						updateArgs(name, JSON.stringify(input));
					}} />
					<label>{name}</label>
				</div>;

			case 'color-hex':
				return <div key={name}>
					<input type="color" defaultValue={value} onChange={(e) => {
						updateArgs(name, JSON.stringify('0x' + e.target.value.substr(1)));
					}} />
					<label>{name}</label>
				</div>;

			case 'color-arr':
				return <div key={name}>
					<input type="color" defaultValue={rgbToHex(...value)} onChange={(e) => {
						const color = JSON.stringify(hexToRgb(e.target.value, false, true));
						updateArgs(name, color);
					}} />
					<label>{name}</label>
				</div>;

			case 'color-rgba':
				return <div key={name}>
					<input type="color" defaultValue={rgbToHex(...value.match(/"rgba([^]+,1)"/g))} onChange={(e) => {
						const color = hexToRgb(e.target.value, false, true);
						const rgba = `"rgba(${color.join(',')}, 1)"`;
						updateArgs(name, rgba);
					}} />
					<label>{name}</label>
				</div>;

			case 'color-webgl':
				return <div key={name}>
					<input type="color" defaultValue={rgbToHex(...value.map((v) => v * 255))} onChange={(e) => {
						const color = hexToRgb(e.target.value, true, true);
						const input = color.concat([1]);
						updateArgs(name, JSON.stringify(input));
					}} />
					<label>{name}</label>
				</div>;
		}

	});
};

