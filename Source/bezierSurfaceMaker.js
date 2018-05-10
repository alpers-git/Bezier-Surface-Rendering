/*
 * Alper Sahıstan - 21501207
 * Celik Koseoglu - 21400196
 * CS465 Computer Graphics
 * Course Instructor: Ugur Gudukbay
 * TA: Aytek Aman
 * Git commits available at: https://github.com/STLKRv1/Bezier-Surface-Rendering
 *
 * Allows for 2 different methods of shading; Gouraud and Phong.
 * Allows for adding or removing control points.
 * Allows different texture mappings.
 * Allows changing the position of light
 * Has quaternion rotations
 * Has zoom functionality
 * and more....
 */

// initial number of control points
let numRow = 5; // 5 points horizontally
let numCol = 5; // 5 points vertically

let nSegments = 15; //number of segments for bezier equation. More segments will result in smoother curves

let gl;
let program;

// constrants used in the program. First 2 are for the UI and the last 2 are used for texture mapping
const angleSldierTemplate = "Push it! -10 to 10. Currently: ";
const checkBoxTemplate = "<input class=\'checkmark\' type=\"checkbox\" name=\"#checkbox-name\" id=\"#checkbox-id\" onchange=\'cpCheckEvent(this);\'>";
const DEFAULT_TEXTURE_FILENAME = "../resources/paramet.png";
const DEFAULT_TEXTURE_LOCATION = "../resources/";

let vertices = [];
let normals = []; //used for shading calculations
let indexArray = [];
let controlPoints = [];
let texCoordsArray = [];

let vBufferId;
let vPosition;

let fColor;
let flag;

let renderW;

// requrired for setting up the camera
let near = 1;
let far = 20;
let radius = 6.0;
let eyeTheta = 0.0;
let phi = 1.0;
const at = vec3(0.0, 0.0, 0.0);
const up = vec3(0.0, -1.0, 0.0);
let fovy = 60;
let aspect = 2;

// some predefined colors
const black = vec4(0.0, 0.0, 0.0, 1.0);
const blue = vec4(0.0, 0.0, 1.0, 1.0);
const red = vec4(1.0, 0.0, 0.0, 1.0);

// lighting
let lightPosition = vec4(1.0, 1.0, 1.0, 1.0);
let lightAmbient = vec4(0.0, 0.0, 0.0, 1.0);
let lightDiffuse = vec4(0.8, 0.8, 0.8, 1.0);
let lightSpecular = vec4(0.8, 0.8, 0.8, 1.0);

// material shading
let materialAmbient = vec4(0.5, 0.5, 0.5, 1.0);
let materialDiffuse = vec4(0.8, 0.8, 0.8, 1.0);
let materialSpecular = vec4(0.8, 0.8, 0.5, 1.0);
let materialShininess = 1000.0;

// light calculation matrices
let ambientProduct = mult(lightAmbient, materialAmbient);
let diffuseProduct = mult(lightDiffuse, materialDiffuse);
let specularProduct = mult(lightSpecular, materialSpecular);

let modelViewMatrix, projectionMatrix;
let modelViewMatrixLoc, projectionMatrixLoc;
let normalMatrix;
let normalMatrixLoc;

let checkedControlPoints = []; // stores the index of checked control points. These points are drawn on the curve when selected

// quaternion rotation stuff
var rotationMatrix;
var rotationMatrixLoc;
var axis = [1, 0, 0]; // default quaternion rotation axis is x

// tail recursive fast factorial method. Required for bezier surface rendering equation
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

// evaluate the bezier surface using the evaluateBezierCurve method
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

//evaulate bezier control points according to the number of segments.
function evaluateControlPoints() {
    for (let i = 0; i < nSegments; i++)
        for (let j = 0; j < nSegments; j++) {
            let x = evaluateBezierSurface(i / (nSegments - 1), j / (nSegments - 1));
            vertices.push(x);
            texCoordsArray.push(vec2(i / (nSegments - 1), j / (nSegments - 1)));
        }

    calculateNormals();
}

// calculates normals for vertices and pushes them to normals array
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

// function to bind the texture onto the curve
function configureTexture(fileName) {
    let texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.MIRRORED_REPEAT);
    let image = new Image();
    image.src = fileName;
    image.addEventListener('load', function () {
        // Now that the image has loaded make copy it to the texture.
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.activeTexture(gl.TEXTURE0);

    });
}

// called when the texture comboBox value is changed on the UI. Calls the texture loading method with the value of the selection
function textureSelectionChanged(textureSelector) {
    configureTexture(DEFAULT_TEXTURE_LOCATION + textureSelector.value);
}

// called when the light sliders are moved
function translateLight(lightSlider) {

    if (lightSlider.name === 'x')
        lightPosition[0] = lightSlider.value;
    else if (lightSlider.name === 'y')
        lightPosition[1] = lightSlider.value;
    else if (lightSlider.name === 'z')
        lightPosition[2] = lightSlider.value;

    lightPosition[3] = 1.0;
}

// called then the shininess slider is moved on the UI
function setShininess(slider)
{
    materialShininess = slider.value;
}

// method to calculate the surface normal. Supply 3 points and it will return the normal vector
function calculateNormal(a, b, c) {
    let t1 = subtract(b, a);
    let t2 = subtract(c, a);
    let normal = normalize(cross(t2, t1));
    normal = vec4(normal);
    return normal;
}

// initialize default control points
function initializeControlPoints() {

    controlPoints = [[vec4(-1, -1, 1, 1), vec4(-0.5, -1, 1, 1), vec4(0, -1, 1, 1), vec4(0.5, -1, 1, 1), vec4(1, -1, 1, 1)],
        [vec4(-1, -0.5, 1, 1), vec4(-0.5, -0.5, 1, 1), vec4(0, -0.5, 1, 1), vec4(0.5, -0.5, 1, 1), vec4(1, -0.5, 1, 1)],
        [vec4(-1, 0, 1, 1), vec4(-0.5, 0, 1, 1), vec4(0, 0, 1, 1), vec4(0.5, 0, 1, 1), vec4(1, 0, 1, 1)],
        [vec4(-1, 0.5, 1, 1), vec4(-0.5, 0.5, 1, 1), vec4(0, 0.5, 1, 1), vec4(0.5, 0.5, 1, 1), vec4(1, 0.5, 1, 1)],
        [vec4(-1, 1, 1, 1), vec4(-0.5, 1, 1, 1), vec4(0, 1, 1, 1), vec4(0.5, 1, 1, 1), vec4(1, 1, 1, 1)]];

}

// called when a new control point is checked on the grid. Adds the index of the control point to the checkedControlPoints array. This array is later used to draw dots on the control points on the canvas.
function cpCheckEvent(checkBox) {
    if (checkBox.checked)
        checkedControlPoints.push(checkBox.name);
    else
        checkedControlPoints.splice( checkedControlPoints.indexOf(checkBox.name), 1 );
}

//draws checkboxes on the UI. Relies on the pre-calculated increment values of checkboxes and numRow numCol
function drawCheckboxes() {

    let checkBoxNum = controlPoints[0].length * controlPoints.length - 1;

    let checkboxDiv = document.getElementById("checkboxGrid");
    checkboxDiv.innerHTML = "";

    for (let i = 0; i < numRow; i++) {
        let tempDiv = "<div class='checkboxDiv'>";
        for (let j = 0; j < numCol; j++) {
            tempDiv += checkBoxTemplate.replace("#checkbox-id", (controlPoints[i][j])).replace("#checkbox-name", checkBoxNum);
            checkBoxNum--;
        }
        tempDiv += "</div>";

        checkboxDiv.innerHTML = tempDiv + checkboxDiv.innerHTML;
    }
}

function addControlPointX() {

    if (numCol > 9) {
        alert("10 control points should do. I can add but ask no more.");
        return;
    }

    checkedControlPoints = [];

    // create new increment values for the X axis
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
    numCol++; // obviously don't forget to increase the number of rows

    drawCheckboxes();
}

// method to increase the control points on the Y axis. Sets the upper bound to 10
function addControlPointY() {

    if (numRow > 9) {
        alert("10 control points should do. I can add but ask no more.");
        return;
    }

    checkedControlPoints = [];

    // create new increment values for the X axis
    const newXIncrement = 2.0 / (numCol - 1);
    const yIncrement = 2.0 / numRow;

    let newControlPoints = [];

    for (let y = 0; y < numRow + 1; y++) {
        let temp = [];
        for (let x = 0; x < numCol; x++)
            temp.push(vec4(-1 + (x * newXIncrement), -1 + (y * yIncrement), 1, 1));
        newControlPoints.push(temp);
    }

    controlPoints = newControlPoints; // change old control points with the new ones
    numRow++; // obviously don't forget to increase the number of rows

    drawCheckboxes();
}

// method to remove a control point from the X axis. Limits the lower bound to 3
function removeControlPointX() {

    if (numCol < 4) {
        alert("What Bezier do if he saw you try this with less than 3 CPs?");
        return;
    }

    checkedControlPoints = []; // create an array of new control points. To be filled later

    // create new increment values for the X axis
    const newXIncrement = 2.0 / (numCol - 2);
    const yIncrement = 2.0 / (numRow - 1);

    let newControlPoints = [];

    // create new control point coordinates with the new increment values
    for (let y = 0; y < numRow; y++) {
        let temp = [];
        for (let x = 0; x < numCol - 1; x++)
            temp.push(vec4(-1 + (x * newXIncrement), -1 + (y * yIncrement), 1, 1));
        newControlPoints.push(temp);
    }

    controlPoints = newControlPoints; // change old control points with the new ones
    numCol--; // obviously don't forget to decrease the number of rows

    drawCheckboxes();

}

// method to remove a control point from the Y axis. Limits the lower bound to 3
function removeControlPointY() {

    if (numRow < 4) {
        alert("What Bezier do if he saw you try this with less than 3 CPs?");
        return;
    }

    checkedControlPoints = []; // create an array of new control points. To be filled later

    // create new increment values for the Y axis
    const newXIncrement = 2.0 / (numCol - 1);
    const yIncrement = 2.0 / (numRow - 2);

    let newControlPoints = [];

    // create new control point coordinates with the new increment values
    for (let y = 0; y < numRow - 1; y++) {
        let temp = [];
        for (let x = 0; x < numCol; x++)
            temp.push(vec4(-1 + (x * newXIncrement), -1 + (y * yIncrement), 1, 1));
        newControlPoints.push(temp);
    }

    controlPoints = newControlPoints; // change old control points with the new ones
    numRow--; // obviously don't forget to decrease the number of rows

    drawCheckboxes();

}

// assign the new depth value of the specified control point
function changeControlPointDepth(x, y, axis, depth) {
    controlPoints[x][y][axis] = depth;
}

// method to change the depth of bezier curves. Called when a depth slider is moved.
function changeValue(sliderObject) {
    document.getElementById(sliderObject.id + "Slider").innerHTML = sliderObject.id + " " + angleSldierTemplate + sliderObject.value;

    let checkboxDiv = document.getElementById("checkboxGrid");

    for (let i = 0; i < numRow; i++) {
        let childDiv = checkboxDiv.children[i];
        for (let j = 0; j < numCol; j++) {
            let checkBox = childDiv.children[j];

            if (checkBox.checked)
                changeControlPointDepth(i, numCol - j - 1, sliderObject.name, sliderObject.value);
        }
    }
}

// set the buffer contain specified data
function pushVertices(buffer, data) {
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, flatten(data));
}

// rotation matrix calculation for X axis. Called when the X rotation slider is moved.
function changeAngleX(xVal) {
    let yVal = document.getElementById("yAngleSlider").value;
    rotationMatrix = mult(rotate(xVal, [1, 0, 0]), rotate(yVal, [0, 1, 0]));
}

// rotation matrix calculation for X axis. Called when the Y rotation slider is moved.
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
    gl.clearColor(0.0, 0.0, 0.0, 0.0); // fully transparent background

    ambientProduct = mult(lightAmbient, materialAmbient);
    diffuseProduct = mult(lightDiffuse, materialDiffuse);
    specularProduct = mult(lightSpecular, materialSpecular);

    // enable depth testing and polygon offset so lines will be in front of filled triangles
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.enable(gl.POLYGON_OFFSET_FILL);
    gl.polygonOffset(1.0, 2.0);

    initializeControlPoints(); // initalize 5x5 control points with their default values
    evaluateControlPoints(); // evaluate newly initialized control points

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
    gl.uniform1i(flag, 1.0);

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

    configureTexture(DEFAULT_TEXTURE_FILENAME); // load the default texture

    drawCheckboxes(); // draw the checkboxes on the UI

    rotationMatrix = mat4();
    rotationMatrixLoc = gl.getUniformLocation(program, "r");
    gl.uniformMatrix4fv(rotationMatrixLoc, false, flatten(rotationMatrix));

    render(); // after everything is initialized to its default value, call the render method to do the magic

}

// used to convert control points 2D array into 1D array before flattening. A 2D is better for our manipulation purposes
function convert2DInto1D(arr) {
    let output = [];

    for (let i = 0; i < arr.length; i++)
        output = output.concat(arr[i]);

    return output;
}

// method to switch shading method. Called when the UI slider is triggered.
function switchShading(box) {
    box.checked ? gl.uniform1i(flag, 1.0) : gl.uniform1i(flag, 0.0);
    box.checked ? document.getElementById("shading").innerHTML = "Gouraud Shading": document.getElementById("shading").innerHTML = "Phong Shading";
}

// called when the wireframe switch is toggled on the UI
function toggleWireframe(box) {
    renderW = box.checked;
}

function render() {

    // limit render output to 60FPS. No need to render more frames then the display could show. Input latency is not very important for this application.
    function animate() {
        setTimeout(function () {

            requestAnimationFrame(render);

            vertices = [];
            normals = [];

            evaluateControlPoints(); //evaluate new bezier curve

            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); // clear the canvas

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
                if (checkedControlPoints.includes(i.toString()))
                    gl.drawArrays(gl.POINTS, i, 1);
            }


        }, 1000 / 60)
    }

    animate(); // start the render process.
}