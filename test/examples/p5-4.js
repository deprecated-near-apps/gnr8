

exports.p54 = {
    series_name: 'L System',
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
            default: [255, 200, 100],
            type: 'color-arr',
        },
    },
    owner: {
        speed: {
            default: 30,
            type: 'int',
            min: 30,
            max: 120,
        },
        tilt: {
            default: 0,
            type: 'int',
            min: 0,
            max: 15,
        },
        size: {
            default: [10, 30],
            type: 'int-min-max',
            min: 1,
            max: 100,
        },
        red: {
            default: [128, 255],
            type: 'int-min-max',
            min: 0,
            max: 255,
        },
        green: {
            default: [0, 192],
            type: 'int-min-max',
            min: 0,
            max: 255,
        },
        blue: {
            default: [0, 50],
            type: 'int-min-max',
            min: 0,
            max: 255,
        },
        opacity: {
            default: [50, 100],
            type: 'int-min-max',
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
const speed = {{ speed }}
const size = {{ size }}
const tilt = {{ tilt }}
const red = {{ red }}
const green = {{ green }}
const blue = {{ blue }}
const opacity = {{ opacity }}
const backgroundColor = {{ backgroundColor }}
// TURTLE STUFF:
let x, y; // the current position of the turtle
let currentangle = 0; // which way the turtle is pointing
let step = size[1]; // how much the turtle moves with each 'F'
let angle = 90 + tilt; // how much the turtle turns with a '-' or '+'

// LINDENMAYER STUFF (L-SYSTEMS)
let thestring = 'A'; // "axiom" or start of the string
let numloops = 5; // how many iterations to pre-compute
let therules = []; // array for rules
therules[0] = ['A', '-BF+AFA+FB-']; // first rule
therules[1] = ['B', '+AF-BFB-FA+']; // second rule

let whereinstring = 0; // where in the L-system are we?

let width, height;
function setup() {
    width = window.innerWidth;
    height = window.innerHeight;
    createCanvas(width, height);
    randomSeed(seed);
    frameRate(speed);
    background(backgroundColor);
    stroke(0, 0, 0, 255);

    // start the x and y position at lower-left corner
    x = 0;
    y = height - 1;

    // COMPUTE THE L-SYSTEM
    for (let i = 0; i < numloops; i++) {
        thestring = lindenmayer(thestring);
    }
}

function draw() {

    // draw the current character in the string:
    drawIt(thestring[whereinstring]);

    // increment the point for where we're reading the string.
    // wrap around at the end.
    whereinstring++;
    if (whereinstring > thestring.length - 1) whereinstring = 0;

}

// interpret an L-system
function lindenmayer(s) {
    let outputstring = ''; // start a blank output string

    // iterate through 'therules' looking for symbol matches:
    for (let i = 0; i < s.length; i++) {
        let ismatch = 0; // by default, no match
        for (let j = 0; j < therules.length; j++) {
            if (s[i] == therules[j][0]) {
                outputstring += therules[j][1]; // write substitution
                ismatch = 1; // we have a match, so don't copy over symbol
                break; // get outta this for() loop
            }
        }
        // if nothing matches, just copy the symbol over.
        if (ismatch == 0) outputstring += s[i];
    }

    return outputstring; // send out the modified string
}

// this is a custom function that draws turtle commands
function drawIt(k) {

    if (k == 'F') { // draw forward
        // polar to cartesian based on step and currentangle:
        let x1 = x + step * cos(radians(currentangle));
        let y1 = y + step * sin(radians(currentangle));
        line(x, y, x1, y1); // connect the old and the new

        // update the turtle's position:
        x = x1;
        y = y1;
    } else if (k == '+') {
        currentangle += angle; // turn left
    } else if (k == '-') {
        currentangle -= angle; // turn right
    }

    // give me some random color values:
    let r = random(...red);
    let g = random(...green);
    let b = random(...blue);
    let a = random(...opacity);

    // pick a gaussian (D&D) distribution for the radius:
    let radius = 0;
    radius += random(...size);
    radius += random(...size);
    radius += random(...size);
    radius = radius / 3;

    // draw the stuff:
    fill(r, g, b, a);
    ellipse(x, y, radius, radius);
}
@js
`
}







