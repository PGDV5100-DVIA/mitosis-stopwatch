const cell_r = 22;
const divide_ms = 2000; // divide ever 2s 
let width = window.innerWidth;
let height = window.innerHeight;
const repel_radius = 120; //cursor repel reach
const repel_strength = 3;
const split_ms = 1000;
const collide_radius = d => d.r * (1 + d.t * 0.6) + 2; 
const inner_color = d3.interpolateRgb("#e8eef8", "#8a86c8");
const outer_color = d3.interpolateRgb("#9cc3e6", "#2f3f8f");
const packing = 0.5; //fraction of screen for cells to fill 

let cells = []; //list of every living cell
let next_id = 0; //counter for every new cell created
let mouse = null;
let ended = false;

const svg = d3.select("#chart")
    .attr("width", width)
    .attr("height", height);

//force simulation & physics of cells 
const simulation = d3.forceSimulation()
    .alphaDecay(0)
    .velocityDecay(0.4)
    .force("collide", d3.forceCollide(collide_radius))
    .on("tick", onTick)
    .force("wander", wander)
    .force("repel", repel);

//making the timer
let startTime = null;
let timer = null;

//reset button
d3.select("#reset").on("click", function () {
    clearInterval(timer);
    timer = null;
    startTimer();
    d3.select("#time").text(formatTime(0));
    d3.select("#time").classed("ended", false);
    ended = false; 
    resetCells();
});

//window resizing
d3.select(window).on("resize", function() {
    width = window.innerWidth;
    height = window.innerHeight;
    svg.attr("width", width);
    svg.attr("height", height);
});

//mouse tracking
d3.select(window).on("mousemove", function (event) {
    const [x, y] = d3.pointer(event, svg.node()); //mouse position into svg coords
    mouse = { x, y };
});
//mouse leaving the doc, set mouse to null
d3.select(document.documentElement).on("mouseleave", function () { mouse = null });


//FUNCTIONS
//if cells get to walls, move back and change velocity 
function onTick() {
    const now = Date.now() - startTime;
    updateLifecycle(now);
    simulation.force("collide").radius(collide_radius);
    for (const d of cells) {
        if (d.x < d.r) { d.x = d.r; d.vx *= -1; }; //left wall
        if (d.y < d.r) { d.y = d.r; d.vy *= -1; }; //top wall
        if (d.x > width - d.r) { d.x = width - d.r; d.vx *= -1; }; //right wall
        if (d.y > height - d.r) { d.y = height - d.r; d.vy *= -1; }; //bottom wall
    };
    render();
}

function makeCell(x, y, now) {
    let new_cell = {
        id: next_id++,
        x: x,
        y: y,
        r: cell_r,
        born: now,
        divideAt: now + divide_ms * (0.8 + Math.random() * 0.4),
        angle: Math.random() * Math.PI,
        t: 0,
        shade: 0
    };
    return new_cell;

}

//making daughter cells 
function divide(parent, now) {
    const ox = Math.cos(parent.angle) * parent.r;
    const oy = Math.sin(parent.angle) * parent.r;
    const a = makeCell(parent.x + ox, parent.y + oy, now);
    const b = makeCell(parent.x - ox, parent.y - oy, now);
    a.vx = ox * 0.05;
    a.vy = oy * 0.05;
    b.vx = -ox * 0.05;
    b.vy = -oy * 0.05;
    a.shade = 1;
    b.shade = 1;
    return [a, b];
}

function updateLifecycle(now) {
    const next = [];
    let split_happened = false;
    for (const d of cells) {
        const starting = now >= d.divideAt && d.t === 0; //check cell about to start dividing
        if (starting && !ended && !hasRoom()) endExperiment(now);
        if (now < d.divideAt || (ended && d.t === 0)) {
            d.t = 0;
            d.shade = Math.max(0, d.shade - 0.02);
            next.push(d);
        } else {
            d.t = (now - d.divideAt) / split_ms;
            d.shade = d.t;
            if (d.t >= 1) {
                next.push(...divide(d, now));
                split_happened = true;
            } else {
                next.push(d);
            }
        }
    }
    if (split_happened) {
        cells = next;
        simulation.nodes(cells);
    }
}

//forcing a wobble
function wander() {
    for (const d of cells) {
        d.vx += (Math.random() - 0.5) * 0.3;
        d.vy += (Math.random() - 0.5) * 0.3;
    }
}

//repel
function repel() {
    if (mouse == null) return;
    for (const d of cells) {
        const dx = d.x - mouse.x; //offset
        const dy = d.y - mouse.y; //offset
        const dist = Math.hypot(dx, dy); //distance 
        if (dist >= repel_radius || dist === 0) continue;
        const push = (1 - dist / repel_radius) * repel_strength;
        d.vx += dx / dist * push;
        d.vy += dy / dist * push;
    }
}

//cells array 
function render() {
    const groups = svg.selectAll("g.cell")
        .data(cells, d => d.id)
        .join(enter => {
            const g = enter.append("g")
                .attr("class", "cell")
            const grad = g.append("radialGradient")
                .attr("id", d => `grad-${d.id}`);
            grad.append("stop")
                .attr("class", "inner")
                .attr("offset", "30%");
            grad.append("stop")
                .attr("class", "outer")
                .attr("offset", "100%");
            g.append("circle")
                .attr("class", "half")
                .attr("r", d => d.r)
                .attr("fill", d => `url(#grad-${d.id})`);
            g.append("circle")
                .attr("class", "half")
                .attr("r", d => d.r)
                .attr("fill", d => `url(#grad-${d.id})`);
            return g;
        })
        .attr("filter", d => d.t > 0 ? "url(#goo)" : null)
       .attr("transform", d => `translate(${d.x}, ${d.y}) rotate(${d.angle * 180 / Math.PI})`);

    groups.selectAll("circle.half")
        .attr("cx", (d, i) => (i === 0 ? -1 : 1) * d.t * d.r);
    groups.select("stop.inner")
        .attr("stop-color", d => inner_color(d.shade));
    groups.select("stop.outer")
        .attr("stop-color", d => outer_color(d.shade));
}



//TIMER 
function startTimer() {
    if (timer != null) return;
    startTime = Date.now();
    timer = setInterval(tick, 50);
}


function formatTime(ms) {
    let total_s = Math.floor(ms / 1000);
    let m = Math.floor(total_s / 60);
    let s = total_s % 60;
    let tenths = Math.floor((ms % 1000) / 100);
    let mm = String(m).padStart(2, "0");
    let ss = String(s).padStart(2, "0");
    let time = mm + ":" + ss + "." + tenths;
    return time;
}

function tick() {
    // elapsed ms 
    const elapsed = Date.now() - startTime;
    //update #time text 
    d3.select("#time").text(formatTime(elapsed));
}

function resetCells() {
    cells = [];
    cells.push(makeCell(width / 2, height / 2, 0));
    simulation.nodes(cells); // references new cells array
}

function hasRoom() {
    let has_room = true;
    const cell_area = Math.PI * (cell_r + 2) ** 2;
    if (cell_area * (cells.length + 1) <= width * height * packing) { return has_room; }
    else { has_room = false; return has_room };
}

function endExperiment(now) {
    ended = true;
    clearInterval(timer);
    timer = null;
    d3.select("#time").text(formatTime(now));
    d3.select("#time").classed("ended", true);
}

startTimer();
resetCells();