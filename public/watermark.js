navigator.getUserMedia = navigator.getUserMedia ||
    navigator.webkitGetUserMedia || navigator.mozGetUserMedia;

var FRAME_WIDTH = 640;
var FRAME_HEIGHT =  480;

var MODE_LOGO=0;
var MODE_COPYRIGHT=1;
var MODE_TIMESTAMP=2;

var opacity=0.2;

var mode = MODE_LOGO;
var copyRightText = "© Vonage"
var canvas = undefined;
var ctx = undefined;
var bgImageData = undefined;
var video = undefined;
var img = undefined;

var cameraChanging = false;

function handleError(error) {
        if (error) {
          alert(error.message);
        }
}

function start(){
    $.get("/token?u=12", function(data){
      try{
        initializeSession(data.apikey, data.sessionid,data.token);
      }
      catch(e){
        console.log(data);
        alert("Error" + e)
      }
    });
}

function initializeSession(apiKey,sessionId,token) {
      OTSession = OT.initSession(apiKey, sessionId);
      OTSession.on('streamCreated', function(event) {
          subscriber = OTSession.subscribe(event.stream, 'layoutContainer', {
              insertMode: 'append',
              width: '100%',
              height: '100%'
          }, handleError);
          layout();
      });
      
      OTSession.on('streamDestroyed', function(event) {
        layout();
      });
      startPublishing(token);
}

function startPublishing(token){

      if (!canvas.captureStream) {
          alert('This browser does not support VideoElement.captureStream(). You must use Google Chrome.');
          return;
      }
    OTSession.connect(token, function(error) {
      if (error) {
              handleError(error);
          } else {
               publisher = OT.initPublisher('layoutContainer', {
                insertMode: 'append',
                width: '100%',
                height: '100%',
                videoSource: canvas.captureStream().getVideoTracks()[0],
                audioSource: true
              }, (err) => {
                if (err) {
                  alert(err.message);
                }
                else{
                  layout();
                  OTSession.publish(publisher,function(error) {
                    if (error) {
                      console.log(error);
                    } else {
                      console.log('Publishing a stream.');
                    }
                  });            
                }
              });
          }
      });

}

function changeOpacity(){
  opacity = document.getElementById("opacity").value/10;
}

function changeFilter(){
  var newMode = document.getElementById("mode").value;
  if(newMode == "MODE_LOGO"){
    mode = MODE_LOGO
  }
  else if(newMode == "MODE_COPYRIGHT"){
    mode = MODE_COPYRIGHT;
  }
  else if(newMode == "MODE_TIMESTAMP"){
    mode = MODE_TIMESTAMP;
  }
}

async function populateCameras(){
    let cameras = await getVideoInputs();
    var options = "";
    cameras.forEach(camera => {
        options += "<option value='"+camera.label+"'>"+camera.label+"</option>"
    })
    document.getElementById("camera").innerHTML = options;
    return cameras;
}

async function changeCamera(){
    cameraChanging = true;
    var cam = document.getElementById("camera").value;
    console.log(cam);
    await loadVideo(cam);
    cameraChanging = false;
}

async function init(){
    canvas = document.createElement("canvas")
    ctx = canvas.getContext('2d');
    var cameras = await populateCameras();
    await loadVideo(cameras[0].label);
    img = new Image();
    img.crossOrigin = '';
    // Load the image on canvas
    img.addEventListener('load', () => {
        update();
        start();
    });
    img.src = 'assets/v-watermark.png';
}

async function loadVideo(cameraLabel) {
  try {
    video = await setupCamera(cameraLabel);
  } catch (e) {
    alert("Error in Load Video");
  }

  video.play();
}


function update(){
  ctx.globalAlpha = 1.0;
  ctx.drawImage(video,0,0,FRAME_WIDTH,FRAME_HEIGHT);
  ctx.globalAlpha = opacity;
  if(mode == MODE_LOGO){
    ctx.drawImage(img,-50,0);
  }
  else if(mode == MODE_COPYRIGHT){
    ctx.font = "30px Arial";
    ctx.fillText(copyRightText, 10, 50);
  }
  else if(mode == MODE_TIMESTAMP){
    ctx.font = "20px Arial";
    var today = new Date();
    var date = today.getFullYear()+'-'+(today.getMonth()+1)+'-'+today.getDate() + "  "+today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds()+"."+today.getMilliseconds();
    ctx.fillText(date, 10, 50);
  }
  requestAnimationFrame(update); // wait for the browser to be ready to present another animation fram.       
}

async function getConstraints(cameraLabel) {
  let deviceId;
  let facingMode;

  if (cameraLabel) {
    deviceId = await getDeviceIdForLabel(cameraLabel);
    // on mobile, use the facing mode based on the camera.
    facingMode = isMobile() ? getFacingMode(cameraLabel) : null;
  };
  return {deviceId, facingMode,width: {exact: FRAME_WIDTH}, height: {exact: FRAME_HEIGHT}};
}

function isAndroid() {
  return /Android/i.test(navigator.userAgent);
}

function isiOS() {
  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

function isMobile() {
  return isAndroid() || isiOS();
}

function stopExistingVideoCapture() {
  if (video && video.srcObject) {
    video.srcObject.getTracks().forEach(track => {
      track.stop();
    })
    video.srcObject = null;
  }
}

async function getDeviceIdForLabel(cameraLabel) {
  const videoInputs = await getVideoInputs();

  for (let i = 0; i < videoInputs.length; i++) {
    const videoInput = videoInputs[i];
    if (videoInput.label === cameraLabel) {
      return videoInput.deviceId;
    }
  }

  return null;
}
async function getVideoInputs() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
    console.log('enumerateDevices() not supported.');
    return [];
  }
  const devices = await navigator.mediaDevices.enumerateDevices();
  const videoDevices = devices.filter(device => device.kind === 'videoinput');
  console.log(videoDevices);
  return videoDevices;
}
async function setupCamera(cameraLabel) {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    alert('Browser API navigator.mediaDevices.getUserMedia not available');
  }

  const videoElement = document.createElement('video');

  stopExistingVideoCapture();

  const videoConstraints = await getConstraints(cameraLabel);

  const stream = await navigator.mediaDevices.getUserMedia(
      {'audio': false, 'video': videoConstraints});
  videoElement.srcObject = stream;

  return new Promise((resolve) => {
    videoElement.onloadedmetadata = () => {
      canvas.width = FRAME_WIDTH;
      canvas.height = FRAME_HEIGHT;
      console.log(canvas.width+":"+canvas.height);
      resolve(videoElement);
    };
  });
}