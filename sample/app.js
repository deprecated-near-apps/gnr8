// Easily control the number of particles via `?p={N}` query param.

console.clear();

const widthHeightMin = Math.min(window.innerWidth, window.innerHeight);
const smallScreen = widthHeightMin < 450;
const urlParams = new URLSearchParams(window.location.search);
const requestedParticleCount = parseInt(urlParams.get('p'), 10);
const defaultParticleCount = smallScreen ? 300000 : 1000000;
const particleCount = requestedParticleCount || defaultParticleCount;
// Don't render at full resolution on large, high-dpi screens.
// I've noticed a MacBook Pro struggles with 1M particles at full retina resolution,
// but it will run fine at 1080p.
const dpr = smallScreen ? (window.devicePixelRatio || 1) : 1;

const regl = createREGL({ pixelRatio: dpr });


// Use JavaScript to generate data for each particle. This data will be uploaded
// to the GPU where the vertex shader will iterate over it.

function makeParticleOffsetsBuffer() {
	console.time('makeParticleOffsetsBuffer');
	const offsets = new Float32Array(3 * particleCount);
	for (let i=0; i<particleCount; i++) {
		const offsetX = Math.random() * 2 - 1;
		const offsetY = Math.random() * 0.9 + 0.1;
		const offsetTime = Math.random();
		const startIndex = i * 3;
		offsets[startIndex] = offsetX;
		offsets[startIndex+1] = offsetY;
		offsets[startIndex+2] = offsetTime;
	}
	console.timeEnd('makeParticleOffsetsBuffer');
	return regl.buffer(offsets);
}

// Here's an old version of the above function I wrote. Regl automatically converts standard JS arrays into TypedArrays, and even flattens 2D arrays. This function takes advantage of that. However with a million particles, all the additional array creation and flattening takes time. This function took 65ms - 80ms to execute for me. Not bad, but the new version that just uses a Float32Array from the start only takes 25ms.
/*
function makeParticleOffsetsBufferOld() {
	console.time('makeParticleOffsetsOld');
	const offsets = [];
	for (let i=0; i<particleCount; i++) {
		const offsetX = Math.random() * 2 - 1;
		const offsetY = Math.random() * 0.9 + 0.1;
		const offsetTime = Math.random();
		offsets.push([offsetX, offsetY, offsetTime]);
	}
	console.timeEnd('makeParticleOffsetsOld');
	return regl.buffer(offsets);
}
*/


const drawParticles = regl({
	vert: `
		precision highp float;

		attribute vec3 a_offset;
		uniform float u_time;
		uniform float u_pointSize;
		varying float v_life;

		const float PI = 3.14159;
		const float lifetime = 5.0;
		const float height = 0.92;

		void main() {
			float currentTime = u_time + a_offset.z * lifetime;
			v_life = mod(currentTime, lifetime) / lifetime;
			// First 35% of life represents first 50% of animation progress, last 65% of life
			// represents last 50% of animation.
			float progress = v_life < 0.35 ? (v_life / 0.35 * 0.5) : ((v_life - 0.35) / 0.65 * 0.5 + 0.5);
			// Further, we scale the progress based on how high the particles will go.
			// Lower particles will play faster, to give the fountain a better sense of speed.
			float scaledProgress = clamp(progress / pow(a_offset.y, 0.65), 0.0, 1.0);
			float x = a_offset.x * scaledProgress;
			float y = -1.0 + a_offset.y * 2.0 * height * sin(scaledProgress * PI);

			gl_PointSize = u_pointSize * ((1.0 - progress) * 0.75 + 0.25);
			gl_Position = vec4(x, y, 0, 1);
		}
	`,
	frag: `
		precision highp float;

		varying float v_life;

		// Render a 3-stop gradient based on particle life
		const vec3 color1 = vec3(1.0, 0.6, 0.0);
		const vec3 color2 = vec3(0.769, 0.498, 0.945);
		const vec3 color3 = vec3(0.0, 0.6, 1.0);

		void main() {
			bool firstHalf = v_life < 0.5;
			vec3 color = firstHalf ? mix(color1, color2, (v_life * 2.0)) : mix(color2, color3, ((v_life - 0.5) * 2.0));
			gl_FragColor = vec4(color, 1.0);
		}
	`,
	attributes: {
		a_offset: makeParticleOffsetsBuffer()
	},
	uniforms: {
		u_time: regl.prop('u_time'),
		u_pointSize: regl.prop('u_pointSize')
	},
	count: particleCount,
	primitive: 'points'
});


let slowmo = false;
let prevTime = 0;
let currentTime = 0;

regl.frame(({ time }) => {
	const timeDelta = time - prevTime;
	prevTime = time;
	currentTime += slowmo ? timeDelta / 4 : timeDelta
	const canvasPixels = window.innerWidth * window.innerHeight * dpr * dpr;
	const particleSize = Math.sqrt(canvasPixels / particleCount);
	regl.clear({ color: [0, 0, 0, 1] });
	drawParticles({
		u_time: currentTime,
		u_pointSize: particleSize
	});
});

document.querySelector('canvas').addEventListener('click', () => {
	slowmo = !slowmo;
});
