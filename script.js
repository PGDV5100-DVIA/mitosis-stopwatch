//defining constants 
const square_size = 400;
const cell_size = 50;
const columns = 8;
const max_circles = 64; 
const circle_r = 22;
const divide_ms = 2000; // divide ever 2s 

const svg = d3.select("#chart")
    .attr("width", square_size)
    .attr("height", square_size);

//making the border
svg.append("rect")
    .attr("class", "boundary")
    .attr("x", 0)
    .attr("y", 0)
    .attr("width", square_size)
    .attr("height", square_size);


//making the timer
let startTime = null; 
let timer = null; 

d3.select("#start").on("click", function() {
    if (timer != null) return;
    startTime = Date.now();
    timer = setInterval(tick, 50); 
});

d3.select("#reset").on("click", function() {
    clearInterval(timer);
    timer = null;
    d3.select("#stopwatch").text(formatTime(0));
    render(1);
}); 


//FUNCTIONS
//position of the circle
function cellPosition(i) {
    let x = ((i % columns) * cell_size) + (cell_size / 2);
    let y = (Math.floor(i / columns) * cell_size) + (cell_size / 2);
    const cell_position = {x, y}; 
    return cell_position; 
}

//data array 
function render(count) {
    const data = d3.range(count).map(function(i) {
        let {x, y} = cellPosition(i);
        return {id: i, x: x, y: y};
    }); 

    svg.selectAll("circle")
        .data(data, d => d.id)
        .join(enter => enter.append("circle"))
            .attr("cx", d => d.x)
            .attr("cy", d => d.y)
            .attr("r", circle_r)
            .attr("fill", "blue");
}

//TIMER 
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
    //update #stopwatch text 
    d3.select("#stopwatch").text(formatTime(elapsed));
    // render circles 
    let gen = Math.floor(elapsed / divide_ms); 
    const count = Math.min(2 ** gen, max_circles);
    render(count);
    // stop timer once circles reach max_circles 
    if (count >= max_circles) {
        clearInterval(timer);
        timer = null; 
    }
}

render(1);