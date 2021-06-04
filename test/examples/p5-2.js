
exports.p52 = {
    series_name: 'Processing 3D',
    src: `
@params
{
    packages: ['p5@1.3.1'],
    max_supply: '100',
    enforce_unique_mint_args: true,
    enforce_unique_owner_args: true,
    mint: {
        backgroundColor: {
            default: [255, 200, 0],
            type: 'color-arr',
        },
    },
    owner: {
        objectColor: {
            default: [255, 255, 255],
            type: 'color-arr',
        },
        lightColor: {
            default: [128, 64, 128],
            type: 'color-arr',
        },
        rotateSpeed: {
            default: 0.01,
            type: 'float',
        },
    }
}
@params

@css
body { margin: 0; overflow: hidden; }
@css

@js

const backgroundColor = {{ backgroundColor }}
const objectColor = {{ objectColor   }}
const lightColor = {{ lightColor }}
const rotateSpeed = {{ rotateSpeed }}

let width;
let height;
let offset = 0;
function setup() {
    width = window.innerWidth
    height = window.innerHeight
    createCanvas(width, height, WEBGL);
}

function draw() {
    background(backgroundColor);
    let radius = width * 1.5;

    offset += rotateSpeed;

    //drag to move the world.
    orbitControl();

    noStroke()
    pointLight(lightColor, 0, 0, 1);
    ambientMaterial(objectColor);
    translate(0, 0, -600);
    rotateY(offset);
    for (let i = 0; i <= 12; i++) {
        for (let j = 0; j <= 12; j++) {
            push();
            let a = (j / 12) * PI;
            let b = (i / 12) * PI;
            translate(
                sin(2 * a) * radius * sin(b),
                (cos(b) * radius) / 2,
                cos(2 * a) * radius * sin(b)
            );
            if (j % 3 === 0) {
                cone(30, 30);
            } else if (j % 3 === 1) {
                box(30, 30, 30);
            } else {
                sphere(30);
            }
            pop();
        }
    }
}
@js

`};







