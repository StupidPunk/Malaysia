// Explicit globals
let model = null;
let modelLoaded = false;
let stream = null;
let useBack = true;

async function loadModel() {
    if (typeof window.tf === "undefined") {
        console.error("TensorFlow.js is missing. Make sure <script src='https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@1.7.4/dist/tf.min.js'></script> is loaded before teachablemachine.");
        modelLoaded = false;
        return;
    }
    try {
        const URL = "model/";
        model = await tmImage.load(URL + "model.json", URL + "metadata.json");
        modelLoaded = true;
        console.log("Model loaded");
    } catch (err) {
        console.error("Failed to load model:", err);
        modelLoaded = false;
    }
}

// ===============================
// 🍃 LEAF + OBJECT SYSTEM (ลื่น + ไม่บังคลิก)
// ===============================
const leafContainer = document.querySelector(".leaf-container");

if (leafContainer) {
    const items = [
        "https://cdn-icons-png.flaticon.com/512/415/415733.png",
        "https://cdn-icons-png.flaticon.com/512/590/590685.png",
        "images/banana.png",
    ];

    for (let i = 0; i < 12; i++) {
        let leaf = document.createElement("img");
        leaf.src = items[Math.floor(Math.random() * items.length)];
        leaf.className = "leaf";
        leaf.style.left = Math.random() * 100 + "%";
        leaf.style.animationDuration = (6 + Math.random() * 6) + "s";
        leaf.style.opacity = Math.random();
        leaf.style.pointerEvents = "none";
        leafContainer.appendChild(leaf);
    }
}

// ===============================
// 📊 REALTIME DASHBOARD (ฉลาดขึ้น)
// ===============================
const chartCanvas = document.getElementById("tempChart");

if (chartCanvas) {
    let tempData = [];
    let labels = [];

    const chart = new Chart(chartCanvas, {
        type: "line",
        data: {
            labels: labels,
            datasets: [{
                label: "Temperature °C",
                data: tempData,
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            animation: { duration: 800 }
        }
    });

    setInterval(() => {
        const time = new Date().toLocaleTimeString();
        let temp = 30 + Math.sin(Date.now() / 5000) * 5;
        let humidity = 55 + Math.cos(Date.now() / 4000) * 15;
        temp = Math.round(temp);
        humidity = Math.round(humidity);

        labels.push(time);
        tempData.push(temp);
        if (labels.length > 12) { labels.shift(); tempData.shift(); }
        chart.update();

        const tempText = document.querySelector(".card:nth-child(1) .value");
        const humText = document.querySelector(".card:nth-child(2) .value");
        const riskText = document.querySelector(".card:nth-child(3) .value");

        if (tempText) tempText.innerText = temp + "°C";
        if (humText) humText.innerText = humidity + "%";

        if (riskText) {
            let risk = "LOW";
            let color = "green";
            if (humidity > 75 || temp < 28) { risk = "HIGH"; color = "red"; }
            else if (humidity > 65) { risk = "MEDIUM"; color = "orange"; }
            riskText.innerText = risk;
            riskText.style.color = color;
        }
    }, 2000);
}

// ===============================
// 🎥 CAMERA
// ===============================
function stopStream() {
    if (stream) {
        stream.getTracks().forEach(t => t.stop());
        stream = null;
    }
}

async function startCamera() {
    const video = document.getElementById("camera");
    if (!video) return;

    // stop any existing stream first
    stopStream();

    try {
        stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { exact: "environment" } }
        });
    } catch (err) {
        // fallback if exact environment not available
        try {
            stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: "environment" }
            });
        } catch (err2) {
            console.error(err2);
            alert("❌ Cannot access rear camera");
            return;
        }
    }

    video.srcObject = stream;
    await video.play();
}

// ===============================
// 🤖 AI DETECTION
// ===============================
async function analyze() {
    const video = document.getElementById("camera");
    const resultEl = document.getElementById("result");
    const canvas = document.getElementById("snapshot");

    if (!modelLoaded) {
        alert("Model not loaded yet");
        return;
    }
    if (!video || !video.srcObject) {
        alert("Camera not started");
        return;
    }

    resultEl.innerHTML = "Analyzing...";
    resultEl.style.color = "black";

    // Ensure canvas exists and matches video dimensions
    if (!canvas) {
        console.error("No canvas snapshot element found");
        return;
    }
    canvas.width = video.videoWidth || 320;
    canvas.height = video.videoHeight || 240;

    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Pass canvas to the model for a stable frame
    let prediction;
    try {
        prediction = await model.predict(canvas);
    } catch (err) {
        console.error("Prediction error:", err);
        resultEl.innerText = "Prediction error";
        return;
    }

    // Sort predictions by probability desc
    prediction.sort((a, b) => b.probability - a.probability);

    const best = prediction[0];
    const threshold = 0.55; // adjust threshold as needed

    if (!best || best.probability < threshold) {
        resultEl.innerHTML = `Uncertain — Low confidence (${((best?.probability||0)*100).toFixed(1)}%)`;
        resultEl.style.color = "gray";
        // show top 3 to help user understand
        const lines = prediction.slice(0, 3).map(p => `${p.className}: ${(p.probability*100).toFixed(1)}%`);
        resultEl.innerHTML += "<br>" + lines.join("<br>");
        return;
    }

    let color = best.className !== "No Mold" ? "red" : "green";

    // Show top 3 predictions for context
    const top3 = prediction.slice(0, 3).map(p => `${p.className}: ${(p.probability*100).toFixed(1)}%`).join("<br>");

    resultEl.innerHTML = `
        Type: <b>${best.className}</b><br>
        Confidence: ${(best.probability * 100).toFixed(1)}%<br>
        <small>Top results:<br>${top3}</small>
    `;
    resultEl.style.color = color;
}

// ===============================
// ☀️ SOLAR SIMULATION
// ===============================
const sunSlider = document.getElementById("sun");

if (sunSlider) {
    const sunValue = document.getElementById("sunValue");
    const efficiency = document.getElementById("efficiency");

    sunSlider.addEventListener("input", () => {
        const value = sunSlider.value;
        if (sunValue) sunValue.innerText = value + "%";
        let eff = (value * 0.8).toFixed(1);
        if (efficiency) efficiency.innerHTML = "Drying Efficiency: <b>" + eff + "%</b>";
    });
}

// ===============================
// Camera switching
// ===============================
async function switchCamera() {
    useBack = !useBack;
    stopStream();

    try {
        stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: useBack ? "environment" : "user" }
        });
        document.getElementById("camera").srcObject = stream;
    } catch (err) {
        console.error("Switch camera error:", err);
    }
}

// Load model when page has loaded
window.addEventListener("load", loadModel);
