const { packages } = require('./packages');

exports.reglExample2 = {
	series_name: 'regl-2-',
	params: {
		max_supply: '20',
		enforce_unique_args: true,
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

const mouse = {x: 0, y: 0}
window.onmousemove = (e) => {
    mouse.x = e.clientX  
    mouse.y = e.clientY 
} 
const speed = {{speed}}

/// normal regl example

// As usual, we start by creating a full screen regl object
const regl = createREGL() 

const pixels = regl.texture() 

const drawFeedback = regl({
  frag: \`
  precision mediump float;
  uniform sampler2D texture;
  uniform vec2 mouse;
  uniform float t;
  varying vec2 uv;
  void main () {
    float dist = length(gl_FragCoord.xy - mouse);
    gl_FragColor = vec4(0.98 * texture2D(texture,
      uv + cos(t) * vec2(0.5 - uv.y, uv.x - 0.5) - sin(2.0 * t) * (uv - 0.5)).rgb, 1) +
      exp(-0.01 * dist) * vec4(
        1.0 + cos(2.0 * t),
        1.0 + cos(2.0 * t + 1.5),
        1.0 + cos(2.0 * t + 3.0),
        0.0);
  }\`, 

  vert: \`
  precision mediump float;
  attribute vec2 position;
  varying vec2 uv;
  void main () {
    uv = position;
    gl_Position = vec4(2.0 * position - 1.0, 0, 1);
  }\`,

  attributes: {
    position: [
      -2, 0,
      0, -2,
      2, 2]
  },

  uniforms: {
    texture: pixels,
    mouse: ({pixelRatio, viewportHeight}) => [
       mouse.x * pixelRatio,
       viewportHeight - mouse.y * pixelRatio
    ],
    t: ({tick}) => speed * tick
  },

  count: 3
})

regl.frame(function () {
  regl.clear({
    color: [0, 0, 0, 1]
  })

  drawFeedback()

  pixels({
    copy: true
  })
}) `,
};