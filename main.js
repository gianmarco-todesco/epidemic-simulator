"use strict";

let viewer 
let simulator
let controls 
let graph 

class Viewer {
    constructor(canvasId, simulator) {
        let canvas = this.canvas = document.getElementById(canvasId)
        this.ctx= canvas.getContext('2d')
        this.width = canvas.width = canvas.clientWidth
        this.height = canvas.height = canvas.clientHeight   
        this.simulator = simulator
        simulator.width = this.width
        simulator.height = this.height
    }

    draw() {
        this.canvas.width = this.canvas.clientWidth
        this.simulator.draw(this.ctx)
    }
}

function updateStats() {
    const sim = simulator
    const day = Math.floor(sim.currentTime || 0)
    let vs = [0,0,0,0]
    sim.dots.forEach(dot => vs[dot.state]++)
    const n = sim.dots.length
    document.getElementById('day').innerHTML = day
    document.getElementById('infected-count').innerHTML = Math.floor(100*vs[1]/n)+"%"
    document.getElementById('recovered-count').innerHTML = Math.floor(100*vs[2]/n)+"%"
    document.getElementById('dead-count').innerHTML = Math.floor(100*vs[3]/n)+"%"

}

class Graph {
    constructor(divId, simulator) {
        this.simulator = simulator
        this.svg = SVG(divId).size('100%', '100%')
        this.x = 10
        this.height = this.svg.parent().clientHeight

    }

    addMeasure() {
        const sim = this.simulator
        const svg = this.svg
        this.day = Math.floor(sim.currentTime)
        let vs = [0,0,0,0]
        sim.dots.forEach(dot => vs[dot.state]++)
        const n = sim.dots.length
        let x0 = this.x
        let height = this.height - 10
        let factor = height/n
        let h1 = vs[1]*factor // infected
        let h2 = vs[2]*factor // recovered
        let h3 = vs[3]*factor // deads
        svg.rect(3,h1).fill('red').move(x0, height-5-h1)
        
        svg.rect(3,h3).fill('black').move(x0, 5)
        svg.rect(3,h2).fill('cyan').move(x0, 5 + h3)
        
        updateStats()
        
        this.x += 4        
    }

    clear() {
        this.svg.clear()
        this.x = 10
    }

}

window.onload = function() {
    simulator = new Simulator()
    viewer = new Viewer('c', simulator)
    initControls()
    viewer.draw()


    graph = new Graph('g', simulator)
    
    /*
    currentTime = performance.now()*0.001
    createDots(population)
    // animate()
    draw()
    */

    /*
    gCanvas = document.getElementById('g')
    gCtx = gCanvas.getContext('2d')
    gCanvas.width = gCanvas.clientWidth
    gCanvas.height = gCanvas.clientHeight
    */

    // setInterval(updateGraph, 100)
}


function initSelect(id, lst, defValue, fn) {
    let el = document.getElementById(id)
    lst.forEach(x => {
        let option = document.createElement("option");
        if(typeof(x)=="number") option.value = option.text = x;
        else {
            option.value = x.value
            option.text = x.text
        }
        el.appendChild(option)
    })
    el.value = defValue
    el.onchange = fn
}

function initControls() {
    controls = {}
    controls.startStopBtn = document.getElementById('start-stop-btn')

    const sim = simulator
    let values

    // population
    let population = 700
    initSelect('population', [200,300,400,500,600,700,800,900], population, (e) => {
        stop()
        let n = parseInt(e.target.value)
        sim.createDots(n)
        viewer.draw()
    })
    sim.createDots(population)

    // duration
    sim.duration = 14
    initSelect('duration', [...Array(20).keys()].map(i=>1+i), sim.duration, (e) => {
        stop()
        sim.duration = parseInt(e.target.value)
    })

    // contagiousness
    sim.contagiousness = 0.5
    values = [...Array(9).keys()].map(i=>i+2).map(i=>{
        return {value:i*0.1, text:i*10+"%"}
    })
    initSelect('contagiousness', values, sim.contagiousness, (e) => {
        sim.contagiousness = parseFloat(e.target.value)
    })

    // lethality
    sim.lethality = 0.1
    values = [...Array(8).keys()].map(i=>{
        let v = i+1
        return {value:v*0.1, text:v*10+"%"}
    })
    initSelect('lethality', values, sim.lethality, (e) => {
        sim.lethality = parseFloat(e.target.value)
    })

    // simulationSpeed
    sim.simulationSpeed = 3
    values = [...Array(5).keys()].map(i=>{
        let v = i + 1
        return {value:v, text:"x"+v}
    })
    initSelect('simulation-speed', values, sim.simulationSpeed, (e) => {
        sim.simulationSpeed = parseInt(e.target.value)
    })

    values = [...Array(9).keys()].map(i => {
        return {value:i*0.1, text:i*10+"%"}
    })
    initSelect('lockdown', values, 0, (e) => {
        sim.setLockdown(parseFloat(e.target.value))
    })
}


function startStop() {
    if(simulator.running) stop()
    else start();
}


function start() {
    if(simulator.running) return;
    controls.startStopBtn.innerHTML = "Pause"
    simulator.start()
    simulator.running = true
    const animate = () => {
        if(simulator.running) {
            simulator.step()
            viewer.draw()

            if(simulator.dots.filter(dot=>dot.state==1).length == 0) {
                stop()
                console.log(simulator.currentTime)
            }

            let day = Math.floor(simulator.currentTime)
            if(graph.day != day) graph.addMeasure()
            requestAnimationFrame(animate)    
        }
    }
    animate()

    /*
    graphX = 0
    gCanvas.width = gCanvas.clientWidth
    running = true
    animate()
    */

}

function stop() {
    if(!simulator.running) return;
    simulator.running = false   
    controls.startStopBtn.innerHTML = "Start"
}

function reset() {
    stop();
    simulator.createDots(simulator.dots.length)
    viewer.draw()
    graph.clear()
    updateStats()
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




function draw() {
    canvas.width = width
    canvas.height = height
    dots.forEach(dot => dot.draw())   
}

function evolve(t) {
    let oldTime = currentTime
    currentTime = t
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
    const dt = currentTime - oldTime
    if(dt>0) dots.forEach(dot => dot.move(dt))  
    dots.forEach(dot => dot.evolve())
}

function animate() {
    let oldTime = currentTime
    currentTime = performance.now() * 0.001

    
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