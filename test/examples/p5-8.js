exports.p58 = {
	series_name: 'Processing Music NFT',
	src: `

    @params
    {
        packages: ["p5-cf@1.3.1","p5.sound@1.3.1"],
        max_supply: '100',
        mint: {
            backgroundColor: {
                default: [255, 255, 255],
                type: 'color-arr',
            },
            clearSpeed: {
                default: 5,
                type: 'int',
                min: 0,
                max: 255,
            }, 
        },
        owner: {
            size: {
                default: 25,
                type: 'int',
                min: 1,
                max: 100,
            },
            noiseSpeed: {
                default: 50,
                type: 'int',
                min: 0,
                max: 100,
            },
            colorOne: {
                default: [255, 0, 0],
                type: 'color-arr',
            },
            colorTwo: {
                default: [0, 0, 255],
                type: 'color-arr',
            },
            opacity: {
                default: 100,
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
    
    const backgroundColor = {{ backgroundColor }}
    const size = {{ size }}
    const noiseSpeed = {{ noiseSpeed }}
    const colorOne = {{ colorOne }}
    const colorTwo = {{ colorTwo }}
    const opacity = {{ opacity }}
    const clearSpeed = {{ clearSpeed }}
    
    let mic, fft, width, height, w2, h2, clicked;
    fft = new p5.FFT();
    
    async function setup() {
        width = window.innerWidth;
        height = window.innerHeight;
        w2 = width/2
        h2 = height/2
        createCanvas(width, height);
        noStroke()
        let ctx = getAudioContext()
        ctx.suspend();
    
        await loadMusic(3);
        fft.setInput(await playMusic(ctx));        
    }
    function draw() {
        background(...backgroundColor, clearSpeed);
        if (!clicked) {
            textAlign(CENTER, CENTER);
            text('click me', width/2, height/2)
        }
    
        let spectrum = fft.analyze();
    
        let randNoise = noise(frameCount / 40 * noiseSpeed / 100)
    
        let r = randNoise * colorOne[0] + (1 - randNoise) * colorTwo[0]
        let g = randNoise * colorOne[1] + (1 - randNoise) * colorTwo[1]
        let b = randNoise * colorOne[2] + (1 - randNoise) * colorTwo[2]
        
        fill(r, g, b, opacity)
        // second half of spectrum is repetitive
        const len = spectrum.length/2
        let x, y, rad;
        for (i = 0; i < len; i++) {
            x = i/len * Math.PI * 2
            y = map(spectrum[i], 0, 255, h2, 0)
            rad = 1/(y/height*4) * size
            if (rad > h2) rad = h2
            ellipse(
                w2 + Math.cos(x) * y,
                h2 + Math.sin(x) * y,
                rad, rad
            )
        }
    }
    function mousePressed() {
        userStartAudio();
        clicked = true;
    }
    @js
                
`
};
