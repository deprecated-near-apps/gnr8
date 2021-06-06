

exports.p56 = {
    series_name: 'Flocking',
    src: `
@params
{
    packages: ['p5@1.3.1'],
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

const backgroundColor = {{ backgroundColor }}
const size = {{ size }}
const life = {{ life }}
const noise_speed = {{ noise_speed }}
const color_one = {{ color_one }}
const color_two = {{ color_two }}
const opacity = {{ opacity }}
const clear = {{ clear }}

let flock;

let width, height;
function setup() {
    width = window.innerWidth;
    height = window.innerHeight;
    createCanvas(width, height);
    createP("Drag the mouse to generate new boids.");

    flock = new Flock();
    // Add an initial set of boids into the system
    for (let i = 0; i < 100; i++) {
        let b = new Boid(width / 2, height / 2);
        flock.addBoid(b);
    }
}

function draw() {
    //   background(backgroundColor, 100);
    fill(...backgroundColor, clear)
    rect(0, 0, width, height)
    flock.run();
}

// Add a new boid into the System
function mouseDragged() {
    flock.addBoid(new Boid(mouseX, mouseY));
}

// The Nature of Code
// Daniel Shiffman
// http://natureofcode.com

// Flock object
// Does very little, simply manages the array of all the boids

function Flock() {
    // An array for all the boids
    this.boids = []; // Initialize the array
}

Flock.prototype.run = function () {
    for (let i = 0; i < this.boids.length; i++) {
        this.boids[i].run(this.boids);  // Passing the entire list of boids to each boid individually
    }
}

Flock.prototype.addBoid = function (b) {
    this.boids.push(b);
}
Flock.prototype.removeBoid = function (b) {
    this.boids.splice(this.boids.indexOf(b), 1);
}

// The Nature of Code
// Daniel Shiffman
// http://natureofcode.com

// Boid class
// Methods for Separation, Cohesion, Alignment added

function Boid(x, y) {
    this.acceleration = createVector(0, 0);
    this.velocity = createVector(random(-1, 1), random(-1, 1));
    this.position = createVector(x, y);
    this.r = size;
    this.maxspeed = 3;    // Maximum speed
    this.maxforce = 0.05; // Maximum steering force
    this.life = life + random() * life
}

Boid.prototype.run = function (boids) {
    this.flock(boids);
    this.update();
    this.borders();
    this.render();
    this.life--
    if (this.life == 0) {
        flock.removeBoid(this)
    }
}

Boid.prototype.applyForce = function (force) {
    // We could add mass here if we want A = F / M
    this.acceleration.add(force);
}

// We accumulate a new acceleration each time based on three rules
Boid.prototype.flock = function (boids) {
    let sep = this.separate(boids);   // Separation
    let ali = this.align(boids);      // Alignment
    let coh = this.cohesion(boids);   // Cohesion
    // Arbitrarily weight these forces
    sep.mult(1.5);
    ali.mult(1.0);
    coh.mult(1.0);
    // Add the force vectors to acceleration
    this.applyForce(sep);
    this.applyForce(ali);
    this.applyForce(coh);
}

// Method to update location
Boid.prototype.update = function () {
    // Update velocity
    this.velocity.add(this.acceleration);
    // Limit speed
    this.velocity.limit(this.maxspeed);
    this.position.add(this.velocity);
    // Reset accelertion to 0 each cycle
    this.acceleration.mult(0);
}

// A method that calculates and applies a steering force towards a target
// STEER = DESIRED MINUS VELOCITY
Boid.prototype.seek = function (target) {
    let desired = p5.Vector.sub(target, this.position);  // A vector pointing from the location to the target
    // Normalize desired and scale to maximum speed
    desired.normalize();
    desired.mult(this.maxspeed);
    // Steering = Desired minus Velocity
    let steer = p5.Vector.sub(desired, this.velocity);
    steer.limit(this.maxforce);  // Limit to maximum steering force
    return steer;
}

Boid.prototype.render = function () {
    // Draw a triangle rotated in the direction of velocity
    let theta = this.velocity.heading() + radians(90);


    let randNoise = noise(frameCount / 40 * noise_speed / 100)

    let r = randNoise * color_one[0] + (1 - randNoise) * color_two[0]
    let g = randNoise * color_one[1] + (1 - randNoise) * color_two[1]
    let b = randNoise * color_one[2] + (1 - randNoise) * color_two[2]

    if (this.life < 255) {
        fill(r, g, b, this.life);
    } else {

        fill(r, g, b, opacity);
    }
    noStroke();
    push();
    translate(this.position.x, this.position.y);
    rotate(theta);
    beginShape();
    vertex(0, -this.r * 2);
    vertex(-this.r, this.r * 2);
    vertex(this.r, this.r * 2);
    endShape(CLOSE);
    pop();
}

// Wraparound
Boid.prototype.borders = function () {
    if (this.position.x < -this.r) this.position.x = width + this.r;
    if (this.position.y < -this.r) this.position.y = height + this.r;
    if (this.position.x > width + this.r) this.position.x = -this.r;
    if (this.position.y > height + this.r) this.position.y = -this.r;
}

// Separation
// Method checks for nearby boids and steers away
Boid.prototype.separate = function (boids) {
    let desiredseparation = 25.0;
    let steer = createVector(0, 0);
    let count = 0;
    // For every boid in the system, check if it's too close
    for (let i = 0; i < boids.length; i++) {
        let d = p5.Vector.dist(this.position, boids[i].position);
        // If the distance is greater than 0 and less than an arbitrary amount (0 when you are yourself)
        if ((d > 0) && (d < desiredseparation)) {
            // Calculate vector pointing away from neighbor
            let diff = p5.Vector.sub(this.position, boids[i].position);
            diff.normalize();
            diff.div(d);        // Weight by distance
            steer.add(diff);
            count++;            // Keep track of how many
        }
    }
    // Average -- divide by how many
    if (count > 0) {
        steer.div(count);
    }

    // As long as the vector is greater than 0
    if (steer.mag() > 0) {
        // Implement Reynolds: Steering = Desired - Velocity
        steer.normalize();
        steer.mult(this.maxspeed);
        steer.sub(this.velocity);
        steer.limit(this.maxforce);
    }
    return steer;
}

// Alignment
// For every nearby boid in the system, calculate the average velocity
Boid.prototype.align = function (boids) {
    let neighbordist = 50;
    let sum = createVector(0, 0);
    let count = 0;
    for (let i = 0; i < boids.length; i++) {
        let d = p5.Vector.dist(this.position, boids[i].position);
        if ((d > 0) && (d < neighbordist)) {
            sum.add(boids[i].velocity);
            count++;
        }
    }
    if (count > 0) {
        sum.div(count);
        sum.normalize();
        sum.mult(this.maxspeed);
        let steer = p5.Vector.sub(sum, this.velocity);
        steer.limit(this.maxforce);
        return steer;
    } else {
        return createVector(0, 0);
    }
}

// Cohesion
// For the average location (i.e. center) of all nearby boids, calculate steering vector towards that location
Boid.prototype.cohesion = function (boids) {
    let neighbordist = 50;
    let sum = createVector(0, 0);   // Start with empty vector to accumulate all locations
    let count = 0;
    for (let i = 0; i < boids.length; i++) {
        let d = p5.Vector.dist(this.position, boids[i].position);
        if ((d > 0) && (d < neighbordist)) {
            sum.add(boids[i].position); // Add location
            count++;
        }
    }
    if (count > 0) {
        sum.div(count);
        return this.seek(sum);  // Steer towards the location
    } else {
        return createVector(0, 0);
    }
}

@js
    

`
}













