"use strict";


//---------------------------
// Dot
//---------------------------
class Dot {
    constructor(x,y,r) {
        this.x = x
        this.y = y
        this.r = r
        this.vx = 0
        this.vy = 0
        this.setState(0)  
        this.infectionTime = null      
    }

    draw(ctx) {
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
        if(state == 1) this.infectionTime = 0
        else if(state == 3) this.vx = this.vy = 0
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

    

    dist2From(b) {
        let a = this
        let dx = b.x-a.x
        let dy = b.y-a.y
        return dx*dx+dy*dy
    }
    distFrom(b) {
        return Math.sqrt(this.dist2From(b))
    }

    computeOutFrameCollision(t, width, height) {
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



//---------------------------
// Simulator
//---------------------------
class Simulator {
    constructor(options) {
        options = options || {}        
        this.width = 400
        this.height = 400
        this.duration = 14
        this.contagiousness = 0.6
        this.simulationSpeed = 1
        this.lethality = 0.1
        this.lockdown = 0
        this.maxDotSpeed = 0
    }

    createDots(n) {
        let dots = this.dots = []
        const w = this.width
        const h = this.height
    
        let r = 0.1*Math.sqrt(w*h/n)
        let v = this.maxDotSpeed = 10*r
    
        const x0 = 2*r, y0 = 2*r
        const x1 = w-x0, y1 = h-y0
        const d2min = Math.pow(2.1*r,2)
        for(let i=0; i<n; i++) {
            let dot = new Dot(0,0,r)
            let step = 20
            while(--step>=0) {
                dot.x = x0 + (x1-x0) *Math.random()
                dot.y = y0 + (y1-y0) *Math.random()
                let ok = true
                for(let j=0; ok && j<dots.length; j++) {
                    let other = dots[j]
                    if(dot.dist2From(other)<d2min) { ok = false; break }
                }
                if(ok) break 
            }  
            if(step<0) 
                break // todo: add some diagnostic. we could not place the ith dot
            if(i >= n * this.lockdown) {
                dot.vx = 2*(Math.random()-0.5)*v
                dot.vy = 2*(Math.random()-0.5)*v  
                dot.locked = false  
            } else {
                dot.vx = dot.vy = 0
                dot.locked = true  
            }
            dot.index = i                       
            dots.push(dot)     
        }   
        this.putSeeds()   
        this.initializeCollisions() 
    }

    putSeeds() {
        // select the dot closest to the center
        // and make it infected
        let cx = this.width/2
        let cy = this.height/2
        let minDist = Infinity
        let selectedDot = null
        this.dots.forEach(dot => {
            let dx = dot.x - cx
            let dy = dot.y - cy
            let r2 = dx*dx+dy*dy
            if(r2<minDist) { minDist = r2; selectedDot = dot; }
        })
        selectedDot.setState(1)
    }

    initializeCollisions() {
        let currentTime = this.currentTime
        const collisions = this.collisions = []
        const dots = this.dots
        dots.forEach(dot => {
            let c = dot.computeOutFrameCollision(currentTime, this.width, this.height)
            collisions.push(c)
        })

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

    draw(ctx) {
        this.dots.forEach(dot => dot.draw(ctx))  
    }

    evolveDot(dot, dt) {
        if(dot.state == 1) {
            dot.infectionTime += dt
            if(dot.infectionTime>this.duration) {
                if(Math.random() < this.lethality) dot.setState(3);
                else dot.setState(2)
            }
        }
    }

    touchDot(dot1, dot2) {
        if(dot2.state == 0 && dot1.state == 1) {
            if(Math.random()<this.contagiousness) dot2.setState(1)
        }
    }

    getTime() { return performance.now() * 0.001 }


    start() {
        this.currentTime = 0 // this.getTime()
        this.initializeCollisions()
        this.oldActualTime = this.getTime()

    }

    step() {
        let actualTime = this.getTime()
        let stepDt = (actualTime - this.oldActualTime) * this.simulationSpeed
        this.oldActualTime = actualTime

        let oldTime = this.currentTime
        let currentTime = this.currentTime = this.currentTime + stepDt
        const collisions = this.collisions
        const dots = this.dots
        const me = this        

        for(;;) {
            // find next collision
            let c = collisions.reduce((a,b) => a.t<b.t ? a : b)
            let t = c.t
            if(t > currentTime) break
                
            // animate till next collision
            const dt = t - oldTime
            dots.forEach(dot => dot.move(dt))

            // reflect colliding dots
            let reflectedDots = [c.a]
            c.a.reflect(c.dir,1)
            if(c.b != null) { 
                c.b.reflect(c.dir,-1) 
                reflectedDots.push(c.b) 
            }

            // remove collisions from the list
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

            // compute new collisions
            reflectedDots.forEach(dot => { 
                delete dot.marked
                let c = dot.computeOutFrameCollision(t, this.width, this.height)
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

            // handle contacts
            if(reflectedDots.length == 2) {
                this.touchDot(reflectedDots[0], reflectedDots[1])
                this.touchDot(reflectedDots[1], reflectedDots[0])
            }
            oldTime = t
    
            // updateCollisions(reflectedDots)
           // check()
        }

        // last movement (no collisions)
        const dt = currentTime - oldTime
        if(dt>0) dots.forEach(dot => dot.move(dt))  

        // evolve infections
        dots.forEach(dot => me.evolveDot(dot, stepDt))
    }

    setLockdown(p) {
        this.lockdown = p
        let k = p*this.dots.length
        for(let i=0; i<this.dots.length; i++) {
            let locked = i<k
            const dot = this.dots[i]
            if(dot.locked != locked) {
                dot.locked = locked
                if(dot.locked) this.dots[i].vx = this.dots[i].vy = 0
                else {
                    const v = this.maxDotSpeed
                    dot.vx = 2*(Math.random()-0.5)*v
                    dot.vy = 2*(Math.random()-0.5)*v                          
                }
            }
        }
        this.initializeCollisions()
    }
}

