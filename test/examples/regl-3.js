const { packages } = require('./packages');

exports.regl3 = {
	series_name: 'regl-3',
	params: {
		max_supply: '1000',
		enforce_unique_mint_args: true,
		enforce_unique_owner_args: false,
		mint: [
			'backgroundColor'
		],
		owner: [
			'angleSpeed'
		],
		packages: ['regl@2.1.0']
	},
	src: `@params
{
    packages: ['regl@2.1.0'],
    max_supply: '1000',
    mint: {
        backgroundColor: {
            default: [0, 0, 0, 1],
            type: 'webgl-color',
        },
    },
    owner: {
        angleSpeed: {
            default: 0.01,
            type: 'webgl-float',
        },
    }
}
@params

const color = {{backgroundColor}}
const angleSpeed = {{angleSpeed}}

/// normal regl example

// As usual, we start by creating a full screen regl object
const regl = createREGL({ attributes: { preserveDrawingBuffer: true } })

// Next we create our command
const draw = regl({
    frag: \`
        precision mediump float;
        uniform vec4 color;
        void main() {
        gl_FragColor = color;
        }\`,
    
    vert: \`
        precision mediump float;
        attribute vec2 position;
        uniform float angle;
        uniform vec2 offset;
        void main() {
        gl_Position = vec4(
            cos(angle) * position.x + sin(angle) * position.y + offset.x,
            -sin(angle) * position.x + cos(angle) * position.y + offset.y, 0, 1);
        }\`,
    
    attributes: {
        position: [
        0.5, 0,
        0, 0.5,
        1, 1]
    },
    
    uniforms: {
        // the batchId parameter gives the index of the command
        color: ({tick}, props, batchId) => [
        Math.sin(0.02 * ((0.1 + Math.sin(batchId)) * tick + 3.0 * batchId)),
        Math.cos(0.02 * (0.02 * tick + 0.1 * batchId)),
        Math.sin(0.02 * ((0.3 + Math.cos(2.0 * batchId)) * tick + 0.8 * batchId)),
        1
        ],
        angle: ({tick}) => angleSpeed * tick,
        offset: regl.prop('offset')
    },
    
    depth: {
        enable: false
    },
    
    count: 3    
})

// Here we register a per-frame callback to draw the whole scene
regl.frame(function () {
    regl.clear({
        color
    })
    
    // This tells regl to execute the command once for each object
    draw([
        { offset: [-1, -1] },
        { offset: [-1, 0] },
        { offset: [-1, 1] },
        { offset: [0, -1] },
        { offset: [0, 0] },
        { offset: [0, 1] },
        { offset: [1, -1] },
        { offset: [1, 0] },
        { offset: [1, 1] }
    ])
})`,
};