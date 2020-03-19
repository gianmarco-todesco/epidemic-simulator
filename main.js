"use strict";
let canvas, ctx
let gCanvas, gCtx
let currentTime
let dots = []
let collisions = []
let width, height 

const gridSpace = 30
const dotRadius = 2.5
const maxSpeed = 30
let graphX = 0


window.onload = function() {
    canvas = document.getElementById('c')
    ctx = canvas.getContext('2d')
    width = canvas.clientWidth
    height = canvas.clientHeight    
    currentTime = performance.now()*0.001
    createDots()
    animate()

    gCanvas = document.getElementById('g')
    gCtx = gCanvas.getContext('2d')
    gCanvas.width = gCanvas.clientWidth
    gCanvas.height = gCanvas.clientHeight
    setInterval(updateGraph, 100)
}

function updateGraph() {
    if(graphX > gCanvas.width) return;
    let n = dots.length
    let ns = 0, ni = 0, nr = 0, nd = 0
    dots.forEach(dot => {
        switch(dot.state) {
            case 0: ns++; break
            case 1: ni++; break
            case 2: nr++; break
            case 3: nd++; break
        }
    })
    let x = graphX++;
    let h = gCanvas.height
    gCtx.fillStyle = 'red'
    let y = h * ni/n
    gCtx.fillRect(x,h-y,1,y)
    y = h * nd / n
    gCtx.fillStyle = 'black'
    gCtx.fillRect(x,0,1,y)
    let y1 = h * nr / n
    gCtx.fillStyle = 'cyan'
    gCtx.fillRect(x,y,1,y1)
    
    
}

class Dot {
    constructor(x,y,r,vx,vy) {
        this.x = x
        this.y = y
        this.r = r
        this.vx = vx
        this.vy = vy
        this.setState(0)  
        this.infectionTime = null      
    }

    draw() {
        ctx.beginPath()
        ctx.moveTo(this.x+this.r, this.y)
        ctx.arc(this.x, this.y, this.r, 0, 2*Math.PI)
        ctx.fillStyle = this.fillStyle
        ctx.fill()
        ctx.strokeStyle = '#888'
        ctx.stroke()
    }

    setState(state) {
        this.state = state
        this.fillStyle = ['#eee', '#f00', '#0ff', '#000'][state]
        if(state == 1) this.infectionTime = currentTime
    }

    move(dt) {
        this.x += this.vx * dt
        this.y += this.vy * dt
    }

    reflect(dir, sgn) {
        const rx = dir[0]*sgn
        const ry = dir[1]*sgn        
        const dot = 2*(rx*this.vx+ry*this.vy)
        this.vx -= dot * rx
        this.vy -= dot * ry
    }

    touch(other) {
        if(this.state == 0 && other.state == 1) {
            if(Math.random()<0.6) this.setState(1)
        }
    }

    evolve() {
        if(this.state == 1) {
            if(currentTime - this.infectionTime > 14) {
                this.setState(Math.random()<0.1 ? 3 : 2) 
            }
        }
    } 

    dist2From(b) {
        let a = this
        let dx = b.x-a.x
        let dy = b.y-a.y
        return dx*dx+dy*dy
    }
    distFrom(b) {
        return Math.sqrt(this.dist2From(b))
    }

    computeOutFrameCollision(t) {
        const w = width
        const h = height
        const r = this.r
        const x0 = r, x1 = w-r
        const y0 = r, y1 = h-r
    
        let minDt = Infinity
        let dir = null
        if(this.vx < 0) { 
            let dt = (x0 - this.x)/this.vx; 
            if(dt<minDt) { minDt=dt; dir = [1,0] }
        } else if(this.vx>0) { 
            let dt = (x1 - this.x)/this.vx; 
            if(dt<minDt) { minDt=dt; dir = [-1,0] }
        } 
        if(this.vy<0) { 
            let dt = (y0 - this.y)/this.vy; 
            if(dt<minDt) { minDt=dt; dir = [0,1] }
        } else if(this.vy>0) { 
            let dt = (y1 - this.y)/this.vy; 
            if(dt<minDt) { minDt=dt; dir = [0,-1] }
        }
        return {
            t : t+minDt,
            dir : dir,
            a : this,
            b : null
        }
    }

    computeDotCollision(t, b) {
        const a = this        
        let x = b.x - a.x
        let y = b.y - a.y
        let vx = b.vx - a.vx
        let vy = b.vy - a.vy
        let d = a.r + b.r
        // f(dt) =  (x+vx*dt)^2 + (y+vy*dt)^2 - d^2 
        // = dt^2*(vx^2+vy^2) + 2 * dt * (x*vx + y*vy) + x^2+y^2-d^2 
        let A = vx*vx + vy*vy
        let B = x*vx + y*vy
        let C = x*x + y*y - d*d
        let dsc = B*B - A*C
        if(dsc <= 0.0) return null
        let q = Math.sqrt(dsc)

        let t0 = (-B - q)/A 
        let t1 = (-B + q)/A
        if(t1<=0) return null;

        if(t0<=0 && t1>0) {
            if(t0>0.01) throw "uffa1"
            // console.log("uhoh", t1-t0, t0, t1)
            return null;
        }

        let dx = x + vx * t0
        let dy = y + vy * t0
        let dd = Math.sqrt(dx*dx+dy*dy)

        let err = Math.abs(dd - d)
        if(err>0.0001) console.log("Errore2 ", err)

        return {
            t : t+t0, 
            dir : [dx/dd, dy/dd],
            a : this,
            b : b
        }
    }
    
}


function createDots() {

    const w = width
    const h = height
    const d = gridSpace
    const r = dotRadius
    const v = maxSpeed

    const ny = Math.floor(h / d)
    const nx = Math.floor(w / d)

    const x0 = (w - (nx-1)*d)/2
    const y0 = (h - (ny-1)*d)/2
    
    for(let iy=0; iy<ny; iy++) {
        let y = y0 + d*iy
        for(let ix=0; ix<nx; ix++) {
            let x = x0 + d*ix
            const vx = 2*(Math.random()-0.5)*v
            const vy = 2*(Math.random()-0.5)*v            
            let dot = new Dot(x,y,r,vx,vy)
            dots.push(dot)
        }
    }
    let i = 0
    dots.forEach(dot=>dot.index = i++)
    initializeCollisions()
    setSeed()
}

function setSeed() {
    let cx = width/2
    let cy = height/2
    let minDist = Infinity
    let selectedDot = null
    dots.forEach(dot => {
        let dx = dot.x - cx
        let dy = dot.y - cy
        let r2 = dx*dx+dy*dy
        if(r2<minDist) { minDist = r2; selectedDot = dot; }
    })
    selectedDot.setState(1)
}


function initializeCollisions()
{
    collisions = []
    dots.forEach(dot => collisions.push(dot.computeOutFrameCollision(currentTime)))
    const n = dots.length
    for(let i=0; i<n; i++) {
        let dot_i = dots[i]
        for(let j=i+1; j<n; j++) {
            let dot_j = dots[j]
            let c = dot_i.computeDotCollision(currentTime, dot_j)            
            if(c!=null) collisions.push(c)            
        }
    }
}



function draw() {
    canvas.width = width
    canvas.height = height
    dots.forEach(dot => dot.draw())   
}


function animate() {
    let oldTime = currentTime
    currentTime = performance.now() * 0.001

    for(;;) {
        // find next collision
        let nextc = collisions[0]
        collisions.forEach(c => {
            if(c.t<nextc.t) nextc = c
            if(c.t<=oldTime) throw "gneeee"
        })
        let t = nextc.t
        if(t > currentTime) break

        let c = nextc
        
        // animate till next collision
        const dt = t - oldTime
        dots.forEach(dot => dot.move(dt))
        let reflectedDots = [c.a]
        c.a.reflect(c.dir,1)
        if(c.b != null) { c.b.reflect(c.dir,-1); reflectedDots.push(c.b) }
        // console.log("collision", reflectedDots.map(dot=>dot.index))
        reflectedDots.forEach(dot => dot.marked = 1)        
        for(let i=0; i<collisions.length; )
        {
            if(collisions[i].a.marked || 
                collisions[i].b != null && collisions[i].b.marked)
            {
                collisions.splice(i,1)
            }
            else i++;
        }
        reflectedDots.forEach(dot => { 
            delete dot.marked
            let c = dot.computeOutFrameCollision(t)
            collisions.push(c)
            // console.log("added fc "+c.a.index, " t=",c.t)
            dots.forEach(other => {
                if(other !== dot) {
                    let c = dot.computeDotCollision(t, other)
                    if(c != null) 
                    {
                        collisions.push(c)
                        // console.log("added dc "+c.a.index+","+c.b.index, " t=",c.t)
            
                    }
                }
            })
        })

        if(reflectedDots.length == 2) {
            reflectedDots[0].touch(reflectedDots[1])
            reflectedDots[1].touch(reflectedDots[0])
        }
        oldTime = t

        // updateCollisions(reflectedDots)
       // check()
    }

    /*
    collisions.forEach(c=>{
        if(c.t<=oldTime) throw "help0."+c.a.index
    })
    dots.forEach(dot => {
        let c = dot.computeOutFrameCollision(oldTime)
        if(c.t<=currentTime) throw "help1."+dot.index
        dots.forEach(other => {
            if(other !== dot) {
                c = dot.computeDotCollision(oldTime, other)
                if(c != null)
                {
                    if(c.t <= currentTime) throw "help2."+dot.index+","+other.index
                }
            }
        })
    })
    */

    const dt = currentTime - oldTime
    if(dt>0) dots.forEach(dot => dot.move(dt))  
    dots.forEach(dot => dot.evolve())
    // check()
    draw()
    requestAnimationFrame(animate)
}

function check()
{
    for(let i=0;i<dots.length;i++) {
        for(let j=i+1;j<dots.length;j++) {
            let dx = dots[j].x - dots[i].x
            let dy = dots[j].y - dots[i].y
            let d2 = dx*dx+dy*dy
            if(d2<dotRadius*dotRadius) 
                throw "uffa2" + i + "," + j
            
        }
    }
}