exports.three4 = {
	series_name: 'Perlin Volume',
	src: `
@params
{
	packages: ["three.js@r128"],
	max_supply: '100',
	mint: {
		backgroundColor: {
			default: [1, 0, 0],
			type: 'color-webgl',
		},
	},
	owner: {
		size: {
			default: 4,
			type: 'int',
			min: 1,
			max: 5,
		},
		density: {
			default: 0.5,
			type: 'float',
			min: 0.1,
			max: 1,
		},
		noiseDensity: {
			default: 25,
			type: 'int',
			min: 1,
			max: 25,
		},
	}
}
@params

@css
	body { margin: 0; overflow: hidden; }
@css

@html
<div id="container"></div>
@html

@js

// http://mrl.nyu.edu/~perlin/noise/

const _p = [151, 160, 137, 91, 90, 15, 131, 13, 201, 95, 96, 53, 194, 233, 7, 225, 140, 36, 103, 30, 69, 142, 8, 99, 37, 240, 21, 10,
	23, 190, 6, 148, 247, 120, 234, 75, 0, 26, 197, 62, 94, 252, 219, 203, 117, 35, 11, 32, 57, 177, 33, 88, 237, 149, 56, 87,
	174, 20, 125, 136, 171, 168, 68, 175, 74, 165, 71, 134, 139, 48, 27, 166, 77, 146, 158, 231, 83, 111, 229, 122, 60, 211,
	133, 230, 220, 105, 92, 41, 55, 46, 245, 40, 244, 102, 143, 54, 65, 25, 63, 161, 1, 216, 80, 73, 209, 76, 132, 187, 208,
	89, 18, 169, 200, 196, 135, 130, 116, 188, 159, 86, 164, 100, 109, 198, 173, 186, 3, 64, 52, 217, 226, 250, 124, 123, 5,
	202, 38, 147, 118, 126, 255, 82, 85, 212, 207, 206, 59, 227, 47, 16, 58, 17, 182, 189, 28, 42, 223, 183, 170, 213, 119,
	248, 152, 2, 44, 154, 163, 70, 221, 153, 101, 155, 167, 43, 172, 9, 129, 22, 39, 253, 19, 98, 108, 110, 79, 113, 224, 232,
	178, 185, 112, 104, 218, 246, 97, 228, 251, 34, 242, 193, 238, 210, 144, 12, 191, 179, 162, 241, 81, 51, 145, 235, 249,
	14, 239, 107, 49, 192, 214, 31, 181, 199, 106, 157, 184, 84, 204, 176, 115, 121, 50, 45, 127, 4, 150, 254, 138, 236, 205,
	93, 222, 114, 67, 29, 24, 72, 243, 141, 128, 195, 78, 66, 215, 61, 156, 180];

for (let i = 0; i < 256; i++) {

	_p[256 + i] = _p[i];

}

function fade(t) {

	return t * t * t * (t * (t * 6 - 15) + 10);

}

function lerp(t, a, b) {

	return a + t * (b - a);

}

function grad(hash, x, y, z) {

	const h = hash & 15;
	const u = h < 8 ? x : y, v = h < 4 ? y : h == 12 || h == 14 ? x : z;
	return ((h & 1) == 0 ? u : - u) + ((h & 2) == 0 ? v : - v);

}

class ImprovedNoise {

	noise(x, y, z) {

		const floorX = Math.floor(x), floorY = Math.floor(y), floorZ = Math.floor(z);

		const X = floorX & 255, Y = floorY & 255, Z = floorZ & 255;

		x -= floorX;
		y -= floorY;
		z -= floorZ;

		const xMinus1 = x - 1, yMinus1 = y - 1, zMinus1 = z - 1;

		const u = fade(x), v = fade(y), w = fade(z);

		const A = _p[X] + Y, AA = _p[A] + Z, AB = _p[A + 1] + Z, B = _p[X + 1] + Y, BA = _p[B] + Z, BB = _p[B + 1] + Z;

		return lerp(w, lerp(v, lerp(u, grad(_p[AA], x, y, z),
			grad(_p[BA], xMinus1, y, z)),
			lerp(u, grad(_p[AB], x, yMinus1, z),
				grad(_p[BB], xMinus1, yMinus1, z))),
			lerp(v, lerp(u, grad(_p[AA + 1], x, y, zMinus1),
				grad(_p[BA + 1], xMinus1, y, zMinus1)),
				lerp(u, grad(_p[AB + 1], x, yMinus1, zMinus1),
					grad(_p[BB + 1], xMinus1, yMinus1, zMinus1))));

	}

}

const backgroundColor = {{ backgroundColor }}
const size = {{ size }}
const density = {{ density }}
const noiseDensity = {{ noiseDensity }}
let step = 0;
let renderer, scene, camera;
let mesh, texture, data, perlin;
let cameraAngle = 0;
let cameraRad = 5 - size;

const perlinSize = 64;
let mouseX = 0, mouseY = 0

const width = window.innerWidth, height = window.innerHeight


init();
animate();

document.body.querySelector('canvas').onmousemove = (e) => {
	mouseX = e.clientX
	mouseY = e.clientY
}

function setData () {
	let i = 0
	const vector = new THREE.Vector3();

	for (let z = 0; z < perlinSize; z++) {

		for (let y = 0; y < perlinSize; y++) {

			for (let x = 0; x < perlinSize; x++) {

				vector.set(x, y, z).divideScalar(perlinSize);

				const d = perlin.noise(vector.x * noiseDensity + mouseX/width*20, vector.y * noiseDensity + mouseY/width*20, vector.z * noiseDensity);

				data[i++] = d * 128 + 128;

			}

		}

	}

	texture.needsUpdate = true
}

function init() {

	container = document.getElementById('container');

	renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
	renderer.setPixelRatio(window.devicePixelRatio);
	renderer.setSize(width, height);
	const bg = new THREE.Color( ...backgroundColor );
	renderer.setClearColor(bg, 1)
	container.appendChild(renderer.domElement);

	scene = new THREE.Scene();

	camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
	camera.position.set(0, 0, 2);
	camera.lookAt(0, 0, 0)
	// Texture

	data = new Uint8Array(perlinSize * perlinSize * perlinSize);
	perlin = new ImprovedNoise();

	texture = new THREE.DataTexture3D(data, perlinSize, perlinSize, perlinSize);
	texture.format = THREE.RedFormat;
	texture.minFilter = THREE.LinearFilter;
	texture.magFilter = THREE.LinearFilter;
	texture.unpackAlignment = 1;

	// Material

	const vertexShader = \`
		in vec3 position;
		uniform mat4 modelMatrix;
		uniform mat4 modelViewMatrix;
		uniform mat4 projectionMatrix;
		uniform vec3 cameraPos;
		out vec3 vOrigin;
		out vec3 vDirection;
		void main() {
			vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
			vOrigin = vec3( inverse( modelMatrix ) * vec4( cameraPos, 1.0 ) ).xyz;
			vDirection = position - vOrigin;
			gl_Position = projectionMatrix * mvPosition;
		}
	\`;

	const fragmentShader = \`
		precision highp float;
		precision highp sampler3D;
		uniform mat4 modelViewMatrix;
		uniform mat4 projectionMatrix;
		in vec3 vOrigin;
		in vec3 vDirection;
		out vec4 color;
		uniform sampler3D map;
		uniform float threshold;
		uniform float steps;
		vec2 hitBox( vec3 orig, vec3 dir ) {
			const vec3 box_min = vec3( - 0.5 );
			const vec3 box_max = vec3( 0.5 );
			vec3 inv_dir = 1.0 / dir;
			vec3 tmin_tmp = ( box_min - orig ) * inv_dir;
			vec3 tmax_tmp = ( box_max - orig ) * inv_dir;
			vec3 tmin = min( tmin_tmp, tmax_tmp );
			vec3 tmax = max( tmin_tmp, tmax_tmp );
			float t0 = max( tmin.x, max( tmin.y, tmin.z ) );
			float t1 = min( tmax.x, min( tmax.y, tmax.z ) );
			return vec2( t0, t1 );
		}
		float sample1( vec3 p ) {
			return texture( map, p ).r;
		}
		vec3 normal( vec3 coord ) {
			if ( coord.x < .0001 ) return vec3( 1.0, 0.0, 0.0 );
			if ( coord.y < .0001 ) return vec3( 0.0, 1.0, 0.0 );
			if ( coord.z < .0001 ) return vec3( 0.0, 0.0, 1.0 );
			if ( coord.x > 1.0 - .0001 ) return vec3( - 1.0, 0.0, 0.0 );
			if ( coord.y > 1.0 - .0001 ) return vec3( 0.0, - 1.0, 0.0 );
			if ( coord.z > 1.0 - .0001 ) return vec3( 0.0, 0.0, - 1.0 );
			float step = 0.01;
			float x = sample1( coord + vec3( - step, 0.0, 0.0 ) ) - sample1( coord + vec3( step, 0.0, 0.0 ) );
			float y = sample1( coord + vec3( 0.0, - step, 0.0 ) ) - sample1( coord + vec3( 0.0, step, 0.0 ) );
			float z = sample1( coord + vec3( 0.0, 0.0, - step ) ) - sample1( coord + vec3( 0.0, 0.0, step ) );
			return normalize( vec3( x, y, z ) );
		}
		void main(){
			vec3 rayDir = normalize( vDirection );
			vec2 bounds = hitBox( vOrigin, rayDir );
			if ( bounds.x > bounds.y ) discard;
			bounds.x = max( bounds.x, 0.0 );
			vec3 p = vOrigin + bounds.x * rayDir;
			vec3 inc = 1.0 / abs( rayDir );
			float delta = min( inc.x, min( inc.y, inc.z ) );
			delta /= steps;
			for ( float t = bounds.x; t < bounds.y; t += delta ) {
				float d = sample1( p + 0.5 );
				if ( d > threshold ) {
					color.rgb = normal( p + 0.5 ) * 0.5 + ( p * 1.5 + 0.25 );
					color.a = 1.;
					break;
				}
				p += rayDir * delta;
			}
			if ( color.a == 0.0 ) discard;
		}
	\`;

	const geometry = new THREE.BoxGeometry(1, 1, 1);
	const material = new THREE.RawShaderMaterial({
		glslVersion: THREE.GLSL3,
		uniforms: {
			map: { value: texture },
			cameraPos: { value: new THREE.Vector3() },
			threshold: { value: density },
			steps: { value: 200 }
		},
		vertexShader,
		fragmentShader,
		side: THREE.BackSide,
	});

	mesh = new THREE.Mesh(geometry, material);


	texture.onUpdate = () => {
		mesh.material.uniforms.map.value.copy(texture);
	}

	scene.add(mesh);

	window.addEventListener('resize', onWindowResize);
}

function onWindowResize() {

	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();

	renderer.setSize(window.innerWidth, window.innerHeight);

}

function animate() {

	setData()

	requestAnimationFrame(animate);

	mesh.material.uniforms.cameraPos.value.copy(camera.position);

	cameraAngle += Math.PI / 512
	camera.position.set(Math.cos(cameraAngle) * cameraRad, Math.cos(cameraAngle) * 1, Math.sin(cameraAngle) * cameraRad);
	camera.lookAt(0, 0, 0)

	renderer.render(scene, camera);

}
@js
	
`
};
















