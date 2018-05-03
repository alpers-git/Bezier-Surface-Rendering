let numRow = 5;
let numCol = 5;

var nSegments = 11;

var gl;
var program;

var trackingMouse = false;
var trackballMove = false;

var curX, curY;
var startX, startY;

const angleSldierTemplate = "Push it! -10 to 10. Currently: ";
const checkBoxTemplate = "<input type=\"checkbox\" id=\"#checkbox-id\">";

var vertices = [];
var normals = [];
var indexArray = [];
var controlPoints = []; // temporary 4x4 control points
var selectedControlPoints = [];

var vBufferId;
var vPosition;

var num = 1;
var fColor;


var near = 4;
var far = 20;

var radius = 6.0;
var theta = 0.0;
var phi = 1.0;

const black = vec4(0.0, 0.0, 0.0, 1.0);
const blue = vec4(0.0, 0.0, 1.0, 1.0);
const red = vec4(1.0, 0.0, 0.0, 1.0);

const at = vec3(0.0, 0.0, 0.0);
const up = vec3(0.0, 1.0, 0.0);

let fovy = 60;
let aspect = 2;

var lightPosition = vec4(1.0, 1.0, 1.0, 0.0 );
var lightAmbient = vec4(0.2, 0.2, 0.2, 1.0 );
var lightDiffuse = vec4( 1.0, 1.0, 1.0, 1.0 );
var lightSpecular = vec4( 1.0, 1.0, 1.0, 1.0 );

var materialAmbient = vec4( 1.0, 0.0, 1.0, 1.0 );
var materialDiffuse = vec4( 0.0, 0.0, 1.0, 1.0 );
var materialSpecular = vec4( 1.0, 1.0, 1.0, 1.0 );
var materialShininess = 20.0;

var ctm;
var ambientColor, diffuseColor, specularColor;

let modelViewMatrix, projectionMatrix;
let modelViewMatrixLoc, projectionMatrixLoc;

function factorial(n) {
    if (n === 0 || n === 1)
        return 1;
    return n * factorial(n - 1);
}

//Reference: https://www.scratchapixel.com/lessons/advanced-rendering/bezier-curve-rendering-utah-teapot
function evaluateBezierCurve(selectedCP, t) {

    let initialPoint = vec4();

    let numPoints = selectedCP.length;
    let p = numPoints - 1;

    for (let i = 0; i < numPoints; i++) {
        let k = (factorial(p) / (factorial(i) * factorial(p - i))) * Math.pow((1 - t), p - i) * Math.pow((t), i);
        let newVec4 = vec4(selectedCP[i][0] * k, selectedCP[i][1] * k, selectedCP[i][2] * k, selectedCP[i][3]);
        initialPoint = add(initialPoint, newVec4);
    }

    initialPoint[3] = 1;
    return initialPoint;

}

function evaluateBezierSurface(u, v) {
    let uCurve = [];

    for (let i = 0; i < numRow; i++) {
        let selectedCP = [];
        for (let j = 0; j < numCol; j++)
            selectedCP.push(controlPoints[i][j]);
        uCurve.push(evaluateBezierCurve(selectedCP, u));
    }
    return evaluateBezierCurve(uCurve, v);
}

function evaluateControlPoints() {
    for (let i = 0; i < nSegments; i++)
        for (let j = 0; j < nSegments; j++)
        {
            var x=evaluateBezierSurface(i / (nSegments - 1), j / (nSegments - 1))
            vertices.push(x);
            //normals.push(vec4(x[0], x[1], x[2], 0));
        }

    calculateNormals();
            
}

//Calculates normals for vertices and pushes them to normals array
//Seems to be misfiring :((((((
function calculateNormals()
{
    var n1;
    var n2;
    var n3;
    var n4;

    //console.log("a");

    for (let j =0; j< nSegments; j++)
    {
        for (let i =0; i< nSegments; i++)
        {
            var index = i + nSegments*j;
            if((j+1) < (nSegments) && (i+1) < (nSegments))
            {
                n1 = calculateNormal(vertices[nSegments+index], vertices[index+1], vertices[index]);
                //console.log("b");
            }
            else
            {
                n1 = vec4();
                //console.log("c");
            }
            if((j-1) >= 0 && (i+1) < (nSegments))
            {
                n2 = calculateNormal(vertices[index], vertices[index+1], vertices[-nSegments+index+1]);
            }
            else
            {
                n2 = vec4();
            }
    
            if((j-1) >= 0 && (i-1) >= 0 )
            {
                n3 = calculateNormal(vertices[index], vertices[index-nSegments], vertices[-nSegments+index-1]);
            }
            else
            {
                n3 = vec4();
            }
    
            if((j+1) < nSegments && (i-1) >= 0)
            {
                n4 = calculateNormal(vertices[index], vertices[index+nSegments-1], vertices[nSegments+index]);
            }
            else
            {
                n4 = vec4();
            }
            var nt= add(n1, n2);
            nt = add(nt, n3);
            nt = add(nt, n4);
            nt = normalize(nt, false);
        
            normals.push(vec4(-nt[0], -nt[1], -nt[2], 0));
        }
    }

    //console.log(normals);
}

function calculateNormal(a,b,c)
{
    var t1 = subtract(b, a);
    var t2 = subtract(c, a);
    var normal = normalize(cross(t2, t1));
    normal = vec4(normal);
    return normal;
}

function drawCheckboxes() {

    let checkboxDiv = document.getElementById("checkboxGrid");
    checkboxDiv.innerHTML = "";

    for (let i = 0; i < numCol; i++) {
        let tempDiv = "<div class='checkboxDiv'>";
        for (let j = 0; j < numRow; j++)
            tempDiv += checkBoxTemplate.replace("#checkbox-id", (controlPoints[i][j]));
        tempDiv += "</div>";

        checkboxDiv.innerHTML = tempDiv + checkboxDiv.innerHTML;
    }
}

function assignControlPoints(n) {

    controlPoints = [[vec4(-1, -1, 1, 1), vec4(-0.5, -1, 1, 1), vec4(0, -1, 1, 1), vec4(0.5, -1, 1, 1), vec4(1, -1, 1, 1)],
        [vec4(-1, -0.5, 1, 1), vec4(-0.5, -0.5, 1, 1), vec4(0, -0.5, 1, 1), vec4(0.5, -0.5, 1, 1), vec4(1, -0.5, 1, 1)],
        [vec4(-1, 0, 1, 1), vec4(-0.5, 0, 1, 1), vec4(0, 0, n, 1), vec4(0.5, 0, 1, 1), vec4(1, 0, 1, 1)],
        [vec4(-1, 0.5, 1, 1), vec4(-0.5, 0.5, 1, 1), vec4(0, 0.5, 1, 1), vec4(0.5, 0.5, 1, 1), vec4(1, 0.5, 1, 1)],
        [vec4(-1, 1, 1, 1), vec4(-0.5, 1, 1, 1), vec4(0, 1, 1, 1), vec4(0.5, 1, 1, 1), vec4(1, 1, 1, 1)]];

}

function addControlPointX() {
    const currentXLength = numCol;
    const currentYLength = numRow;
    const newXIncrement = 2.0 / currentXLength;
    const yIncrement = 2.0 / (currentYLength - 1);

    let newControlPoints = [];

    for (let y = 0; y < currentYLength; y++) {
        let temp = [];
        for (let x = 0; x < currentXLength + 1; x++)
            temp.push(vec4(-1 + (x * newXIncrement), -1 + (y * yIncrement), 1, 1));
        newControlPoints.push(temp);
    }

    controlPoints = newControlPoints;

    numCol++;

    drawCheckboxes();
}

function addControlPointY() {
    const currentXLength = numCol;
    const currentYLength = numRow;
    const newXIncrement = 2.0 / (currentXLength - 1);
    const yIncrement = 2.0 / currentYLength;

    let newControlPoints = [];

    for (let y = 0; y < currentYLength + 1; y++) {
        let temp = [];
        for (let x = 0; x < currentXLength; x++)
            temp.push(vec4(-1 + (x * newXIncrement), -1 + (y * yIncrement), 1, 1));
        newControlPoints.push(temp);
    }

    controlPoints = newControlPoints;

    numRow++;

    drawCheckboxes();
}

function changeValue(value) {
    document.getElementById("depthSlider").children[0].innerHTML = angleSldierTemplate + value;
    num = value;
    assignControlPoints(value);
}

function pushVertices(buffer, data) {
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, flatten(data));
}

//----------------------------------------------------

function multq(a, b) {
    // vec4(a.x*b.x - dot(a.yzw, b.yzw), a.x*b.yzw+b.x*a.yzw+cross(b.yzw, a.yzw))

    var s = vec3(a[1], a[2], a[3]);
    var t = vec3(b[1], b[2], b[3]);
    return (vec4(a[0] * b[0] - dot(s, t), add(cross(t, s), add(scale(a[0], t), scale(b[0], s)))));
}


function mouseMotion(x, y) {
    var dx, dy, dz;

    if (trackingMouse) {
        theta = x - startX;
        phi = y - startY;
    }
}

function startMotion(x, y) {
    trackingMouse = true;
    startX = x;
    startY = y;
    curX += x;
    curY += y;
    trackballMove = true;
}

function stopMotion(x, y) {
    trackingMouse = false;
    trackballMove = false;
}

window.onload = init;

function init() {
    let canvas = document.getElementById("gl-canvas");

    gl = WebGLUtils.setupWebGL(canvas);
    if (!gl) alert("WebGL isn't available");

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.0, 0.0, 0.0, 0.0);

    ambientProduct = mult(lightAmbient, materialAmbient);
    diffuseProduct = mult(lightDiffuse, materialDiffuse);
    specularProduct = mult(lightSpecular, materialSpecular);


    // enable depth testing and polygon offset
    // so lines will be in front of filled triangles
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.enable(gl.POLYGON_OFFSET_FILL);
    gl.polygonOffset(1.0, 2.0);

    assignControlPoints(num);

    evaluateControlPoints();

    for (let j = 1; j <= nSegments * nSegments; j++) {

        if ((j - 1) % nSegments === (nSegments - 1))
            continue;
        indexArray.push(j - 1);
        indexArray.push(j);
        indexArray.push(nSegments + j);
        indexArray.push(nSegments + j - 1);
    }

    program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    var nBuffer = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, nBuffer);
    gl.bufferData( gl.ARRAY_BUFFER, flatten(normals), gl.STATIC_DRAW );

    var vNormal = gl.getAttribLocation( program, "vNormal" );
    gl.vertexAttribPointer( vNormal, 4, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vNormal);
    
    let iBufferId = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, iBufferId);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint8Array(indexArray), gl.DYNAMIC_DRAW);
    
    fColor = gl.getUniformLocation(program, "fColor");
    
    modelViewMatrixLoc = gl.getUniformLocation(program, "modelViewMatrix");
    projectionMatrixLoc = gl.getUniformLocation(program, "projectionMatrix");
    normalMatrixLoc = gl.getUniformLocation( program, "normalMatrix" );
    
    vBufferId = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBufferId);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(vertices), gl.DYNAMIC_DRAW);
    
    vPosition = gl.getAttribLocation(program, "vPosition");
    gl.enableVertexAttribArray(vPosition);
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);

    pushVertices(vBufferId, vertices);


    canvas.addEventListener("mousedown", function (event) {
        let x = 2 * event.clientX / canvas.width - 1;
        let y = 2 * (canvas.height - event.clientY) / canvas.height - 1;
        startMotion(x, y);
    });

    canvas.addEventListener("mouseup", function (event) {
        let x = 2 * event.clientX / canvas.width - 1;
        let y = 2 * (canvas.height - event.clientY) / canvas.height - 1;
        stopMotion(x, y);
    });

    canvas.addEventListener("mousemove", function (event) {
        let x = 2 * event.clientX / canvas.width - 1;
        let y = 2 * (canvas.height - event.clientY) / canvas.height - 1;
        mouseMotion(x, y);
    });

    gl.uniform4fv( gl.getUniformLocation(program, 
        "ambientProduct"),flatten(ambientProduct) );
     gl.uniform4fv( gl.getUniformLocation(program, 
        "diffuseProduct"),flatten(diffuseProduct) );
     gl.uniform4fv( gl.getUniformLocation(program, 
        "specularProduct"),flatten(specularProduct) );	
     gl.uniform4fv( gl.getUniformLocation(program, 
        "lightPosition"),flatten(lightPosition) );
     gl.uniform1f( gl.getUniformLocation(program, 
        "shininess"),materialShininess );

    drawCheckboxes();
    render();
}

function convert2DInto1D(arr) {
    let output = [];

    for (let i = 0; i < arr.length; i++)
        output = output.concat(arr[i]);

    return output;
}

//var indexBuffer
var a = 1;

//var x;
function render() {
    //theta += 0.01;
    a++;

    vertices = [];
    normals =[];

    evaluateControlPoints();

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.bindBuffer(gl.ARRAY_BUFFER, vBufferId);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(vertices), gl.STATIC_DRAW);

    let eye = vec3(radius * Math.sin(theta) * Math.cos(phi),
        radius * Math.sin(theta) * Math.sin(phi),
        radius * Math.cos(theta));

    modelViewMatrix = lookAt(eye, at, up);
    projectionMatrix = perspective(fovy, aspect, near, far);

    normalMatrix = [
        vec3(modelViewMatrix[0][0], modelViewMatrix[0][1], modelViewMatrix[0][2]),
        vec3(modelViewMatrix[1][0], modelViewMatrix[1][1], modelViewMatrix[1][2]),
        vec3(modelViewMatrix[2][0], modelViewMatrix[2][1], modelViewMatrix[2][2])
    ];

    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(modelViewMatrix));
    gl.uniformMatrix4fv(projectionMatrixLoc, false, flatten(projectionMatrix));
    gl.uniformMatrix3fv(normalMatrixLoc, false, flatten(normalMatrix) );

    // draw each quad as two filled red triangles
    // and then as two black line loops
    for (let i = 0; i < indexArray.length; i += 4) {
        //gl.uniform4fv(fColor, flatten(red));
        gl.uniform4fv( gl.getUniformLocation(program, 
            "ambientProduct"),flatten(ambientProduct) );
         gl.uniform4fv( gl.getUniformLocation(program, 
            "diffuseProduct"),flatten(diffuseProduct) );
         gl.uniform4fv( gl.getUniformLocation(program, 
            "specularProduct"),flatten(specularProduct) );	
         gl.uniform4fv( gl.getUniformLocation(program, 
            "lightPosition"),flatten(lightPosition) );
         gl.uniform1f( gl.getUniformLocation(program, 
            "shininess"),materialShininess );
        gl.drawElements(gl.TRIANGLE_FAN, 4, gl.UNSIGNED_BYTE, i);

        //gl.uniform1f(wireframe, flatten(flag));
        //gl.uniform4fv(ambientColor, flatten(black));
        gl.uniform4fv( gl.getUniformLocation(program, 
            "ambientProduct"),flatten(black) );
         gl.uniform4fv( gl.getUniformLocation(program, 
            "diffuseProduct"),flatten(black) );
         /*gl.uniform4fv( gl.getUniformLocation(program, 
            "specularProduct"),flatten(black) );*/	
         gl.uniform4fv( gl.getUniformLocation(program, 
            "lightPosition"),flatten(vec4(black)));
         /*gl.uniform1f( gl.getUniformLocation(program, 
            "shininess"),materialShininess );*/
        gl.drawElements(gl.LINE_LOOP, 4, gl.UNSIGNED_BYTE, i);
    }

    gl.bufferData(gl.ARRAY_BUFFER, flatten(convert2DInto1D(controlPoints)), gl.DYNAMIC_DRAW);

    //for (let i = 0; i < fa.length; i += 4) {
    gl.uniform4fv(fColor, flatten(blue));
    gl.drawArrays(gl.POINTS, 0, controlPoints[0].length * controlPoints.length);
    //gl.uniform4fv(fColor, flatten(black));
    //gl.drawElements(gl.LINE_LOOP, 3, gl.UNSIGNED_BYTE, i);
    //}

    requestAnimFrame(render);
}