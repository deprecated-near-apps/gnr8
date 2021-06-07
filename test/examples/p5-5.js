

exports.p55 = {
	series_name: 'Spirograph',
	src: `
@params
{
    packages: ['p5@1.3.1'],
    max_supply: '100',
    mint: {
        seed: {
            default: 0,
            type: 'int',
        },
        backgroundColor: {
            default: [255, 200, 255],
            type: 'color-arr',
        },
    },
    owner: {
        amount: {
            default: 8,
            type: 'int',
            min: 10,
            max: 50,
        },
        speed: {
            default: 0.015,
            type: 'float',
            min: 0.001,
            max: 0.1,
        },
        noise_speed: {
            default: 50,
            type: 'int',
            min: 0,
            max: 100,
        },
        size: {
            default: 10,
            type: 'int',
            min: 1,
            max: 50,
        },
        step_random: {
            default: 100,
            type: 'int',
            min: 0,
            max: 200,
        },
        color_one: {
            default: [255, 255, 0],
            type: 'color-arr',
        },
        color_two: {
            default: [0, 255, 255],
            type: 'color-arr',
        },
        opacity: {
            default: 127,
            type: 'int',
            min: 0,
            max: 255,
        },
    }
}
@params

@css
body { margin: 0; overflow: hidden; }
@css

@js
const seed = {{ seed }}
const amount = {{ amount }}
const backgroundColor = {{ backgroundColor }}
const speed = {{ speed }}
const noise_speed = {{ noise_speed }}
const size = {{ size }}
const step_random = {{ step_random }}
const color_one = {{ color_one }}
const color_two = {{ color_two }}
let sines = new Array(amount); // an array to hold all the current angles
let rad; // an initial radius value for the central sine
let i; // a counter variable

// play with these to get a sense of what's going on:
let fund = speed; // the speed of the central sine
let ratio = 1; // what multiplier for speed is each additional sine?
let alpha = {{ opacity }}; // how opaque is the tracing system

let trace = true; // are we tracing?

let width, height;
function setup() {
    width = window.innerWidth;
    height = window.innerHeight;
    createCanvas(width, height);
    frameRate(120)
    noiseSeed(seed)

    rad = height / 4; // compute radius for central circle
    background(backgroundColor); // clear screen if showing geometry

    for (let i = 0; i < sines.length; i++) {
        sines[i] = PI; // start EVERYBODY facing NORTH
    }
}

function draw() {
    if (!trace) {
        background(backgroundColor); // clear screen if showing geometry
        noFill(); // don't fill
    }
    text('click me', 10, 20);

    // MAIN ACTION
    push(); // start a transformation matrix
    translate(width / 2, height / 2); // move to middle of screen

    let randNoise = noise(frameCount / 10 * noise_speed / 100)
    let randRad = step_random * randNoise - step_random / 2

    let r = randNoise * color_one[0] + (1 - randNoise) * color_two[0]
    let g = randNoise * color_one[1] + (1 - randNoise) * color_two[1]
    let b = randNoise * color_one[2] + (1 - randNoise) * color_two[2]


    for (let i = 0; i < sines.length; i++) {
        let erad = 0; // radius for small "point" within circle... this is the 'pen' when tracing
        // setup for tracing
        if (trace) {
            noStroke()
            fill(r, g, b, alpha / 2); // also, um, blue
            erad = randNoise * size * sines.length / i; // pen width will be related to which sine
        }

        let radius = rad / (i + 1); // radius for circle itself

        rotate(sines[i]); // rotate circle
        if (!trace) ellipse(0, 0, radius * 2, radius * 2); // if we're simulating, draw the sine
        push(); // go up one level
        translate(0, radius + randRad); // move to sine edge
        if (!trace) ellipse(0, 0, 5, 5); // draw a little circle
        if (trace) ellipse(0, 0, erad, erad); // draw with erad if tracing
        pop(); // go down one level
        translate(0, radius); // move into position for next sine
        sines[i] = (sines[i] + (fund + (fund * i * ratio))) % TWO_PI; // update angle based on fundamental
    }

    pop(); // pop down final transformation

}

function mouseClicked() {
    trace = !trace;
    background(backgroundColor); // clear screen if showing geometry
}

@js

`
};










