const srcImg = document.getElementById("src-image");
const fileInput = document.getElementById("input-file");
const canvas = document.getElementById("dest-canvas");
const faceCanvas = document.getElementById("face-canvas");
const detectFaceBtn = document.getElementById("detectface-btn");
const predictBtn = document.getElementById("predict-btn");
const elements = document.querySelectorAll(".result");
const ctx = canvas.getContext("2d");
let isInArea = false;
let isSelected = false;
let isDetected = false;
let continuous = false;
let targetId = null;
let src;
let faces;

/* Set the initial value */
ctx.rect(0, 0, 0, 0);

fileInput.addEventListener(
  "change",
  (e) => {
    srcImg.src = URL.createObjectURL(e.target.files[0]);
  },
  false
);

detectFaceBtn.addEventListener("click", (e) => {
  const utils = new Utils("errorMessage");
  const faceCascadeFile = "haarcascade_frontalface_default.xml";
  utils.createFileFromUrl(faceCascadeFile, faceCascadeFile, () => {
    src = cv.imread(srcImg);
    let gray = new cv.Mat();
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0);
    faces = new cv.RectVector();
    let faceCascade = new cv.CascadeClassifier();
    faceCascade.load(faceCascadeFile);
    let msize = new cv.Size(0, 0);
    faceCascade.detectMultiScale(gray, faces, 1.1, 3, 0, msize, msize);
    for (let i = 0; i < faces.size(); ++i) {
      let roiGray = gray.roi(faces.get(i));
      let roiSrc = src.roi(faces.get(i));
      let point1 = new cv.Point(faces.get(i).x, faces.get(i).y);
      let point2 = new cv.Point(
        faces.get(i).x + faces.get(i).width,
        faces.get(i).y + faces.get(i).height
      );
      cv.rectangle(src, point1, point2, [255, 0, 0, 255]);
      roiGray.delete();
      roiSrc.delete();
    }
    gray.delete();
    cv.imshow("dest-canvas", src);
  });
  document.getElementById("output").innerText = "Output";
  document.getElementById("selected-image").innerText = "Selected Image";
  document.getElementById("res").innerText = "Result";
  document.getElementById("result-table").style.visibility = "visible";
  document.getElementById("emotion").innerText = "Emotion";
  document.getElementById("accuracy").innerText = "Accuracy";
  elements.forEach((element) => {
    element.childNodes[1].innerText = "-";
    element.childNodes[3].innerText = "-";
  });
  fileInput.disabled = true;
  detectFaceBtn.disabled = true;
  isDetected = true;
});

predictBtn.addEventListener("click", (e) => {
  if (isSelected) {
    const emotions = [
      "Angry",
      "Disgust",
      "Fear",
      "Happy",
      "Sad",
      "Surprise",
      "Neutral",
    ];

    tf.loadLayersModel("model/model.json").then((model) => {
      const MODEL_HEIGHT = model.input.shape[1];
      const MODEL_WIDTH = model.input.shape[2];

      const accuracyScores = tf.tidy(() => {
        /* Read image and convert into tensor */
        let inputTensor = tf.browser.fromPixels(faceCanvas, 3); // get rgb (without alpha)

        /* Resize to model input size (48x48) */
        inputTensor = inputTensor.resizeBilinear([MODEL_HEIGHT, MODEL_WIDTH]);

        /* Convert to grayscale (keep dimension(HWC))*/
        inputTensor = inputTensor.mean(2, true);

        /* Expand dimension (HWC -> NHWC) */
        inputTensor = inputTensor.expandDims();

        /* Inference */
        return model.predict(inputTensor).dataSync();
      });

      for (let i = 0; i < emotions.length; ++i) {
        console.log(emotions[i] + ": " + accuracyScores[i]);
      }

      /* Result */
      const orderedAccuracyScores = accuracyScores
        .slice()
        .sort((a, b) => b - a);
      const maxAccuracyIndex = accuracyScores.indexOf(
        Math.max.apply(null, accuracyScores)
      );
      elements.forEach((element, index) => {
        /* Show Emotion */
        element.childNodes[1].innerText =
          index +
          1 +
          ". " +
          emotions[accuracyScores.indexOf(orderedAccuracyScores[index])];

        /* Show Accuracy */
        element.childNodes[3].innerText = ((score) => {
          if (String(score).indexOf(0)) return Num2FracStr(score).slice(0, 8);
          else return String(score).slice(0, 8);
        })(orderedAccuracyScores[index]);
      });
    });
  }
});

canvas.addEventListener("mousemove", (e) => {
  if (isDetected) {
    for (let i = 0; i < faces.size(); ++i) {
      if (ctx.isPointInPath(e.offsetX, e.offsetY)) {
        if (!continuous) {
          ctx.fillStyle = "rgba(255, 0, 255, 0.2)";
          ctx.fill();
          targetId = ((x, y) => {
            if (x >= 0) return x;
            else return y;
          })(i - 1, faces.size() - 1);
        }
        isInArea = true;
        continuous = true;
      } else {
        cv.imshow("dest-canvas", src);
        ctx.rect(
          faces.get(i).x,
          faces.get(i).y,
          faces.get(i).width,
          faces.get(i).height
        );
        isInArea = false;
        continuous = false;
      }
    }
  }
});

canvas.addEventListener("click", (e) => {
  if (isInArea && targetId != null) {
    let dst = new cv.Mat();
    let rect = new cv.Rect(
      faces.get(targetId).x,
      faces.get(targetId).y,
      faces.get(targetId).width,
      faces.get(targetId).height
    );
    dst = cv.imread(srcImg).roi(rect);
    cv.imshow("face-canvas", dst);
    dst.delete();
    isSelected = true;
  }
});
