

exports.p53 = {
	series_name: 'Processing Particles',
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
            default: [255, 0, 200],
            type: 'color-arr',
        },
        
        decaySpeed: {
            default: 2,
            type: 'int',
        },
    }
}
@params

@css
body { margin: 0; overflow: hidden; }
@css

@js

const backgroundColor = {{ backgroundColor }}
const objectColor = {{ objectColor }}
const decaySpeed = {{ decaySpeed }}

let system, width, height;

function setup() {
    width = window.innerWidth;
    height = window.innerHeight;
    createCanvas(width, height);
    system = new ParticleSystem(createVector(width / 2, 50));
}

function draw() {
    background(backgroundColor);

    system.addParticle();
    system.run();
}

// A simple Particle class
let Particle = function (position) {
    this.acceleration = createVector(0, 0.05);
    this.velocity = createVector(random(-1, 1), random(-1, 0));
    this.position = position.copy();
    this.lifespan = 255;
};

Particle.prototype.run = function () {
    this.update();
    this.display();
};

// Method to update position
Particle.prototype.update = function () {
    this.velocity.add(this.acceleration);
    this.position.add(this.velocity);
    this.lifespan -= decaySpeed;
};

// Method to display
Particle.prototype.display = function () {
    stroke(200, this.lifespan);
    strokeWeight(2);
    fill(...objectColor, this.lifespan);
    ellipse(this.position.x, this.position.y, 12, 12);
};

// Is the particle still useful?
Particle.prototype.isDead = function () {
    return this.lifespan < 0;
};

let ParticleSystem = function (position) {
    this.origin = position.copy();
    this.particles = [];
};

ParticleSystem.prototype.addParticle = function () {
    this.particles.push(new Particle(this.origin));
};

ParticleSystem.prototype.run = function () {
    for (let i = this.particles.length - 1; i >= 0; i--) {
        let p = this.particles[i];
        p.run();
        if (p.isDead()) {
            this.particles.splice(i, 1);
        }
    }
};

@js

`
};

