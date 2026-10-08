// Lab5: Color Storm
// @braydenphanna
//
// Based on:
// HelloQuad_FAN.js (c) 2012 matsuda
// RotatingTriangle.js (c) 2012 matsuda

// Vertex shader program
var VSHADER_SOURCE =
  'attribute vec4 a_Position;\n' +
  'attribute vec4 a_Color;\n' +
  'varying lowp vec4 u_FragColor;\n' +
  'void main() {\n' +
  '  gl_Position = a_Position;\n' +
  '  u_FragColor = a_Color;\n' +
  '}\n';

// Fragment shader program
var FSHADER_SOURCE = 
  'precision mediump float;\n' + 
  'varying lowp vec4 u_FragColor;\n' + 
  // allow FragColor to be set later
  'void main() {\n' +
  '  gl_FragColor = u_FragColor;\n' +
  '}\n';

var animationId;

// Lists that hold all the data for every point
var vertices = [];
var colors = [];
var floors = [];
var last_colors = [];

// Buffers
var vertexBuffer = null;
var colorBuffer = null;

// Rain options
var num_drops = 500; // max number of rain drops
var rain_speed = 0.05; // amount rain drops decrease vertically per tick

// Ripple options
var numSegments =12; // number of segments that make up each circle
const radius = 0.003; // initial radius of ripples
const scale = 1.04; // rate at which ripples change size
const fade = 0.004; // rate at which ripples fade away

// Scene options
const floor_color = {r: 0.0, g:0.0, b:0.0, a:0.95}
const background_color = {r: 0.0, g:0.0, b:0.0, a:1.0}

function main() {
  // Settings menu and button setup
  const settingsButton = document.getElementById('settingsButton');
  const settings = document.getElementById('settings');
  settingsButton.addEventListener('click', function() {
      if(settings.style.display ==  "none"){
        settingsButton.innerHTML="<span style = 'transform: translateY(-2%);'>×</span>"
        settings.style.display="flex";
      }
      else {
        settingsButton.innerHTML="<span style = 'transform: translateY(-2.8%);'>⚙</span>";
        settings.style.display="none";
      }
  });

  // Get+set rain amount sider and textbox
  const num_drops_slider = document.getElementById('num_drops_slider');
  const num_drops_textbox = document.getElementById('num_drops_textbox');
  num_drops_textbox.value=num_drops;
  num_drops_slider.value=num_drops;

  // Get+set rain speed sider and textbox
  const rain_speed_slider = document.getElementById('rain_speed_slider');
  const rain_speed_textbox = document.getElementById('rain_speed_textbox');
  rain_speed_textbox.value=parseInt(((rain_speed - 0.03) / 0.01) + 1);
  rain_speed_slider.value=parseInt(((rain_speed - 0.03) / 0.01) + 1);

  // Get+set ripple detail sider and textbox
  const ripple_detail_slider = document.getElementById('ripple_detail_slider');
  const ripple_detail_textbox = document.getElementById('ripple_detail_textbox');
  ripple_detail_textbox.value=numSegments;
  ripple_detail_slider.value=numSegments;

  // Add event listener to rain amount slider and link to textbox
  num_drops_slider.addEventListener('input', function() {
      num_drops = parseInt(this.value);
      num_drops_textbox.value=num_drops;
      restartScene();
  });

  // Add event listener to rain amount textbox and link to slider
  num_drops_textbox.addEventListener('input', function() {
      num_drops = parseInt(this.value);
      num_drops_slider.value=num_drops;
      restartScene();
  });

  // Add event listener to rain speed slider and link to textbox
  rain_speed_slider.addEventListener('input', function() {
      rain_speed = 0.03+ (parseFloat(this.value)-1)*0.01;
      rain_speed_textbox.value=parseInt(this.value)
      restartScene();
  });

  // Add event listener to rain speed textbox and link to slider
  rain_speed_textbox.addEventListener('input', function() {
      rain_speed = 0.03+ (parseFloat(this.value)-1)*0.01;
      rain_speed_slider.value=parseInt(this.value)
      restartScene();
  });

  // Add event listener to ripple detail slider and link to textbox
  ripple_detail_slider.addEventListener('input', function() {
      numSegments = parseInt(this.value);
      ripple_detail_textbox.value=numSegments;
      restartScene();
  });

  // Add event listener to ripple detail textbox and link to slider
  ripple_detail_textbox.addEventListener('input', function() {
        numSegments = parseInt(this.value);
        ripple_detail_slider.value=numSegments;
        restartScene();
  });

  startScene();
}
function restartScene(){
    // Stop the current animation
    cancelAnimationFrame(animationId);

    // Reset all simulation data
    vertices = [];
    colors = [];
    last_colors = [];

    // Restart everything
    startScene();
}
function startScene() {
  // Retrieve <canvas> element
  var canvas = document.getElementById('webgl');

  // Get the rendering context for WebGL
  var gl = getWebGLContext(canvas);
  if (!gl) {
    console.log('Failed to get the rendering context for WebGL');
    return;
  }

  // Initialize shaders
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.log('Failed to initialize shaders.');
    return;
  }

  // Initialize vertex buffers
  var n = initVertexBuffers(gl);
  if (n < 0) {
    console.log('Failed to set the positions of the vertices');
    return;
  }

  // Start drawing
  var tick = function() {
    update(gl);
    draw(gl, n);
    animationId = requestAnimationFrame(tick);
  };

  tick();
}
function initVertexBuffers(gl) {
  if (vertexBuffer) {
    gl.deleteBuffer(vertexBuffer);
    vertexBuffer = null;
  }

  if (colorBuffer) {
    gl.deleteBuffer(colorBuffer);
    colorBuffer = null;
  }

  // Init rain drops
  for(var i = 0; i < num_drops; i++){
    var start_x = Math.random()*2-1;
    var start_y = Math.random()*4;
    vertices.push(start_x, start_y, start_x, start_y-0.2);
    colors.push({r:Math.random(),g:Math.random(),b:Math.random(), a: 1.0});
    last_colors.push(colors[i]);
    floors[i]= Math.random()*-0.40-0.52;
  }

  // Init ripples
  for(var i = 0; i < num_drops; i++){
    for (var j = 0; j < numSegments; j++) {
      var angle = (j * 2 * Math.PI) / numSegments;
      vertices.push(Math.cos(angle) * radius);
      vertices.push(Math.sin(angle) * radius); 
      vertices.push(Math.cos(angle) * radius);
      vertices.push(Math.sin(angle) * radius); 
      colors.push(colors[i]);
    }
  }

  // Migrate data to new raw lists
  var vertices_list = vertices;
  var colors_list = [];

  // Fill colors_list, disregarding rgba formating
  for (var i = 0; i < num_drops; i++) {
    colors_list.push(colors[i].r, colors[i].g, colors[i].b, colors[i].a);
    colors_list.push(colors[i].r, colors[i].g, colors[i].b, colors[i].a);
  }
  for (var i = 0; i < num_drops; i++) {
    for (var j = 0; j < numSegments; j++) {
      colors_list.push(colors[i].r, colors[i].g, colors[i].b, colors[i].a);
      colors_list.push(colors[i].r, colors[i].g, colors[i].b, colors[i].a);
    }
  }

  // The total number of vertices
  var n = vertices_list.length/2;

  // Get attribute locations
  var a_Position = gl.getAttribLocation(gl.program, 'a_Position');
  var a_Color = gl.getAttribLocation(gl.program, 'a_Color');
  if (a_Position < 0 || a_Color < 0) return -1;

  // Put vertex data into the vertex buffer
  vertexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices_list), gl.DYNAMIC_DRAW);
  gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_Position);

  // Put color data into the color buffer
  colorBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors_list), gl.STATIC_DRAW);
  gl.vertexAttribPointer(a_Color, 4, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_Color);

  return n;
}
function update(gl){
    // Loop through every rain drop
    for (var i = 0; i < num_drops*4; i+=4) {
      // Decide a random stop point for drop on the spot for variation
      var floor = floors[i/4];

      // If rain drop hasn't hit the floor yet
      if(vertices[i+3]>floor) {
        // Lower rain drops my specified speed
        vertices[i+1] -= rain_speed; //y1
        vertices[i+3] -= rain_speed; //y2

        // Determine starting index of the current ripple and its center
        var rippleStart = num_drops * 4 + (i / 4) * numSegments * 4;
        var center_x = vertices[rippleStart] - radius;
        var center_y = vertices[rippleStart+1] + radius;

        // Scale up and fade away the current ripple
        for (var j = 0; j < numSegments; j++) {
            var index = rippleStart + j * 4;

            vertices[index] = center_x + (vertices[index]- center_x ) * scale;
            vertices[index + 1] = center_y + (vertices[index+1]- center_y ) * scale;
            vertices[index + 2] = center_x + (vertices[index + 2]- center_x ) * scale;
            vertices[index + 3] = center_y + (vertices[index + 3]- center_y ) * scale;

            last_colors[i / 4].r += (floor_color.r - last_colors[i / 4].r) * fade;
            last_colors[i / 4].g += (floor_color.g - last_colors[i / 4].g) * fade;
            last_colors[i / 4].b += (floor_color.b - last_colors[i / 4].b) * fade;
            last_colors[i / 4].a += (floor_color.a - last_colors[i / 4].a) * fade;
        }
      }
      // If rain drop has hit the floor
      else{
        // Determine starting index of the current ripple
        var rippleStart = num_drops * 4 + (i / 4) * numSegments * 4;

        // Move ripple to the drop's hit position
        for (var j = 0; j < numSegments; j++) {
            var angle1 = (j * 2 * Math.PI) / numSegments;
            var angle2 = ((j + 1) * 2 * Math.PI) / numSegments;

            var index = rippleStart + j * 4;

            // First endpoint
            vertices[index] = vertices[i + 2] + Math.cos(angle1) * radius;
            vertices[index + 1] = vertices[i + 3] + Math.sin(angle1) * radius;

            // Second endpoint
            vertices[index + 2] = vertices[i + 2] + Math.cos(angle2) * radius;
            vertices[index + 3] = vertices[i + 3] + Math.sin(angle2) * radius;
        }

        // Reset drop placement
        vertices[i+1] = 1.2;
        vertices[i+3] = vertices[i+1] - Math.random()*0.3;
        var new_x = Math.random()*2-1;
        vertices[i] = new_x;
        vertices[i+2] = new_x;

        // Store last drop color for later use and generate a new color
        last_colors[i/4] = {r: colors[i/4].r, g: colors[i/4].g, b: colors[i/4].b, a:1.0};
        colors[i/4]={r:Math.random(),g:Math.random(),b:Math.random(), a: 1.0}
      }
    }

    // Migrate data to new raw lists
    var vertices_list = vertices;
    var colors_list = [];

    // Update colors
    for (var i = 0; i < num_drops; i++) {
      colors_list.push(colors[i].r, colors[i].g, colors[i].b, colors[i].a);
      colors_list.push(colors[i].r, colors[i].g, colors[i].b, colors[i].a);
    }
    for (var i = 0; i < num_drops; i++) {
      for (var j = 0; j < numSegments; j++) {
        if(last_colors[i]!=null){
          colors_list.push(last_colors[i].r, last_colors[i].g, last_colors[i].b, last_colors[i].a);
          colors_list.push(last_colors[i].r, last_colors[i].g, last_colors[i].b, last_colors[i].a);
        }
        else{
          colors_list.push(colors[i].r, colors[i].g, colors[i].b, colors[i].a);
          colors_list.push(colors[i].r, colors[i].g, colors[i].b, colors[i].a);
        }
      }
    }

    // Update vertex buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices_list), gl.DYNAMIC_DRAW);

    // Update color buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors_list), gl.DYNAMIC_DRAW);
}
function draw(gl, n) {
  // Create constants for width and height of the canvas.
  const w = gl.drawingBufferWidth;
  const h = gl.drawingBufferHeight;

  // Enable the scissor test to cut the canvas background in half
  gl.enable(gl.SCISSOR_TEST);

  // Clear the bottom fourth
  gl.scissor(0, 0, w, h);
  gl.clearColor(floor_color.r,floor_color.g,floor_color.b,floor_color.a);
  gl.clear(gl.COLOR_BUFFER_BIT);

  // Clear the first three fourths
  gl.scissor(0, h/4, w, h);
  gl.clearColor(background_color.r,background_color.g,background_color.b,background_color.a);
  gl.clear(gl.COLOR_BUFFER_BIT);

  // Disable scissor test afterward
  gl.disable(gl.SCISSOR_TEST);
  
  // Draw everything in lines mode
  gl.drawArrays(gl.LINES, 0, n);
}