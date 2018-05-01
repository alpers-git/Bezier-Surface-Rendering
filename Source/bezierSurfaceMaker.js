var gl;

var nRows = 4;
var nColumns = 15;

var  angle = 0.0;
var  axis = [0, 0, 1];

var trackingMouse = false;
var trackballMove = false;

var lastPos = [0, 0, 0];
var curx, cury;
var startX, startY;

let angleSldierTemplate = "Push it! -10 to 10. Currently: ";

var vertices = [];
var indexArray = [];
var controlPoints = [];// temporary 4x4 control points

var vBufferId;
var vPosition

var num = 1;
var fColor;
var nSegments = 10;

var near = 4;
var far = 20;

var radius = 6.0;
var theta = 0.0;
var phi = 1.0;
var dr = 5.0 * Math.PI / 180.0;

const black = vec4(0.0, 0.0, 0.0, 1.0);
const blue = vec4(0.0, 0.0, 1.0, 1.0);
const red = vec4(1.0, 0.5, 0.0, 1.0);

const at = vec3(0.0, 0.0, 0.0);
const up = vec3(0.0, 1.0, 0.0);

var fovy = 60;
var aspect = 2;

var modeViewMatrix, projectionMatrix;
var modelViewMatrixLoc, projectionMatrixLoc;

//Refference:https://www.scratchapixel.com/lessons/advanced-rendering/bezier-curve-rendering-utah-teapot
function evaluateBezierCurve(cPoints, t) {

    //console.log(cP);
    var Pt = [];
    // compute coefficients
    var k1 = (1 - t) * (1 - t) * (1 - t);
    //console.log(k1);
    var k2 = 3 * (1 - t) * (1 - t) * t;
    var k3 = 3 * (1 - t) * t * t;
    var k4 = t * t * t;
    // weight the four control points using coefficients
    var p1 = new vec4(cPoints[0][0] * k1, cPoints[0][1] * k1,
        cPoints[0][2] * k1, cPoints[0][3]);
    var p2 = new vec4(cPoints[1][0] * k2, cPoints[1][1] * k2,
        cPoints[1][2] * k2, cPoints[1][3]);
    var p3 = new vec4(cPoints[2][0] * k3, cPoints[2][1] * k3,
        cPoints[2][2] * k3, cPoints[2][3]);
    var p4 = new vec4(cPoints[3][0] * k4, cPoints[3][1] * k4,
        cPoints[3][2] * k4, cPoints[3][3]);

    Pt = add(p1, p2);
    Pt = add(Pt, p3);
    Pt = add(Pt, p4);
    Pt[3] = 1;
    //console.log(Pt);
    return Pt;
}

function evaluateBezierSurface(cPoints, u, v) 
{
    var uCurve = [];
    var selectedCP = [];
    for (var i = 0; i < 4; i++) 
    {
        selectedCP = [];
        selectedCP.push(cPoints[i * 4]);
        selectedCP.push(cPoints[i * 4 + 1]);
        selectedCP.push(cPoints[i * 4 + 2]);
        selectedCP.push(cPoints[i * 4 + 3]);
        uCurve.push(evaluateBezierCurve(selectedCP, u));
    }
    //var x = evaluateBezierCurve(uCurve, v);
    //console.log(x);
    return evaluateBezierCurve(uCurve, v);
}

function changeValue(value) {
    document.getElementById("slider1").children[0].innerHTML = angleSldierTemplate + value;
    console.log(value);
    num = value;

    controlPoints = [vec4(-1, -1, 1, 1), vec4(-0.5, -1, 1, 1), vec4(0.5, -1, 1, 1), vec4(1, -1, 1, 1),
        vec4(-1, -0.5, 1, 1), vec4(-0.5, -0.5, num, 1), vec4(0.5, -0.5, num, 1), vec4(1, -0.5, 1, 1),
        vec4(-1, 0.5, 1, 1), vec4(-0.5, 0.5, num, 1), vec4(0.5, 0.5, num, 1), vec4(1, 0.5, 1, 1),
        vec4(-1, 1, 1, 1), vec4(-0.5, 1, 1, 1), vec4(0.5, 1, 1, 1), vec4(1, 1, 1, 1)];
}

function pushVertices(buffer, data)
{
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, flatten(data));
}

//----------------------------------------------------

function multq( a,  b)
{
   // vec4(a.x*b.x - dot(a.yzw, b.yzw), a.x*b.yzw+b.x*a.yzw+cross(b.yzw, a.yzw))

   var s = vec3(a[1], a[2], a[3]);
   var t = vec3(b[1], b[2], b[3]);
   return(vec4(a[0]*b[0] - dot(s,t), add(cross(t, s), add(scale(a[0],t), scale(b[0],s)))));
}


function mouseMotion( x,  y)
{
    var dx, dy, dz;

    if(trackingMouse) {
      theta = x - startX;
      phi = y - startY;
    }
}

function startMotion( x,  y)
{
    trackingMouse = true;
    startX = x;
    startY = y;
    curx += x;
    cury += y;
	  trackballMove=true;
}

function stopMotion( x,  y)
{
    trackingMouse = false;
	trackballMove = false;
    
}


window.onload = init;

function init() {
    let canvas = document.getElementById("gl-canvas");

    gl = WebGLUtils.setupWebGL(canvas);
    if (!gl) {
        alert("WebGL isn't available");
    }

    gl.viewport(0, 0, canvas.width, canvas.height);

    gl.clearColor(0.0, 0.0, 0.0, 0.0);

    // enable depth testing and polygon offset
    // so lines will be in front of filled triangles

    gl.enable(gl.DEPTH_TEST);

    gl.depthFunc(gl.LEQUAL);
    gl.enable(gl.POLYGON_OFFSET_FILL);
    gl.polygonOffset(1.0, 2.0);

    controlPoints = [vec4(-1, -1, 1, 1), vec4(-0.5, -1, 1, 1), vec4(0.5, -1, 1, 1), vec4(1, -1, 1, 1),
        vec4(-1, -0.5, 1, 1), vec4(-0.5, -0.5, num, 1), vec4(0.5, -0.5, num, 1), vec4(1, -0.5, 1, 1),
        vec4(-1, 0.5, 1, 1), vec4(-0.5, 0.5, num, 1), vec4(0.5, 0.5, num, 1), vec4(1, 0.5, 1, 1),
        vec4(-1, 1, 1, 1), vec4(-0.5, 1, 1, 1), vec4(0.5, 1, 1, 1), vec4(1, 1, 1, 1)];

    for(var i =0; i <= nSegments; i++ )
    {
        for(var j = 0; j <= nSegments; j++)
        {
            vertices.push(evaluateBezierSurface(controlPoints, i/nSegments, j/nSegments));
        }
    }

    for(var i = 0; i <= nSegments; i++)
    {
        for (var j = i * nSegments; j <= (i+1) * nSegments ; j++) 
        {
            indexArray.push(j - 1);
            indexArray.push(j);
            indexArray.push(nSegments + j);
            indexArray.push(nSegments + j-1);
        }

    }

    var program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    var iBufferId = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, iBufferId);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint8Array(indexArray), gl.STATIC_DRAW);

    fColor = gl.getUniformLocation(program, "fColor");

    modelViewMatrixLoc = gl.getUniformLocation(program, "modelViewMatrix");
    projectionMatrixLoc = gl.getUniformLocation(program, "projectionMatrix");

    vBufferId = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBufferId);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(vertices), gl.STATIC_DRAW);

    vPosition = gl.getAttribLocation(program, "vPosition");
    gl.enableVertexAttribArray(vPosition);
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);

    pushVertices(vBufferId, vertices);


    canvas.addEventListener("mousedown", function(event){
      var x = 2*event.clientX/canvas.width-1;
      var y = 2*(canvas.height-event.clientY)/canvas.height-1;
      startMotion(x, y);
    });

    canvas.addEventListener("mouseup", function(event){
      var x = 2*event.clientX/canvas.width-1;
      var y = 2*(canvas.height-event.clientY)/canvas.height-1;
      stopMotion(x, y);
    });

    canvas.addEventListener("mousemove", function(event){

      var x = 2*event.clientX/canvas.width-1;
      var y = 2*(canvas.height-event.clientY)/canvas.height-1;
      mouseMotion(x, y);
    } );
    gl.bindBuffer(gl.ARRAY_BUFFER, vBufferId);
    render();
}

//var indexBuffer
var a = 1;

//var x;
function render() {
    theta += 0.01;
    a++;

    //phi += 0.001;
    vertices = [];

    for(var i =0; i <= nSegments; i++ )
    {
        for(var j = 0; j <= nSegments; j++)
        {
            vertices.push(evaluateBezierSurface(controlPoints, i/nSegments, j/nSegments));
        }
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, vBufferId);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(vertices), gl.STATIC_DRAW);

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    var eye = vec3(radius * Math.sin(theta) * Math.cos(phi),
        radius * Math.sin(theta) * Math.sin(phi),
        radius * Math.cos(theta));

    modelViewMatrix = lookAt(eye, at, up);
    projectionMatrix = perspective( fovy, aspect, near, far )

    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(modelViewMatrix));
    gl.uniformMatrix4fv(projectionMatrixLoc, false, flatten(projectionMatrix));

    // draw each quad as two filled red triangles
    // and then as two black line loops

    for (var i = 0; i <indexArray.length; i +=4) 
    {
        gl.uniform4fv(fColor, flatten(red));
        gl.drawElements( gl.TRIANGLE_FAN, 4, gl.UNSIGNED_BYTE, i );
        gl.uniform4fv(fColor, flatten(black));
        gl.drawElements( gl.LINE_LOOP, 4, gl.UNSIGNED_BYTE, i );
    }

    //pointsArray = [];

    requestAnimFrame(render);
}