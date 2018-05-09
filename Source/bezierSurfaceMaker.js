let numRow = 5;
let numCol = 5;

let nSegments = 15;

let gl;
let program;

const angleSldierTemplate = "Push it! -10 to 10. Currently: ";
const checkBoxTemplate = "<input type=\"checkbox\" id=\"#checkbox-id\" onchange=\'cpCheckEvent(this);\'>";

let vertices = [];
let normals = [];
let indexArray = [];
let controlPoints = [];
let texCoordsArray = [];

let vBufferId;
let vPosition;

let fColor;
let flag;

let renderW;

let near = 1;
let far = 20;

let radius = 6.0;
let eyeTheta = 0.0;
let phi = 1.0;

const black = vec4(0.0, 0.0, 0.0, 1.0);
const blue = vec4(0.0, 0.0, 1.0, 1.0);
const red = vec4(1.0, 0.0, 0.0, 1.0);

const at = vec3(0.0, 0.0, 0.0);
const up = vec3(0.0, -1.0, 0.0);

let fovy = 60;
let aspect = 2;

let lightPosition = vec4(30.0, 1.0, 9.0, 1.0);
let lightAmbient = vec4(0.1, 0.1, 0.1, 1.0);
let lightDiffuse = vec4(0.8, 0.8, 0.8, 1.0);
let lightSpecular = vec4(0.8, 0.8, 0.8, 1.0);

let materialAmbient = vec4(0.5, 0.5, 0.5, 1.0);
let materialDiffuse = vec4(0.8, 0.8, 0.8, 1.0);
let materialSpecular = vec4(0.8, 0.8, 0.8, 1.0);
let materialShininess = 10.0;


let ambientProduct = mult(lightAmbient, materialAmbient);
let diffuseProduct = mult(lightDiffuse, materialDiffuse);
let specularProduct = mult(lightSpecular, materialSpecular);

let modelViewMatrix, projectionMatrix;
let modelViewMatrixLoc, projectionMatrixLoc;

let normalMatrix;
let normalMatrixLoc;

// q stuff
var rotationMatrix;
var rotationMatrixLoc;

var angle = 0.0;
var axis = [1, 0, 0];
//

function factorial(n) {
    return (n === 0 || n === 1) ? 1 : n * factorial(n - 1);
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
        for (let j = 0; j < nSegments; j++) {
            let x = evaluateBezierSurface(i / (nSegments - 1), j / (nSegments - 1))
            vertices.push(x);
            texCoordsArray.push(vec2(i / (nSegments - 1), j / (nSegments - 1)));
        }

    calculateNormals();
}

//Calculates normals for vertices and pushes them to normals array
function calculateNormals() {
    let n1;
    let n2;
    let n3;
    let n4;

    for (let j = 0; j < nSegments; j++) {
        for (let i = 0; i < nSegments; i++) {
            let index = i + nSegments * j;
            if ((j + 1) < (nSegments) && (i + 1) < (nSegments))
                n1 = calculateNormal(vertices[nSegments + index], vertices[index + 1], vertices[index]);
            else
                n1 = vec4();
            if ((j - 1) >= 0 && (i + 1) < (nSegments))
                n2 = calculateNormal(vertices[index], vertices[index + 1], vertices[-nSegments + index + 1]);
            else
                n2 = vec4();

            if ((j - 1) >= 0 && (i - 1) >= 0)
                n3 = calculateNormal(vertices[index], vertices[index - nSegments], vertices[-nSegments + index - 1]);
            else
                n3 = vec4();

            if ((j + 1) < nSegments && (i - 1) >= 0)
                n4 = calculateNormal(vertices[index], vertices[index + nSegments - 1], vertices[nSegments + index]);
            else
                n4 = vec4();

            let nt = add(n1, n2);
            nt = add(nt, n3);
            nt = add(nt, n4);
            nt = normalize(nt, false);
            normals.push(vec4(-nt[0], -nt[1], -nt[2], 0));
        }
    }
}

function configureTexture() {
    let texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    let image = new Image();
    image.src = "../resources/tex7.png";//FOR FUN TYPE tex2
    image.addEventListener('load', function () {
        // Now that the image has loaded make copy it to the texture.
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        gl.generateMipmap(gl.TEXTURE_2D);
    });
}

function calculateNormal(a, b, c) {
    let t1 = subtract(b, a);
    let t2 = subtract(c, a);
    let normal = normalize(cross(t2, t1));
    normal = vec4(normal);
    return normal;
}

function initializeControlPoints(n) {

    controlPoints = [[vec4(-1, -1, 1, 1), vec4(-0.5, -1, 1, 1), vec4(0, -1, 1, 1), vec4(0.5, -1, 1, 1), vec4(1, -1, 1, 1)],
        [vec4(-1, -0.5, 1, 1), vec4(-0.5, -0.5, 1, 1), vec4(0, -0.5, 1, 1), vec4(0.5, -0.5, 1, 1), vec4(1, -0.5, 1, 1)],
        [vec4(-1, 0, 1, 1), vec4(-0.5, 0, 1, 1), vec4(0, 0, n, 1), vec4(0.5, 0, 1, 1), vec4(1, 0, 1, 1)],
        [vec4(-1, 0.5, 1, 1), vec4(-0.5, 0.5, 1, 1), vec4(0, 0.5, 1, 1), vec4(0.5, 0.5, 1, 1), vec4(1, 0.5, 1, 1)],
        [vec4(-1, 1, 1, 1), vec4(-0.5, 1, 1, 1), vec4(0, 1, 1, 1), vec4(0.5, 1, 1, 1), vec4(1, 1, 1, 1)]];

}

function cpCheckEvent(checkBox) {
    console.log(checkBox.id);
}

function drawCheckboxes() {

    let checkboxDiv = document.getElementById("checkboxGrid");
    checkboxDiv.innerHTML = "";

    for (let i = 0; i < numRow; i++) {
        let tempDiv = "<div class='checkboxDiv'>";
        for (let j = 0; j < numCol; j++)
            tempDiv += checkBoxTemplate.replace("#checkbox-id", (controlPoints[i][j]));
        tempDiv += "</div>";

        checkboxDiv.innerHTML = tempDiv + checkboxDiv.innerHTML;
    }
}

function addControlPointX() {

    const newXIncrement = 2.0 / numCol;
    const yIncrement = 2.0 / (numRow - 1);

    let newControlPoints = [];

    for (let y = 0; y < numRow; y++) {
        let temp = [];
        for (let x = 0; x < numCol + 1; x++)
            temp.push(vec4(-1 + (x * newXIncrement), -1 + (y * yIncrement), 1, 1));
        newControlPoints.push(temp);
    }

    controlPoints = newControlPoints;
    numCol++;

    drawCheckboxes();
}

function addControlPointY() {

    const newXIncrement = 2.0 / (numCol - 1);
    const yIncrement = 2.0 / numRow;

    let newControlPoints = [];

    for (let y = 0; y < numRow + 1; y++) {
        let temp = [];
        for (let x = 0; x < numCol; x++)
            temp.push(vec4(-1 + (x * newXIncrement), -1 + (y * yIncrement), 1, 1));
        newControlPoints.push(temp);
    }

    controlPoints = newControlPoints;
    numRow++;

    drawCheckboxes();
}

function changeControlPointDepth(x, y, axis, depth) {
    controlPoints[x][y][axis] = depth;
}

function changeValue(sliderObject) {
    document.getElementById(sliderObject.id + "Slider").innerHTML = sliderObject.id + " " + angleSldierTemplate + sliderObject.value;

    let checkboxDiv = document.getElementById("checkboxGrid");

    for (let i = 0; i < numRow; i++) {
        let childDiv = checkboxDiv.children[i];
        for (let j = 0; j < numCol; j++) {
            let checkBox = childDiv.children[j];

            if (checkBox.checked)
                changeControlPointDepth(i, j, sliderObject.name, sliderObject.value);
        }
    }
}

function pushVertices(buffer, data) {
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, flatten(data));
}

function changeAngleX(xVal) {
    let yVal = document.getElementById("yAngleSlider").value;

    rotationMatrix = mult(rotate(xVal, [1, 0, 0]), rotate(yVal, [0, 1, 0]));
}

function changeAngleY(yVal) {

    let xVal = document.getElementById("xAngleSlider").value;

    rotationMatrix = mult(rotate(xVal, [1, 0, 0]), rotate(yVal, [0, 1, 0]));
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

    initializeControlPoints(0);
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

    let tBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, tBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(texCoordsArray), gl.STATIC_DRAW);

    let vTexCoord = gl.getAttribLocation(program, "vTexCoord");
    gl.vertexAttribPointer(vTexCoord, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vTexCoord);

    let nBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, nBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(normals), gl.STATIC_DRAW);

    let vNormal = gl.getAttribLocation(program, "vNormal");
    gl.vertexAttribPointer(vNormal, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vNormal);

    let iBufferId = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, iBufferId);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint8Array(indexArray), gl.DYNAMIC_DRAW);

    fColor = gl.getUniformLocation(program, "fColor");
    flag = gl.getUniformLocation(program, "flag");

    modelViewMatrixLoc = gl.getUniformLocation(program, "modelViewMatrix");
    projectionMatrixLoc = gl.getUniformLocation(program, "projectionMatrix");
    normalMatrixLoc = gl.getUniformLocation(program, "normalMatrix");

    vBufferId = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBufferId);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(vertices), gl.DYNAMIC_DRAW);

    vPosition = gl.getAttribLocation(program, "vPosition");
    gl.enableVertexAttribArray(vPosition);
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);

    pushVertices(vBufferId, vertices);

    gl.uniform4fv(gl.getUniformLocation(program, "ambientProduct"), flatten(ambientProduct));
    gl.uniform4fv(gl.getUniformLocation(program, "diffuseProduct"), flatten(diffuseProduct));
    gl.uniform4fv(gl.getUniformLocation(program, "specularProduct"), flatten(specularProduct));
    gl.uniform4fv(gl.getUniformLocation(program, "lightPosition"), flatten(lightPosition));
    gl.uniform1f(gl.getUniformLocation(program, "shininess"), materialShininess);

    configureTexture();

    drawCheckboxes();

    rotationMatrix = mat4();
    rotationMatrixLoc = gl.getUniformLocation(program, "r");
    gl.uniformMatrix4fv(rotationMatrixLoc, false, flatten(rotationMatrix));

    render();

}

function convert2DInto1D(arr) {
    let output = [];

    for (let i = 0; i < arr.length; i++)
        output = output.concat(arr[i]);

    return output;
}

function switchShading(box) {
    box.checked ? gl.uniform1i(flag, 1.0) : gl.uniform1i(flag, 0.0);
}

function toggleWireframe(box) {
    renderW = box.checked;
}

let a = 1;

//var x;
function render() {
    //eyeTheta += 0.03;

    function animate() {
        setTimeout(function () {

            requestAnimationFrame(render);

            //a++;

            vertices = [];
            normals = [];

            evaluateControlPoints();

            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

            axis = normalize(axis);
            gl.uniformMatrix4fv(rotationMatrixLoc, false, flatten(rotationMatrix));

            gl.bindBuffer(gl.ARRAY_BUFFER, vBufferId);
            gl.bufferData(gl.ARRAY_BUFFER, flatten(vertices), gl.STATIC_DRAW);

            let eye = vec3(radius * Math.sin(eyeTheta) * Math.cos(phi), radius * Math.sin(eyeTheta) * Math.sin(phi), radius * Math.cos(eyeTheta));

            let zoomFactor = document.getElementById("zoomSlider").value;

            eye = mult(vec3(zoomFactor, zoomFactor, zoomFactor), eye);

            modelViewMatrix = lookAt(eye, at, up);
            projectionMatrix = perspective(fovy, aspect, near, far);

            normalMatrix = [
                vec3(modelViewMatrix[0][0], modelViewMatrix[0][1], modelViewMatrix[0][2]),
                vec3(modelViewMatrix[1][0], modelViewMatrix[1][1], modelViewMatrix[1][2]),
                vec3(modelViewMatrix[2][0], modelViewMatrix[2][1], modelViewMatrix[2][2])
            ];

            ambientProduct = mult(lightAmbient, materialAmbient);
            diffuseProduct = mult(lightDiffuse, materialDiffuse);
            specularProduct = mult(lightSpecular, materialSpecular);

            gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(modelViewMatrix));
            gl.uniformMatrix4fv(projectionMatrixLoc, false, flatten(projectionMatrix));
            gl.uniformMatrix3fv(normalMatrixLoc, false, flatten(normalMatrix));

            // draw each quad as two filled red triangles
            // and then as two black line loops
            for (let i = 0; i < indexArray.length; i += 4) {
                //gl.uniform4fv(fColor, flatten(red));
                gl.uniform4fv(gl.getUniformLocation(program, "ambientProduct"), flatten(ambientProduct));
                gl.uniform4fv(gl.getUniformLocation(program, "diffuseProduct"), flatten(diffuseProduct));
                gl.uniform4fv(gl.getUniformLocation(program, "specularProduct"), flatten(specularProduct));
                gl.uniform4fv(gl.getUniformLocation(program, "lightPosition"), flatten(lightPosition));
                gl.uniform1f(gl.getUniformLocation(program, "shininess"), materialShininess);

                gl.drawElements(gl.TRIANGLE_FAN, 4, gl.UNSIGNED_BYTE, i);

                if (renderW) {
                    gl.uniform4fv(gl.getUniformLocation(program, "ambientProduct"), flatten(black));
                    gl.uniform4fv(gl.getUniformLocation(program, "diffuseProduct"), flatten(black));
                    gl.uniform4fv(gl.getUniformLocation(program, "specularProduct"), flatten(black));

                    gl.drawElements(gl.LINE_LOOP, 4, gl.UNSIGNED_BYTE, i);
                }
            }

            gl.bufferData(gl.ARRAY_BUFFER, flatten(convert2DInto1D(controlPoints)), gl.DYNAMIC_DRAW);
            gl.uniform4fv(gl.getUniformLocation(program, "ambientProduct"), flatten(blue));
            gl.uniform4fv(gl.getUniformLocation(program, "diffuseProduct"), flatten(blue));
            gl.uniform4fv(gl.getUniformLocation(program, "specularProduct"), flatten(blue));
            gl.uniform4fv(gl.getUniformLocation(program, "lightPosition"), flatten(blue));

            for (let i = 0; i < controlPoints[0].length * controlPoints.length; i++) {
                gl.drawArrays(gl.POINTS, i, 1);
            }
        }, 1000 / 60)
    }

    animate();
}