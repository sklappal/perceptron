function App() {

 
  var buttons = [];
  var classifier = new Classifier();
  var drawIsolines = false;

  this.Start = function()
  {
    GetCanvas().onmousedown = OnMouseDownCB;
    GetCanvas().onmouseup = OnMouseUpCB;
    GetCanvas().onmousemove = OnMouseMoveCB;

    document.getElementById("isolines").onclick = OnCheckBoxClickCB;

    buttons.push(new Button(vec2.fromValues(Width() - 100, 20), "Reset", GetContext, Reset))

    Draw();
  }

  function Draw()
  {
    Clear();

    DrawOverlay();
  }

  function Clear()
  {
    var ctx = GetContext();    
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, Width(), Height());
  }

  function DrawOverlay()
  {
    DrawItems();

    for (var i = 0; i < buttons.length; i++) {
      buttons[i].Draw();
    }    
  }

  function DrawItems()
  {
    for (var i = 0; i < classifier.items.length; i++) {
      DrawFilledCircle(classifier.items[i]);
    }
  }


  function DrawFilledCircle(item) {
    var ctx = GetContext();
    var poscanvas = WorldToCanvas(item.pos);    
    ctx.beginPath();
    var counterClockwise = false;
    ctx.arc(poscanvas[0], poscanvas[1], 3, 0, 2 * Math.PI, false);
    
    ctx.fillStyle = item.which == 1 ? 'purple' : 'cyan';
    ctx.fill();

    ctx.strokeStyle = 'black';
    ctx.stroke();
  }


  function Reset()
  {
    classifier = new Classifier();
    Draw();
  }

  function DrawClassifier()
  {
    var timer = new Timer("DrawClassifier");
    
    var drawBuffer = fillClassifierResults();

    if (drawIsolines)
    {
      var drawBuffer = fillIsoLevels(drawBuffer);
    }

    GetContext().putImageData(new ImageData(drawBuffer, Width(), Height()), 0, 0);
    DrawOverlay();
    timer.End();
  }

  function fillClassifierResults()
  {
    var drawBuffer = new Uint8ClampedArray(Width() * Height() * 4);
    
    var max = 0.0;
    var min = 0.0;

    for (var y = 0; y < Height(); y++)
    {
      for (var x = 0; x < Width(); x++)
      {
        var cur = CanvasToWorld([x, y]);
       
        var curVal = classifier.Classify(cur);

        min = Math.min(curVal, min);
        max = Math.max(curVal, max);
      }
    }

    for (var y = 0; y < Height(); y++)
    {
      for (var x = 0; x < Width(); x++)
      {
        var cur = CanvasToWorld([x, y]);
       
        var curVal = classifier.Classify(cur);

        var alpha = 0.0;
        var color = [0,0,0];
        if (curVal >= 0.0)
        {
            alpha = 192 * (curVal / max) + 63;
            color = [127, 0, 127];
        }
        else
        {
            alpha = 192 * (curVal / min) + 63            
            color = [0, 127, 127];
        }

        var index = linearize(x, y);

        alpha = Math.round(alpha);

        fillBuffer(drawBuffer, index, color[0], color[1], color[2], alpha);
      }
    }

    return drawBuffer;
  }

  function fillIsoLevels(drawBuffer)
  {
    var bufferWithIsolevels = drawBuffer.slice();
    for (var y = 0; y < Height(); y++)
    {
      for (var x = 0; x < Width(); x++)
      {       
        var index = linearize(x, y);

        if (x > 0 && y > 0)
        {
          var prevleftindex = (x-1 + Width() * y) * 4;
          var prevupindex = (x + Width() * (y-1)) * 4;

          var colorChange = onColorBorder(drawBuffer, index, prevupindex, prevleftindex);

          var levels = [96, 128, 160, 192, 224, 254];

          var alphaChange = false;

          for ( var i = 0; i < levels.length; i++)
          {
            if (onAlphaBorder(drawBuffer, index, prevupindex, prevleftindex, levels[i]))
            {
              alphaChange = true;
              break;
            }
          }

          if (colorChange || alphaChange)
          {
            fillBuffer(bufferWithIsolevels, index, 0, 0, 0, 255);
          }
        }
      }
    }
    return bufferWithIsolevels;
  }


  function fillBuffer(buffer, indices, r, g, b, a)
  {
    for (var i = 0; i < indices.length; i++) {
      var index = indices[i];
      fillBuffer(buffer, index, r, g, b, a);
    }
  }

  function fillBuffer(buffer, index, r, g, b, a)
  {
    buffer[index + 0] = r;
    buffer[index + 1] = g;
    buffer[index + 2] = b;
    buffer[index + 3] = a;
  }

  function linearize(x, y)
  {
    return (x + Width() * y) * 4;
  }

  function onColorBorder(buffer, current, up, left)
  {
    function inner(buffer, index1, index2)
    {
      return buffer[index1 + 0] != buffer[index2 + 0] || buffer[index1 + 1] != buffer[index2 + 1] || buffer[index1 + 2] != buffer[index2 + 2];
    }

    return inner(buffer, current, up) || inner(buffer, current, left);
  }

  function onAlphaBorder(buffer, current, up, left, level)
  {
    function inner(buffer, index1, index2, level)
    {
      return buffer[index1 + 3] < level && buffer[index2 + 3 ] >= level || buffer[index2 + 3] < level && buffer[index1 + 3 ] >= level;
    }

    return inner(buffer, current, up, level) || inner(buffer, current, left, level);
  }

  function OnMouseDownCB(evt) {
    
    if (evt.which == 2)
    {
      return;
    }

    x = evt.clientX;
    y = evt.clientY;
    canv = ScreenToCanvas(x, y);

    OnMouseDown(canv, evt.which);
  }
  
  function OnMouseUpCB(evt) {    
    if (evt.which == 2)
    {
      return;
    }

    x = evt.clientX;
    y = evt.clientY;
    canv = ScreenToCanvas(x, y);

    OnMouseUp(canv, evt.which);
  }

  function OnMouseMoveCB(ev) {
    canv = ScreenToCanvas(ev.clientX, ev.clientY);
    OnMouseMove(canv);
  }

  function OnCheckBoxClickCB(ev) {
    drawIsolines = !drawIsolines;
    DrawClassifier();
  }

  function OnMouseDown(coords, button) {    
    for (var i = 0; i < buttons.length; i++) {      
      if (buttons[i].OnMouseDown(coords, button))
      {
        return;
      }
    }

    var item = { "pos": CanvasToWorld(canv), "which": button == 1 ? 1 : -1};    
    classifier.AddItem(item);
    DrawClassifier();
  }
  
  function OnMouseUp(coords, button) {
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].OnMouseUp(coords, button);
    }
    DrawOverlay();
  }
  
  function OnMouseMove(coords) {
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].OnMouseMove(coords);
    }
    DrawOverlay();
  }
   
  function CanvasToWorld(vec)
  {
    return [(vec[0] - Width() * 0.5) / Width(), (vec[1] - Height() * 0.5) / Width()];
  }

  function WorldToCanvas(vec)
  {
    return [(vec[0] * Width()) + Width() * 0.5, (vec[1] * Width()) + Height() * 0.5];
  }

  function ScreenToCanvas(sx, sy) {
    rect = GetCanvas().getBoundingClientRect();
    return vec2.fromValues(sx - rect.left, sy - rect.top);
  }

  function Width()
  {
    return GetCanvas().width;
  }

  function Height()
  {
    return GetCanvas().height;
  }

  function GetCanvas()
  {
    return document.getElementById("canvas");
  }

  function GetContext()
  {
    return GetCanvas().getContext("2d");
  }

  function sign(x)
  {
    return x < 0 ? -1.0 : 1.0;
  }

  return this;
}

function Classifier() {
  
  var indexSet = [];

  this.items = [];

  var that = this;

  this.AddItem = function(item)
  {
    this.items.push(item);    
    TrainOverAllExamples();
  }

  function TrainOverAllExamples()
  {
    var timer = new Timer("TrainOverAllExamples")
    
    indexSet = new Array(that.items.length).fill(0);
    var indexSetEmpty = true;
    var allPass = false;
    var iteration = 0;
    while (!allPass)
    {
      var allPass = true;
      for (var i = 0; i < that.items.length; i++) {
        var item = that.items[i];     
        if (!IsCorrectlyClassified(item) || indexSetEmpty)
        {
          indexSetEmpty = false;
          allPass = false;
          indexSet[i] += 1;
        }
      }
      iteration++;

      if (iteration > 50000)
      {
        timer.End();
        console.log("Maximum iterations reached - could not find classifier.");
        return;
      }

    }

    timer.End();
    console.log("TrainOverAllExamples took " + iteration + " iterations over the example set.");
  }

  function IsCorrectlyClassified(item)
  {
    var target = item.which;
    var result = that.Classify(item.pos);
    return sign(target) == sign(result);
  }

  function sign(x)
  {
    return x < 0 ? -1.0 : 1.0;
  }

  this.Classify = function(x)
  {
    var sum = 0.0;
    for (var i = 0; i < indexSet.length; i++) {
      var count = indexSet[i];
      if (count != 0)
      {
        var sv = this.items[i];
        sum += sv.which * gaussianKernel(x, sv.pos) * count;
      }
    }
    return sum;
  }

  var sigma = 0.2;
  var divisor = -2*sigma*sigma;
  function gaussianKernel(x, y)
  {
    return Math.exp(vec2.squaredDistance(x, y) / divisor );    
  }

}

function Button(pos, title, contextGetter, callback) {

  this.myTitle = title;
  this.contextGetter = contextGetter;
  this.callback = callback;
  this.hasMouse = false;
  
  var width = 80;
  var height = 30;  
  this.position = pos;  
  var that = this;
  
  this.Draw = function() {
    var ctx = this.contextGetter();

    var main = MainBox();
    ctx.fillStyle = "white"
    if (this.hasMouse)
    {
      ctx.fillStyle = "lightgray"
    }
    ctx.fillRect(main.x, main.y, main.w, main.h)
    ctx.strokeStyle = "black";
    ctx.strokeRect(main.x, main.y, main.w, main.h);
    
    ctx.font = "12px Arial";
    ctx.fillStyle =  "black";
    ctx.fillText(this.myTitle, main.x + main.w * 0.3, main.y + 20);    
  }
  
  function MainBox() {
    return {
      x: that.position[0], 
      y: that.position[1],
      w: width,
      h: height
    };
  }

  function BoxContains(box, coords) {
    return coords[0] >= box.x && 
      coords[0] <= box.x + box.w &&
      coords[1] >= box.y &&
      coords[1] <= box.y + box.h;
  }

  this.OnMouseDown = function(coords, button) {
    if (BoxContains(MainBox(), coords)) {
      this.pressed = true;
      return true;
    } 

    return false;
  }

  this.OnMouseUp = function(coords, button) {
    var caught = BoxContains(MainBox(), coords);

    if (caught && this.pressed) {
      this.callback();
    }
    this.pressed = false;

    return caught;
  }

  this.OnMouseMove = function(coords) {
    this.hasMouse = BoxContains(MainBox(), coords);
    if (!this.hasMouse)
    {
      this.pressed = false;
    }

    return this.hasMouse;
  }

}

function Timer(topic)
{
  var start = new Date().getTime();

  this.End = function()
  {
    console.log(topic + " took: " + ((new Date().getTime() - start)/1000).toFixed(2) + " seconds.");
  }
}
