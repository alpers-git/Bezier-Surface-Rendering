var gl;

var nRows = 15;
var nColumns = 15;
var x = 1;

// data for radial hat function: sin(Pi*r)/(Pi*r)

/*var data = [];
for( var i = 0; i < nRows; ++i ) {
    data.push( [] );
    var x = Math.PI*(4*i/nRows-2.0);
    
    for( var j = 0; j < nColumns; ++j ) {
        var y = Math.PI*(4*j/nRows-2.0);
        var r = Math.sqrt(x*x+y*y);
        
        // take care of 0/0 for r = 0
        
        data[i][j] = r ? Math.sin(r) / r : 1.0;
    }
}*/

var vertices = [];
var pointsArray = [];
var indexArray = [];
var controlPoints = [];// temporary 4x4 control points


var num = 1;                    
var fColor;
var nSegments = 10;

var near = -10;
var far = 10;
var radius = 6.0;
var theta  = 0.0;
var phi    = 0.0;
var dr = 5.0 * Math.PI/180.0;

const black = vec4(0.0, 0.0, 0.0, 1.0);
const blue = vec4(0.0, 0.0, 1.0, 1.0);

const at = vec3(0.0, 0.0, 0.0);
const up = vec3(0.0, 1.0, 0.0);

var left = -2.0;
var right = 2.0;
var ytop = 2.0;
var bottom = -2.0;

var modeViewMatrix, projectionMatrix;
var modelViewMatrixLoc, projectionMatrixLoc;

function quad(  a,  b,  c,  d ) {
    pointsArray.push(vertices[a]); 
    pointsArray.push(vertices[b]); 
    pointsArray.push(vertices[c]);
    pointsArray.push(vertices[a]); 
    pointsArray.push(vertices[c]); 
    pointsArray.push(vertices[d]); 
}

//Refference:https://www.scratchapixel.com/lessons/advanced-rendering/bezier-curve-rendering-utah-teapot
function evaluateBezierCurve(cPoints)
{
    var Pt = [];
    for(var i = 0; i < nSegments; i++ )
    {
        var t = i / nSegments; 
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
        vertices.push(Pt);
    }
    //pointsArray.push(Pt);
}

function evaluateBezierSurface()
{
    for(var i = 0; i < 4; i++)
    {
        var cPoints = [];

        cPoints.push(controlPoints[i*4]);

        cPoints.push(controlPoints[i*4 + 1]);

        cPoints.push(controlPoints[i*4 + 2]);

        cPoints.push(controlPoints[i*4 + 3]);

        //console.log(cPoints);
        
        evaluateBezierCurve(cPoints);
    }
}

function changeValue(value)
{
    console.log(value);
    num = value;
}

window.onload = init;
function init()
{
    var canvas = document.getElementById( "gl-canvas" );
    
    gl = WebGLUtils.setupWebGL( canvas );
    if ( !gl ) { alert( "WebGL isn't available" ); }

    gl.viewport( 0, 0, canvas.width, canvas.height );
    
    gl.clearColor( 0.0, 0.0, 0.0, 0.0 );
    
    // enable depth testing and polygon offset
    // so lines will be in front of filled triangles
    
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.enable(gl.POLYGON_OFFSET_FILL);
    gl.polygonOffset(1.0, 2.0);

    controlPoints = [vec4(-1,-1,1,1), vec4(-0.5,-1,1,1), vec4(0.5,-1,1,1), vec4(1,-1,1,1),
        vec4(-1,-0.5,1,1), vec4(-0.5,-0.5,num,1), vec4(0.5,-0.5,num,1), vec4(1,-0.5,1,1),
        vec4(-1,0.5,1,1), vec4(-0.5,0.5,num,1), vec4(0.5,0.5,num,1), vec4(1,0.5,1,1),
        vec4(-1,1,1,1), vec4(-0.5,1,1,1), vec4(0.5,1,1,1), vec4(1,1,1,1)];

    evaluateBezierSurface();

    //push the points
    for(var i = 0; i < 9; i++)
    {
        //if( i % (nSegments-1) != 0 || i % (nSegments+1) != 0)
            quad(i + nSegments, i + nSegments+1, i + 1, i);
    }
    for(var i = 10; i < 19; i++)
    {
        //if( i % (nSegments-1) != 0 || i % (nSegments+1) != 0)
            quad(i + nSegments, i + nSegments+1, i + 1, i);
    }
    for(var i = 20; i < 29; i++)
    {
        //if( i % (nSegments-1) != 0 || i % (nSegments+1) != 0)
            quad(i + nSegments, i + nSegments+1, i + 1, i);
    }

    var program = initShaders( gl, "vertex-shader", "fragment-shader" );
    gl.useProgram( program );
    
    fColor = gl.getUniformLocation(program, "fColor");
 
    modelViewMatrixLoc = gl.getUniformLocation( program, "modelViewMatrix" );
    projectionMatrixLoc = gl.getUniformLocation( program, "projectionMatrix" );
    
    var vBufferId = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, vBufferId );
    gl.bufferData( gl.ARRAY_BUFFER, flatten(pointsArray), gl.STATIC_DRAW);
    
    
    var vPosition = gl.getAttribLocation( program, "vPosition" );
    gl.enableVertexAttribArray( vPosition );
    gl.vertexAttribPointer( vPosition, 4, gl.FLOAT, false, 0, 0);
    

    //gl.enableVertexAttribArray( vPosition );
    //gl.enableVertexAttribArray( 2 );
    gl.bindBuffer( gl.ARRAY_BUFFER, vBufferId );
    //gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    render();
}
//var indexBuffer
var a = 10
//var x;
function render()
{
    theta += 0.01;
    a++;
    //phi += 0.001;
    gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    
    var eye = vec3( radius*Math.sin(theta)*Math.cos(phi), 
                    radius*Math.sin(theta)*Math.sin(phi),
                    radius*Math.cos(theta));
    
    modelViewMatrix = lookAt( eye, at, up );
    projectionMatrix = ortho( left, right, bottom, ytop, near, far );
    
    gl.uniformMatrix4fv( modelViewMatrixLoc, false, flatten(modelViewMatrix) );
    gl.uniformMatrix4fv( projectionMatrixLoc, false, flatten(projectionMatrix) );

    // draw each quad as two filled red triangles
    // and then as two black line loops
    
    for(var i=0; i < pointsArray.length; i+=3) { 
        gl.uniform4fv(fColor, flatten(blue));
        gl.drawArrays( gl.TRIANGLE_STRIP, i, 3);
        gl.uniform4fv(fColor, flatten(black));
        //gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
        gl.drawArrays( gl.LINE_LOOP, i, 3);
    }
    
    pointsArray=[];
    vertices =[];

    requestAnimFrame(init);
}