const { packages } = require('./packages');

exports.reglExample2 = {
	series_name: 'regl-2',
	params: {
		max_supply: '20',
		enforce_unique_mint_args: true,
		enforce_unique_owner_args: false,
		mint: [
			'speed'
		],
		owner: [],
		packages: ['regl@2.1.0']
	},
	perpetual_royalties: {
		'md1.testnet': 100,
		'si1.testnet': 100,
		'a1.testnet': 100,
		'a2.testnet': 100,
		'a3.testnet': 100,
	},
	src: `@params
{
    packages: ['regl@2.1.0'],
    max_supply: '20',
    mint: {
        speed: {
            default: 0.005,
            type: 'webgl-float',
        }
    },
    owner: {} 
}
@params

@js
const speed = {{speed}}

/// normal regl example

// As usual, we start by creating a full screen regl object
const regl = createREGL({ attributes: { preserveDrawingBuffer: true } }) 

const RADIUS = 512
const INITIAL_CONDITIONS = (Array(RADIUS * RADIUS * 4)).fill(0).map(
  () => Math.random() > 0.9 ? 255 : 0)

const state = (Array(2)).fill().map(() =>
  regl.framebuffer({
    color: regl.texture({
      radius: RADIUS,
      data: INITIAL_CONDITIONS,
      wrap: 'repeat'
    }),
    depthStencil: false
  }))

const updateLife = regl({
  frag: \`
  precision mediump float;
  uniform sampler2D prevState;
  varying vec2 uv;
  void main() {
    float n = 0.0;
    for(int dx=-1; dx<=1; ++dx)
    for(int dy=-1; dy<=1; ++dy) {
      n += texture2D(prevState, uv+vec2(dx,dy)/float($\{RADIUS\})).r;
    }
    float s = texture2D(prevState, uv).r;
    if(n > 3.0+s || n < 3.0) {
      gl_FragColor = vec4(0,0,0,1);
    } else {
      gl_FragColor = vec4(1,1,1,1);
    }
  }\`,

  framebuffer: ({tick}) => state[(tick + 1) % 2]
})

const setupQuad = regl({
  frag: \`
  precision mediump float;
  uniform sampler2D prevState;
  varying vec2 uv;
  void main() {
    float state = texture2D(prevState, uv).r;
    gl_FragColor = vec4(vec3(state), 1);
  }\`,

  vert: \`
  precision mediump float;
  attribute vec2 position;
  varying vec2 uv;
  void main() {
    uv = 0.5 * (position + 1.0);
    gl_Position = vec4(position, 0, 1);
  }\`,

  attributes: {
    position: [ -4, -4, 4, -4, 0, 4 ]
  },

  uniforms: {
    prevState: ({tick}) => state[tick % 2]
  },

  depth: { enable: false },

  count: 3
})

regl.frame(() => {
  setupQuad(() => {
    regl.draw()
    updateLife()
  })
})

@js

`,
};