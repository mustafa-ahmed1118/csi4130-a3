// ==========================================================================
// $Id: Boxes.js,v 1.3 2019/02/27 22:26:54 jlang Exp $
// Texturing of a tetrahedron example based on OpenGL Programming guide
// by Matsuda and Lea, 2013
// ==========================================================================
// (C)opyright:
//
//   This code is heavily based on the WebGL Programming
//   Guide by Kouichi Matsuda and Rodger Lea and is their copyright.
//   See https://sites.google.com/site/webglbook/
//
//   The code posted is re-used with the generours permission by the authors.
//
//   Jochen Lang
//   EECS, University of Ottawa
//   800 King Edward Ave.
//   Ottawa, On., K1N 6N5
//   Canada.
//   http://www.eecs.uottawa.ca
//
// Creator: jlang (Jochen Lang)
// Email:   jlang@eecs.uottawa.ca
// ==========================================================================
// $Log: Boxes.js,v $
// Revision 1.3  2019/02/27 22:26:54  jlang
// Complete example with element-based instanced rendering
//
// Revision 1.2  2019/02/27 03:10:37  jlang
// Element-based drawing
//
// Revision 1.1  2019/02/19 22:17:06  jlang
// Intial (incomplete) boxes laboratory.
// ==========================================================================
// Based on (c) 2012 matsuda
// HelloTriangle.js
// Loadshaderfromfiles.js
// RotateTriangles_withButtons.js
// LookAtTrianglesWithKeys.js
// TexturedQuad.js
// Vertex shader program

var VSHADER_SOURCE = null;
// Fragment shader program
var FSHADER_SOURCE = null;


// Rotation speed (degrees/second)
var SPEED;

// Initialize time of last rotation update
var LAST_FRAME = Date.now();
var VAO;
var roadVAO;
// Number of boxes
const numberOfTrucks = 16;

async function main() {
  // Retrieve <canvas> element
  var canvas = document.getElementById('webgl');

  // Get the rendering context for WebGL
  var gl = getWebGLContext(canvas);
  if (!gl) {
    console.log('Failed to get the rendering context for WebGL');
    return;
  }
 setDefault(); // set global variables to default

  // Read shader from file
  VSHADER_SOURCE = await readShaderFile('shader/boxes.vs');
  FSHADER_SOURCE = await readShaderFile('shader/boxes.fs');

  if (VSHADER_SOURCE && FSHADER_SOURCE) await start(gl, canvas);
}


// Read shader from file
async function readShaderFile(filepath) {
  const response = await fetch(filepath);

    if (!response.ok) {
        console.error(`Error retrieving file: ${filepath}`);
        return new ArrayType([]); // Return an empty array to avoid undefined issues
    }

    return await response.text();
}

async function start(gl, canvas) {

  // Initialize shaders - string now available
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.log('Failed to intialize shaders.');
    return;
  }

  // Write the positions of vertices to a vertex shader
  var n = await initVertexBuffers(gl);
  if (n < 0) {
    console.log('Failed to set the positions of the vertices');
    return;
  }

  await initRoad(gl);

  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LEQUAL);

  // Must enable depth test for proper 3D display
  gl.enable(gl.DEPTH_TEST);
  // Set clear color - state info	
  gl.clearColor(0.3, 0.0, 0.2, 1.0);

  // Specify the rot_matrix as a uniform
  // get the storage location of mvp_matrix
  var u_rot_matrix = gl.getUniformLocation(gl.program, 'rot_matrix');
  if (!u_rot_matrix) {
      console.log('Failed to get the storage location of rot_matrix');
      u_rot_matrix = 0;
    // return;
  }

  // Create the matrix to set the projection matrix
  var projMatrix = glMatrix.mat4.create();

  var fov = glMatrix.glMatrix.toRadian(90.0);
  var aspect = canvas.width/canvas.height;

  glMatrix.mat4.perspective(projMatrix, fov, aspect, 0.01, 100.0);

  var u_proj_matrix = gl.getUniformLocation(gl.program, 'proj_matrix');
  if (u_proj_matrix) {
     gl.uniformMatrix4fv(u_proj_matrix, false, projMatrix );
  } else {
      console.log('Failed to get the storage location of proj_matrix');
      u_proj_matrix = 0;
      // return;
  }

  var viewMatrix = glMatrix.mat4.create();

  glMatrix.mat4.translate(viewMatrix, viewMatrix, [0.0, -2.0, -10]);


  let eyeX = 
  glMatrix.mat4.lookAt(viewMatrix, [10,20,20], [0, 0.0, 0.0], [0.0, 1.0, 0.0]);


  var u_view_matrix = gl.getUniformLocation(gl.program, 'view_matrix');
  if (u_view_matrix) {
     gl.uniformMatrix4fv(u_view_matrix, false, viewMatrix);
  } else {
      console.log('Failed to get the storage location of view_matrix');
      u_proj_matrix = 0;
      // return;
  }
    
  // Current axis angle
  var axisAngle = 0.0;
  // Current rotation angle
  var currentAngle = 0.0;

  // Register the event handler to be called on key press
  document.onkeydown = function(ev){
    keydown(ev, gl, n, currentAngle, u_rot_matrix)};

  // Global camera angle
let camAngle = 0.0;

var tick = function() {
  var now = Date.now();
  var elapsed = now - LAST_FRAME;
  
  // Update rotation angles
  currentAngle = animate(currentAngle, SPEED, elapsed);
  axisAngle = animate(axisAngle, SPEED / 7.0, elapsed);
  LAST_FRAME = now;

  // Update camera position (orbiting effect)
  camAngle += (SPEED * elapsed) / 10000.0; // Slower rotation speed for camera
  let radius = 25.0; // Distance from center
  let camX = Math.cos(glMatrix.glMatrix.toRadian(camAngle)) * radius;
  let camZ = Math.sin(glMatrix.glMatrix.toRadian(camAngle)) * radius;

  // Update view matrix
  glMatrix.mat4.lookAt(viewMatrix, [camX, 20, camZ], [0, 0, 0], [0, 1, 0]);
  gl.uniformMatrix4fv(u_view_matrix, false, viewMatrix);

  draw(gl, n, currentAngle, axisAngle, u_rot_matrix);
  requestAnimationFrame(tick);
};

  tick();
}

async function initVertexBuffers(gl) {
  var box =  new BoxShape();

  var vertex = await fileReaderFunction('truck_data/positions.txt', Float32Array);
  var index = await fileReaderFunction('truck_data/index.txt', Int16Array);
  var colors = await fileReaderFunction('truck_data/colors.txt', Float32Array);

    
  // Get vertices of the box and store in VBO
  VAO = gl.createVertexArray(); // VAO is a global
  gl.bindVertexArray(VAO);

  // Element array buffer object
  elementBuffer = gl.createBuffer(); // element buffer is global
  if (!elementBuffer) {
    console.log('Failed to create the element buffer object');
    return -1;
  }
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, elementBuffer );
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, index, gl.STATIC_DRAW);
    
  // Create a vertex buffer object
  var vertexBuffer = gl.createBuffer();
  if (!vertexBuffer) {
    console.log('Failed to create the vertex buffer object');
    return -1;
  }
  // Bind the buffer object to target
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  // Write data into the buffer object
  gl.bufferData(gl.ARRAY_BUFFER, vertex, gl.STATIC_DRAW);

  var a_vertex = gl.getAttribLocation(gl.program, 'a_vertex');
  if (a_vertex < 0) {
    console.log('Failed to get the storage location of a_vertex');
    return -1;
  }
  // 3 entries per vertex: x y z 
  gl.enableVertexAttribArray(a_vertex);
  gl.vertexAttribPointer(a_vertex, 3, gl.FLOAT, false, 0, 0);

  // Create a color buffer object
  var colorBuffer = gl.createBuffer();
  if (!colorBuffer) {
    console.log('Failed to create the color buffer object');
    return -1;
  }
  // Bind the buffer object to target
  gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
  // Write data into the buffer object
  gl.bufferData(gl.ARRAY_BUFFER, colors, gl.STATIC_DRAW);

  // Get the storage location of a_color, assign buffer and enable
  var a_color = gl.getAttribLocation(gl.program, 'a_color');
  if(a_color < 0) {
    console.log('Failed to get the storage location of a_color');
    return -1;
  }
  // Colors 4 entries per vertex - r g b a
  gl.enableVertexAttribArray(a_color);
  gl.vertexAttribPointer(a_color, 4, gl.FLOAT, false, 0, 0);

  // Matrix attribute
  var mmBuffer = gl.createBuffer();
  if (!mmBuffer) {
    console.log('Failed to create the matrix buffer object');
    return -1;
  }
  gl.bindBuffer(gl.ARRAY_BUFFER, mmBuffer);

  var makeModel = modelMaker();

  gl.bufferData(gl.ARRAY_BUFFER,makeModel,gl.DYNAMIC_DRAW);

  // Figure out how many byte per element
  var sz = makeModel.BYTES_PER_ELEMENT;
    
  var locMM = gl.getAttribLocation( gl.program, 'model_matrix');
  // Need to set attribute for each column separately.
  for (let i = 0; i < 4; i++) {
    // Set up the vertex attribute
    gl.vertexAttribPointer(locMM + i,             // Location
			   4, gl.FLOAT, false,    // Column with four floats, no normalization
			   sz * 16,               // Stride for next 4x4 matrix
			   sz * 4 * i);           // Offset for ith column
    gl.enableVertexAttribArray(locMM + i);
    // Matrix per instance
    gl.vertexAttribDivisor(locMM  + i, 1);
  }

  gl.bindVertexArray(null);

  return index.length; // number of indicies
}

async function initRoad(gl) {
  let roadVertices = new Float32Array([
    -10000.0, -0.01, -10000.0,  // Bottom-left (moved down slightly)
     10000.0, -0.01, -10000.0,  // Bottom-right
     10000.0, -0.01,  10000.0,  // Top-right
    -10000.0, -0.01,  10000.0   // Top-left
  ]);

  let roadIndices = new Uint16Array([
    0, 1, 2,  // First triangle
    0, 2, 3   // Second triangle
  ]);

  let roadColors = new Float32Array([
    0.1, 0.1, 0.1, 1.0,  // Dark gray (asphalt-like color)
    0.1, 0.1, 0.1, 1.0,
    0.1, 0.1, 0.1, 1.0,
    0.1, 0.1, 0.1, 1.0
  ]);

  roadVAO = gl.createVertexArray();
  gl.bindVertexArray(roadVAO);

  // Position Buffer
  let roadVBO = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, roadVBO);
  gl.bufferData(gl.ARRAY_BUFFER, roadVertices, gl.STATIC_DRAW);

  let a_vertex = gl.getAttribLocation(gl.program, "a_vertex");
  gl.vertexAttribPointer(a_vertex, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_vertex);

  // Color Buffer
  let roadColorBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, roadColorBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, roadColors, gl.STATIC_DRAW);

  let a_color = gl.getAttribLocation(gl.program, "a_color");
  gl.vertexAttribPointer(a_color, 4, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_color);

  // Index Buffer
  let roadEBO = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, roadEBO);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, roadIndices, gl.STATIC_DRAW);

  gl.bindVertexArray(null);
}


// Make Plane 
// In draw and init vertex buffer 
// Similar to how we do the different objects in A1. Do not want plane to be in the same buffer as the boxes


function draw(gl, n, currentAngle, axisAngle, u_rot_matrix) {
  let rotMatrix = glMatrix.mat4.create();  
  if (u_rot_matrix != 0) {
    gl.uniformMatrix4fv(u_rot_matrix, false, rotMatrix);
  }

  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // Draw the road first
  gl.bindVertexArray(roadVAO);
  gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);  // Render road as two triangles
  gl.bindVertexArray(null);

  // Draw the trucks
  gl.bindVertexArray(VAO);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, elementBuffer);
  gl.drawElementsInstanced(gl.TRIANGLES, n, gl.UNSIGNED_SHORT, 0, numberOfTrucks);
}



function modelMaker() {
  let truckMatrix = new Float32Array(16 * numberOfTrucks);
  let m4 = glMatrix.mat4.create();
  let m5 = glMatrix.mat4.create();

  let offsetX = 3.0; // Normal spacing between trucks
  let rowZOffset = 12.0; // Distance between rows (slightly increased for better separation)

  let emptySpace = offsetX * 5; // BIG empty parking space (5x normal gap)
  let randomOffsets = []; 

  // 50% chance of an empty space (increase randomness)
  for (let i = 0; i < 16; i++) {
    randomOffsets.push(Math.random() > 0.5 ? emptySpace : offsetX);
  }

  // First row (left to right)
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 16; j++) {
      truckMatrix[i * 16 + j] = m4[j];
    }
    glMatrix.mat4.translate(m4, m4, [randomOffsets[i], 0.0, 0.0]);
  }

  // Second row (right to left, flipped)
  glMatrix.mat4.translate(m5, m5, [0.0, 0.0, rowZOffset]); 
  glMatrix.mat4.rotateY(m5, m5, glMatrix.glMatrix.toRadian(180.0));

  for (let i = 8; i < 16; i++) {
    for (let j = 0; j < 16; j++) {
      truckMatrix[i * 16 + j] = m5[j];
    }
    glMatrix.mat4.translate(m5, m5, [-randomOffsets[i], 0.0, 0.0]);
  }

  return truckMatrix;
}





// Make a time based animation to keep things smooth
// Initialize global variable
function animate(angle,speed,elapsed) {
  // Calculate the elapsed time
  // Update the current rotation angle (adjusted by the elapsed time)
  var newAngle = angle + (speed * elapsed) / 1000.0;
  return newAngle %= 360;
}

function keydown(ev, n, gl, currentAngle, projMatrix, u_rot_matrix) {
  switch(ev.keyCode) {
  case 38: // up arrow key
    SPEED += 2.0;
    break;
  case 40: // down arrow key
    SPEED -= 2.0;
    break;
  }
  draw(gl, n, currentAngle, projMatrix, u_rot_matrix);
}

function setDefault() {
  SPEED = 300.0;
}

function faster() {
  SPEED += 2;
}

function slower() {
  SPEED -= 2;
}



