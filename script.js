import {
    PoseLandmarker,
    FilesetResolver,
    DrawingUtils
} from "https://cdn.skypack.dev/@mediapipe/tasks-vision@0.10.0";

const demosSection = document.getElementById("demos");

let poseLandmarker = undefined;
let runningMode = "IMAGE";
let enableWebcamButton;
let webcamRunning = false;
let rakaat = 1;
let count = 0;
let body = document.querySelector('body');
const videoHeight = '100%';
const videoWidth = '100%';
const loading = document.querySelector('#loading');
const rakaatCount = document.querySelector('#rakaat_count');
const maxRakaatElement = document.querySelector('#max_rakaat');

// Before we can use PoseLandmarker class we must wait for it to finish
// loading. Machine Learning models can be large and take a moment to
// get everything needed to run.
const createPoseLandmarker = async () => {
    const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
    );
    poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task`,
            delegate: "GPU"
        },
        runningMode: runningMode,
        numPoses: 2
    });
    demosSection.classList.remove("invisible");
    loading.style.display = 'none'
};
createPoseLandmarker();

/********************************************************************
Demo: Continuously grab image from webcam stream and detect it.
********************************************************************/

const video = document.getElementById("webcam");
const canvasElement = document.getElementById(
    "output_canvas"
);
const canvasCtx = canvasElement.getContext("2d");
const drawingUtils = new DrawingUtils(canvasCtx);
const markingArea = document.querySelector('#green_screen')
let maxRakaat = '';

// Ambil referensi ke elemen input
const userInput = document.getElementById('userInput');

// Tambahkan event listener untuk menangkap perubahan nilai input
userInput.addEventListener('input', (event) => {
    maxRakaat = event.target.value;
    console.log('User value:', maxRakaat); // Cetak nilai variabel untuk verifikasi
});

// Check if webcam access is supported.
const hasGetUserMedia = () => !!navigator.mediaDevices?.getUserMedia;

// If webcam supported, add event listener to button for when user
// wants to activate it.
if (hasGetUserMedia()) {
    enableWebcamButton = document.getElementById("webcamButton");
    enableWebcamButton.addEventListener("click", enableCam);
} else {
    console.warn("getUserMedia() is not supported by your browser");
}

// Enable the live webcam view and start detection.
function enableCam(event) {
    if (!poseLandmarker) {
        console.log("Wait! poseLandmaker not loaded yet.");
        return;
    }
    markingArea.style.display = 'block'

    if (webcamRunning === true) {
        webcamRunning = false;
        // enableWebcamButton.innerText = "ENABLE PREDICTIONS";
        location.reload();
    } else {
        webcamRunning = true;
        enableWebcamButton.innerText = "RELOAD";
        rakaatCount.style.display = 'block'
        rakaatCount.textContent = `Rakaat ke: ${rakaat}`
        maxRakaatElement.style.display = 'block'
        maxRakaatElement.textContent = `Rakaat maksimal: ${maxRakaat}`
        userInput.style.display = 'none';
    }

    // getUsermedia parameters.
    const constraints = {
        video: true
    };

    // Activate the webcam stream.
    navigator.mediaDevices.getUserMedia(constraints).then((stream) => {
        video.srcObject = stream;
        video.addEventListener("loadeddata", predictWebcam);
    });
}

let lastVideoTime = -1;
async function predictWebcam() {
    canvasElement.style.height = videoHeight;
    video.style.height = videoHeight;
    canvasElement.style.width = videoWidth;
    video.style.width = videoWidth;
    // Now let's start detecting the stream.
    if (runningMode === "IMAGE") {
        runningMode = "VIDEO";
        await poseLandmarker.setOptions({ runningMode: "VIDEO" });
    }
    let startTimeMs = performance.now();
    if (lastVideoTime !== video.currentTime) {
        lastVideoTime = video.currentTime;
        poseLandmarker.detectForVideo(video, startTimeMs, (result) => {
            const xPosition = (result.landmarks[0][0].x) * 297;
            const yPosition = (result.landmarks[0][0].y) * 145;
            canvasCtx.save();
            canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
            // for (const landmark of result.landmarks) {
            //     drawingUtils.drawLandmarks(landmark, {
            //         radius: (data) => DrawingUtils.lerp(data.from.z, -0.15, 0.1, 5, 1)
            //     });
            //     drawingUtils.drawConnectors(landmark, PoseLandmarker.POSE_CONNECTIONS);
            // }
            canvasCtx.beginPath();
            // canvasCtx.arc(videoWidth - (xPosition * 100), videoHeight - (yPosition * 100), 50, 0, 2 * Math.PI);
            canvasCtx.arc(xPosition, yPosition, 4, 0, 2 * Math.PI);
            // canvasCtx.stroke();
            canvasCtx.fillStyle = "pink";
            canvasCtx.fill();

            canvasCtx.lineWidth = 1;
            canvasCtx.strokeStyle = "red";
            canvasCtx.moveTo(0, 60)
            canvasCtx.lineTo(300, 60)
            canvasCtx.stroke()

            // if (result.landmarks.length > 0) {
            //     drawingUtils.drawLandmarks(result.landmarks[0], {
            //         radius: (data) => DrawingUtils.lerp(data.from.z, -0.15, 0.1, 5, 1)
            //     });
            // }
            canvasCtx.restore();

            if (yPosition < 60) {
                if (count === 1) {
                    count = 0
                    rakaat += 0.25
                    // console.log(rakaat)
                    rakaatCount.textContent = `Rakaat ke: ${parseInt(rakaat)}`
                }
            }
            else if (yPosition > 60) {
                if (count === 0) {
                    count = 1
                    rakaat += 0.25
                }
            }

            if (rakaat === parseInt(maxRakaat)) {
                body.style.backgroundColor = 'coral';
            } else if (rakaat >= Math.floor(parseInt(maxRakaat)) + 1) {
                body.style.backgroundColor = 'red';
            }

            // console.log(yPosition);
            // console.log(rakaat);
        });
    }


    // Call this function again to keep predicting when the browser is ready.
    if (webcamRunning === true) {
        window.requestAnimationFrame(predictWebcam);
    }
}
