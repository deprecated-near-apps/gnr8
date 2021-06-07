

exports.p57 = {
	series_name: 'Processing Audio',
	src: `
@params
{
    packages: ["p5-cf@1.3.1","p5.sound@1.3.1"],
    max_supply: '100',
    mint: {
        backgroundColor: {
            default: [255, 223, 200],
            type: 'color-arr',
        },
        clear: {
            default: 5,
            type: 'int',
            min: 5,
            max: 255,
        },
    },
    owner: {
        size: {
            default: 5,
            type: 'int',
            min: 1,
            max: 20,
        },
        life: {
            default: 255,
            type: 'int',
            min: 128,
            max: 1024,
        },
        color_one: {
            default: [255, 100, 100],
            type: 'color-arr',
        },
        color_two: {
            default: [100, 255, 100],
            type: 'color-arr',
        },
        noise_speed: {
            default: 10, 
            type: 'int',
            min: 0,
            max: 100,
        },
        opacity: {
            default: 255,
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
let mic, fft;

function setup() {
    createCanvas(710, 400);
    noFill();

    mic = new p5.AudioIn();
    mic.start();
    fft = new p5.FFT();
    fft.setInput(mic);
}

function draw() {
    background(200);

    let spectrum = fft.analyze();

    beginShape();
    for (i = 0; i < spectrum.length; i++) {
        vertex(i, map(spectrum[i], 0, 255, height, 0));
    }
    endShape();
}
@js


`
};






























