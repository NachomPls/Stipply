let activeTool = "brush";
let startInk = 1000;

let canvasWidth = 500;
let canvasHeight = 500;

let brushColour = '#000000';

let ink = startInk;
let drawCanvas;

window.onload = init;

function init() {

    //selector for tools and highlighter
    document.getElementById("bucket").addEventListener("click", () => { select("bucket");
        highlightTool(); });
    document.getElementById("brush").addEventListener("click", () => { select("brush");
        highlightTool(); });
    document.getElementById("clearCanvas").addEventListener("click", () => { select("clearCanvas") });
    //makes slider appear/disappear on click
    document.getElementById("adjustBrush").addEventListener("click", () => { toggleSlide('slider',
        'sliderLabel')});
    document.getElementById("sliderLabel").addEventListener("click", () => { toggleSlide('slider',
        'sliderLabel')});

    //get colour utility
    const util = document.getElementsByClassName("utilities")[2];
    // create a button for the associated
    //value and append it to the colour utility
    for (let col in Colours) {
        $(util).append(createButton(col));
    }
}

//All available colours
const Colours ={red: '#FF0000', lightGreen: '#00FF00', darkGreen: '#01A400',
                lightBlue: '#718DFF', darkBlue:'#0000FF', yellow: '#FFEB00',
                purple: '#E745FF', black: '#000000', white: '#FFFFFF',
                orange: '#FF8000', pink: '#FF6ADA', brown: '#A03726',
                grey: '#9FA093'};

//creates a button for each colour
function createButton (colour) {
    // create container
    const div = document.createElement("div");
    // css classes!!!
    div.classList.add("colour");
    div.classList.add(colour);
    div.style.background = Colours[colour];
    // listen for clicks
    div.addEventListener("click", () => {
        brushColour = Colours[colour];
        highlightTool();
    });

    return div;
}

//selects tool clicked
function select(toolName) {
  switch (toolName) {
    case "bucket":
        activeTool = toolName;
      break;
    case "brush":
        activeTool = toolName;
      break;
      //clearCanvas isn't a real tool but needs to be selected anyway
    case "clearCanvas":
        if(canIDraw) {
          clear();
          background(255);
          ink = startInk;
          let obj = {
            type: 'clear'
          };
          let json = JSON.stringify({ type:'draw', data: obj });
          connection.send(json);
        }
        break;
    default: console.error("lol 404");
  }
}

//dehighlights all tools and highlights clicked tool
function highlightTool() {
    let toolAmount = document.getElementsByClassName("tool").length;
    for (let toolCounter = 0; toolCounter < toolAmount; toolCounter++) {
        document.getElementsByClassName("tool")[toolCounter].style.background = "lightgrey";
    }
    document.getElementById(activeTool).style.background = brushColour;
}

function setup() {
    drawCanvas = createCanvas(canvasWidth, canvasHeight);
    drawCanvas.parent('canvasHolder');
    strokeWeight(12);
    noSmooth();
    background(255);
}


//Range Slider for Brush
function toggleSlide(id, labelId) {
    let slideElem = document.getElementById(id);
    let labelElem = document.getElementById(labelId);


    if (slideElem.style.display === "none") {
        slideElem.style.display = "block";
        labelElem.style.display = "none"
    } else {
        slideElem.style.display = "none";
        labelElem.style.display = "block"
    }
}

function adjustedStrokeWeight () {
   return Number(document.getElementById("slider").value);
}

function mouseDragged()
{
  if(canIDraw) {
    strokeWeight(adjustedStrokeWeight());
    if(!(ink <= 0) && (activeTool === "brush")) {
      stroke(brushColour);
      line(mouseX, mouseY, pmouseX, pmouseY);
      ink--;
      let obj = {
        type: activeTool,
        strokeWeight: adjustedStrokeWeight(),
        mouseX: Math.round(mouseX),
        mouseY: Math.round(mouseY),
        pmouseX: Math.round(pmouseX),
        pmouseY: Math.round(pmouseY),
        color: brushColour
      };
      let json = JSON.stringify({ type:'draw', data: obj });
      connection.send(json);
    }
  }
}

function mousePressed() {
  if(activeTool === "bucket" && canIDraw) {
    //setup
    let mousePos = {
      x: Math.round(mouseX),
      y: Math.round(mouseY),
    };

    if(mousePos.x >= 0 && mousePos.x <= drawCanvas.width && mousePos.y >= 0 && mousePos.y <= drawCanvas.height) {
      floodFill(mousePos.x, mousePos.y);

      let obj = {
        type: activeTool,
        mouseX: Math.round(mouseX),
        mouseY: Math.round(mouseY),
        color: brushColour,
      };
      let json = JSON.stringify({ type:'draw', data: obj });
      connection.send(json);
    }
  }
}

function floodFill(startX, startY) {
  let context = document.getElementById("defaultCanvas0").getContext("2d");
  let canvasPixels = context.getImageData(0, 0, drawCanvas.width, drawCanvas.height);
  let startR = canvasPixels.data[((startY*drawCanvas.width + startX) * 4)/*+0*/];
  let startG = canvasPixels.data[((startY*drawCanvas.width + startX) * 4)+1];
  let startB = canvasPixels.data[((startY*drawCanvas.width + startX) * 4)+2];
  let pixelColor = hexToRGB(brushColour);
  let pixelStack = [[startX, startY]];

  let debugCount = 0;
  while(pixelStack.length) {
    debugCount++;
    if (debugCount >= 10000) {
      break;
    }
    let newPos, x, y, pixelPos, reachLeft, reachRight;
    newPos = pixelStack.pop();
    x = newPos[0];
    y = newPos[1];

    pixelPos = (y*drawCanvas.width + x) * 4;
    while(y-- >= 0 && matchStartColor(pixelPos)) {
      pixelPos -= drawCanvas.width * 4;
    }
    pixelPos += drawCanvas.width * 4;
    ++y;
    reachLeft = false;
    reachRight = false;
    while(y++ <= drawCanvas.height - 2 && matchStartColor(pixelPos)) {
      colorPixel(pixelPos);

      if(x >= 1) {
        if(matchStartColor(pixelPos - 4)) {
          if(!reachLeft){
            pixelStack.push([x - 1, y]);
            reachLeft = true;
          }
        }
        else if(reachLeft) {
          reachLeft = false;
        }
      }

      if(x <= drawCanvas.width-2) {
        if(matchStartColor(pixelPos + 4)) {
          if(!reachRight) {
            pixelStack.push([x + 1, y]);
            reachRight = true;
          }
        }
        else if(reachRight) {
          reachRight = false;
        }
      }

      pixelPos += drawCanvas.width * 4;
    }
  }
  context.putImageData(canvasPixels, 0, 0);

  function matchStartColor(pixelPos) {
    let r = canvasPixels.data[pixelPos];
    let g = canvasPixels.data[pixelPos+1];
    let b = canvasPixels.data[pixelPos+2];

    return (r === startR && g === startG && b === startB);
  }

  function colorPixel(pixelPos) {
    canvasPixels.data[pixelPos+0] = pixelColor[0];
    canvasPixels.data[pixelPos+1] = pixelColor[1];
    canvasPixels.data[pixelPos+2] = pixelColor[2];
    canvasPixels.data[pixelPos+3] = 255;
  }
}

//Hex to rgb array
function hexToRGB(hex) {
    let r = parseInt(hex.slice(1, 3), 16),
        g = parseInt(hex.slice(3, 5), 16),
        b = parseInt(hex.slice(5, 7), 16);

    let rgb = [];
    rgb.push(r,g,b);
    return rgb;
}

//gets player name
function getName() {
    let person = prompt("Please enter your name:");
    if (person == null || person === "") {
        return false;
    }
    let json = JSON.stringify({ type:'name', name: person });
    connection.send(json);
    return person;
}
