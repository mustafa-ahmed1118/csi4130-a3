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
var FSHADER_SOURCE = null;

var SPEED;
var LAST_FRAME = Date.now();
var VAO;
const N_BOXES = 16;

function main() {
  var canvas = document.getElementById('webgl');
  var gl = getWebGLContext(canvas);
  if (!gl) {
    console.log('Failed to get the rendering context for WebGL');
    return;
  }

  setDefault();
  readShaderFile(gl, 'shader/boxes.vs', 'v');
  readShaderFile(gl, 'shader/boxes.fs', 'f');
}

function readShaderFile(gl, fileName, shader) {
  var request = new XMLHttpRequest();
  request.open('GET', fileName, true);
  request.onreadystatechange = function() {
    if (request.readyState == 4 && request.status !== 404) {
      onReadShader(gl, request.responseText, shader);
    }
  };
  request.send();
}

function onReadShader(gl, fileString, shader) {
  if (shader == 'v') {
    VSHADER_SOURCE = fileString;
  } else if (shader == 'f') {
    FSHADER_SOURCE = fileString;
  }
  if (VSHADER_SOURCE && FSHADER_SOURCE) start(gl);
}

function start(gl) {
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.log('Failed to initialize shaders.');
    return;
  }

  var n = initVertexBuffers(gl);
  if (n < 0) {
    console.log('Failed to set the positions of the vertices');
    return;
  }

  gl.enable(gl.DEPTH_TEST);
  gl.clearColor(0.0, 0.0, 0.0, 1.0);

  var u_proj_matrix = gl.getUniformLocation(gl.program, 'proj_matrix');
  var u_rot_matrix = gl.getUniformLocation(gl.program, 'rot_matrix');
  
  if (!u_proj_matrix || !u_rot_matrix) {
    console.log('Failed to get uniform locations');
    return;
  }

  var projMatrix = glMatrix.mat4.create();
  glMatrix.mat4.ortho(projMatrix, -15.0, 15.0, -10.0, 10.0, 0.1, 50.0);
  gl.uniformMatrix4fv(u_proj_matrix, false, projMatrix);

  var axisAngle = 0.0;
  var currentAngle = 0.0;

  document.onkeydown = function(ev) {
    keydown(ev);
  };

  var tick = function() {
    var now = Date.now();
    var elapsed = now - LAST_FRAME;
    currentAngle = animate(currentAngle, SPEED, elapsed);
    axisAngle = animate(axisAngle, SPEED / 7.0, elapsed);
    LAST_FRAME = now;
    draw(gl, n, currentAngle, axisAngle, u_rot_matrix);
    requestAnimationFrame(tick);
  };
  tick();
}

function initVertexBuffers(gl) {
  let minV = glMatrix.vec3.fromValues(-10.0, -10.0, -10.0);
  let maxV = glMatrix.vec3.fromValues(10.0, 10.0, 10.0);
  var attr = new Attributes(N_BOXES, N_BOXES, minV, maxV);
  var box = new BoxShape(attr);

  VAO = gl.createVertexArray();
  gl.bindVertexArray(VAO);

  var elementBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, elementBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, box.index, gl.STATIC_DRAW);

  var vertexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, box.vertex, gl.STATIC_DRAW);
  
  var a_vertex = gl.getAttribLocation(gl.program, 'a_vertex');
  gl.enableVertexAttribArray(a_vertex);
  gl.vertexAttribPointer(a_vertex, 3, gl.FLOAT, false, 0, 0);

  var colorBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, box.attrib.colors, gl.STATIC_DRAW);

  var a_color = gl.getAttribLocation(gl.program, 'a_color');
  gl.vertexAttribDivisor(a_color, 1);
  gl.enableVertexAttribArray(a_color);
  gl.vertexAttribPointer(a_color, 3, gl.FLOAT, false, 0, 0);

  var mmBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, mmBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, box.attrib.tfms, gl.DYNAMIC_DRAW);

  var locMM = gl.getAttribLocation(gl.program, 'model_matrix');
  for (let i = 0; i < 4; i++) {
    gl.vertexAttribPointer(locMM + i, 4, gl.FLOAT, false, 64, i * 16);
    gl.enableVertexAttribArray(locMM + i);
    gl.vertexAttribDivisor(locMM + i, 1);
  }

  gl.bindVertexArray(null);
  return box.index.length;
}

function draw(gl, n, currentAngle, axisAngle, u_rot_matrix) {
  let rotMatrix = glMatrix.mat4.create();
  glMatrix.mat4.fromYRotation(rotMatrix, glMatrix.glMatrix.toRadian(axisAngle));
  glMatrix.mat4.rotateX(rotMatrix, rotMatrix, glMatrix.glMatrix.toRadian(currentAngle));
  gl.uniformMatrix4fv(u_rot_matrix, false, rotMatrix);

  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.bindVertexArray(VAO);
  gl.drawElementsInstanced(gl.TRIANGLES, n, gl.UNSIGNED_SHORT, 0, N_BOXES);
}

function animate(angle, speed, elapsed) {
  //return (angle + (speed * elapsed) / 1000.0) % 360;
  return 0;
}

function keydown(ev) {
  if (ev.keyCode === 38) SPEED += 2.0;
  if (ev.keyCode === 40) SPEED -= 2.0;
}

function setDefault() {
  SPEED = 20.0;
}


