import React from 'react';
import BN from 'bn.js';
import { hexToRgb } from '../utils/color';

export const Params = ({ params, args, updateArgs }) => {

    console.log(args)

    return params.map(({ name, type }) => {

        return (
            <div key={name}>
                <span>{name}</span>
                {
                    type.indexOf('int') > -1 &&
                    <input type="number" step="1" onChange={(e) => updateArgs(name, e.target.value)} />
                }
                {
                    type.indexOf('float') > -1 &&
                    <input type="number" onChange={(e) => updateArgs(name, e.target.value)} />
                }
                {
                    type.indexOf('color-arr') > -1 &&
                    <input type="color" onChange={(e) => {
                        const color = JSON.stringify(hexToRgb(e.target.value, false, true));
                        updateArgs(name, color)
                    }} />
                }
                {
                    type.indexOf('rgba-color') > -1 &&
                    <input type="color" onChange={(e) => {
                        const color = hexToRgb(e.target.value, false, true);
                        const rgba = `"rgba(${color.join(',')}, 1)"`;
                        updateArgs(name, rgba)
                    }} />
                }
                {
                    type.indexOf('webgl-color') > -1 &&
                    <input type="color" onChange={(e) => {
                        const color = hexToRgb(e.target.value, true, true);
                        const input = color.concat([1]);
                        updateArgs(name, JSON.stringify(input))
                    }} />
                }
                {
                    type.indexOf('webgl-float') > -1 &&
                    <input type="number" onChange={(e) => {
                        const input = e.target.value;
                        updateArgs(name, JSON.stringify(input))
                    }} />
                }
            </div>
        )
    })
}

