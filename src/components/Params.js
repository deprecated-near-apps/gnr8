import React from 'react';
import BN from 'bn.js';
import { hexToRgb, rgbToHex } from '../utils/color';

export const Params = ({ params, args, updateArgs }) => {
	// console.log(params, args)
	return params.map(({ name, type, default: def }) => {
		let value = args[name] || JSON.stringify(def);
		try {
			value = JSON.parse(value);
		} catch(e) {
			console.warn(e);
		}

		switch (type) {
		case 'int':
			return <div key={name}>
				<input type="number" step="1" defaultValue={parseInt(value, 10)} onChange={(e) => updateArgs(name, e.target.value)} />
				<label>{name}</label>
			</div>;
		case 'float':
			return <div key={name}>
				<input type="number" step="0.01" defaultValue={parseFloat(value, 10)} onChange={(e) => updateArgs(name, e.target.value)} />
				<label>{name}</label>
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

