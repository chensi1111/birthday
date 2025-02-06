<script setup lang="ts">
import {  ref,onMounted,watch,computed } from "vue";
import {useRoute} from 'vue-router';
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
// import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
// import { GUI } from 'dat.gui';
import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { SSAARenderPass } from "three/addons/postprocessing/SSAARenderPass.js";
const route=useRoute();
const params = route.params.name

const bgMusic = ref();
const showWish = ref(false);
const showWishButton = ref(true);
const finishWish = ref(false);
const showBlowButton = ref(false);
const startBlow = ref(false);
const errorText = ref();

const statusText = ref("請吹氣來熄滅蠟燭");
const threshold = ref(60); // 設定閾值
const value = ref(0);

let audioContext: AudioContext | null = null;
let analyser: AnalyserNode | null = null;
let microphone: MediaStreamAudioSourceNode | null = null;
let dataArray: Uint8Array;

// three.js
const loadingValueRef = ref<HTMLElement>();
let canvasContainer: any;
let width: any;
let height: any;
let scene: any;
let candle: any;
let glow : any;
const percentComplete = ref(0);
const light = new THREE.DirectionalLight(0xffffff, 2);
light.position.set(0.95, 0.82, 1);
light.castShadow = true;
light.shadow.mapSize.width = 1024;
light.shadow.mapSize.height = 1024;
const pointLight = new THREE.PointLight(0xffffff, 0.13,3);
pointLight.position.set(0.04, 0.3, 0.3);
const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);

// const gui = new GUI();
const startListening = async () => {
  
  startBlow.value = true;
  scene.add(pointLight);
    try {
        // 取得麥克風權限
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

        // 建立 AudioContext
        audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        analyser = audioContext.createAnalyser();
        microphone = audioContext.createMediaStreamSource(stream);

        // 連接音訊節點
        microphone.connect(analyser);
        analyser.fftSize = 256; // 設定 FFT 解析度
        dataArray = new Uint8Array(analyser.frequencyBinCount);

        // 持續偵測音量
        checkVolume();
    } catch (error) {
        console.error("無法存取麥克風", error);
        errorText.value = "請允許存取麥克風";
    }
};

const checkVolume = () => {
    if (!analyser) return;
    errorText.value = false;
    showBlowButton.value = false;
    analyser.getByteFrequencyData(dataArray);
    const volume = dataArray.reduce((a, b) => a + b, 0) / dataArray.length; // 計算音量平均值
    value.value = volume;
    stopMusic();
    if (volume > threshold.value) {
        statusText.value = `${params} 生日快樂！`;
        candle.visible = false;
        scene.remove(pointLight);
        scene.remove(glow);
        const celebrate = document.querySelector('.celebrate') as HTMLElement;
        celebrate.classList.add('active')
        const text = document.querySelector('.text') as HTMLElement;
        text.classList.add('active')
        const bar = document.querySelector('.bar') as HTMLElement;
        bar.style.display = 'none';
    } else {
        requestAnimationFrame(checkVolume);
    }
};

onMounted(() => {
    bgMusic.value = new Audio("/birthday/happybirthday.mp3");
    bgMusic.value.loop = true;

    canvasContainer = document.getElementById("cake") as HTMLElement;
    width = canvasContainer.clientWidth;
    height = canvasContainer.clientHeight;
    scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.set(0, 0, 0.5);
    camera.lookAt(0, 0, 0);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    // const controls = new OrbitControls(camera, renderer.domElement);
    // controls.target.set(0, 0, 0);
    canvasContainer.appendChild(renderer.domElement);
    
const model = new THREE.Group();

const loadingManager = new THREE.LoadingManager();
const loader = new GLTFLoader(loadingManager);
loadingManager.onProgress = (_, loaded, total) => {
  percentComplete.value = (loaded / total) * 100;
};

loader.load("/birthday/birthday.glb", (gltf: any) => {
  model.add(gltf.scene);
  scene.add(model);

  candle = model.getObjectByName("candle");
  if (candle) {
    candle.material.transparent = true;
    candle.material.opacity = 0.7;
    candle.material.emissiveIntensity = 5;
    candle.material.color = new THREE.Color(0xffff00);
  }

  model.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.castShadow = true;
    }
  });
});
    model.position.set(0.01, -0.1, 0.1);
    model.rotateX(0.45)
    model.castShadow = true;
    model.receiveShadow = true;
  
    scene.add(light);
    scene.add(pointLight);
    scene.add(ambientLight);

    const planeGeometry = new THREE.PlaneGeometry(10, 10);
    const planeMaterial = new THREE.ShadowMaterial({ opacity: 0.5 });
    const plane = new THREE.Mesh(planeGeometry, planeMaterial);
    plane.rotation.x = -Math.PI / 2;
    plane.receiveShadow = true;
    plane.position.y = -0.17;
    scene.add(plane);

    const glowMaterial = new THREE.ShaderMaterial({
      uniforms: {
        color: { value: new THREE.Color(0xffff00) },
        center: { value: new THREE.Vector3(0.008, 0.17, 0.22) },
        maxDistance: { value: 0.32 }
      },
      vertexShader: `
        varying vec3 vPosition;
        void main() {
          vPosition = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 color;
        uniform vec3 center;
        uniform float maxDistance;
        varying vec3 vPosition;
        void main() {
          float distance = length(vPosition - center);
          float alpha = 1.0 - smoothstep(0.1, maxDistance, distance);
          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      depthWrite: false
    });

    const glowGeometry = new THREE.SphereGeometry(0.03, 32, 32);
    glow = new THREE.Mesh(glowGeometry, glowMaterial);
    glow.position.set(0.008, 0.17, 0.22);
    scene.add(glow);

    const composer = new EffectComposer(renderer);
    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);

    const ssaaPass = new SSAARenderPass(scene, camera);
    ssaaPass.sampleLevel = 4; 
    composer.addPass(ssaaPass);

    let clock = new THREE.Clock();
    function animate() {
        requestAnimationFrame(animate);
        let elapsedTime = clock.getElapsedTime();
        let windEffect = Math.sin(elapsedTime * 2)*0.5 * barPercent.value * 0.01;

        if (candle) {
          let stretchFactor = 1 + windEffect;
          candle.scale.set(1 - windEffect * 1.3, stretchFactor, 1 - windEffect * 1.3);

          let baseHeight = 0.28; 
          candle.position.y = baseHeight * (1 - stretchFactor);
        }
        model.rotation.y += 0.005;
        // controls.update();
        // renderer.render(scene, camera);
        composer.render();
    }

    animate();
});
const startWish = () => {
  showWish.value = true;
  playMusic()
};
const playMusic = () => {
  bgMusic.value.play();
};
const stopMusic = () => {
  bgMusic.value.pause();
};
const completeWish = () => {
  showWish.value = false;
  showWishButton.value = false;
  finishWish.value = true;
  showBlowButton.value = true;
};

watch(value, (newValue) => {
  const barWidth = 200; 
  const percentage = Math.min(Math.max(newValue / threshold.value, 0), 1);
  const valueWidth = barWidth * percentage; 
  const valueElement = document.querySelector('.value') as HTMLElement;
  valueElement.style.width = `${valueWidth}px`;
});

watch(percentComplete, (newValue) => {
  const barWidth = 200; 
  const valueWidth = barWidth * newValue / 100; 
  const loadingValue=document.querySelector('.loadingValue') as HTMLElement;
  loadingValue.style.width = `${valueWidth}px`;
});

const barPercent=computed(()=>{
  if(parseFloat((value.value / threshold.value * 100).toFixed(1)) > 100){
    return 100
  }
  return parseFloat((value.value / threshold.value * 100).toFixed(1))
})
</script>

<template>
  <div class="container">
    <div class="bar loading" v-if="percentComplete<100">
      <div class="number">{{ percentComplete }}%</div>
      <div class="loadingValue" ref="loadingValueRef"></div>
    </div>
    <div id="cake"></div>
    <button class="button" @click="startWish" v-if="!showWish&&showWishButton">點擊開始許願</button>
    <div class="wishContainer" v-if="showWish">
      <div class="wish">
        願望一 : <input type="text">
      </div>
      <div class="wish">
        願望二 : <input type="text">
      </div>
      <div class="wish">
        願望三 : <input type="text">
      </div>
    </div>
    <button class="button" v-if="showWish" @click="completeWish">完成</button>
    <button class="button" @click="startListening" v-if="finishWish&&showBlowButton">吹蠟燭</button>
    <p class="text" v-if="finishWish &&!showBlowButton">{{ statusText }}</p>
    <p class="text" v-if="errorText">{{ errorText }}</p>
    <div class="bar" v-if="finishWish &&!showBlowButton">
      <div class="number">{{ barPercent }}%</div>
      <div class="value"></div>
    </div>
    <div class="celebrate">
      <img src="../assets/celebrate.gif">
    </div>
  </div>
</template>
<style>
body{
  margin: 0;
}
.container{
  display: flex;
  flex-direction: column;
  align-items: center;
  background-color: rgb(241, 218, 238);
  height: 100vh;
  position: relative;
  overflow: hidden;
}
.text{
  font-size: 20px;
  font-weight: bold;
}
.text.active{
  animation: textAnimation 3s infinite;
}
#cake{
  width: 350px;
  height: 350px;
  position: relative;
  margin: 100px 0 20px;
}
.button{
  margin-bottom: 10px;
  padding: 5px 20px;
  background-color: #f0f0f0;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 18px;
}
.wish{
  margin-bottom: 10px;
  font-weight: bolder;
  letter-spacing: 1.4px;
}
.bar,.value{
  height: 23px;
  border-radius: 10px;
}
.bar{
  width: 200px;
  border: 1px solid black;
  position: relative;
  overflow: hidden;
  background-color: white;
}
.bar.loading{
  position: absolute;
  top: 30%;
  z-index: 200;
}
.value{
  position: absolute;
  background-color: red;
}
.loadingValue{
  height: 23px;
  border-radius: 10px;
  position: absolute;
  background-color: rgb(96, 139, 255);
}
.number{
  position: absolute;
  color: black;
  z-index: 200;
  left: 50%;
  top: 50%;
  transform: translate(-50%,-50%);
  font-size: 14px;
  font-weight: bold;
}
.celebrate {
  display: none;
  position: absolute;
  top: 100%;
  z-index: 300;
}

.celebrate.active {
  display: block;
  animation: slideUp 5s ease-in-out forwards;
}
img{
  width: 100%;
}
@keyframes slideUp {
  0% {
    top: 100%;
    transform: translateX(-100px);
  }
  50%{
    transform: translateX(80px);
  }
  100% {
    top: -40%;
    transform: translateX(-50px);
  }
}
@keyframes textAnimation {
  0% {
    transform: scale(1);
    text-shadow: none;
  }
  50%{
    transform: scale(1.4);
    text-shadow: 4px 4px 2px white;
  }
  100% {
    transform: scale(1);
    text-shadow: none;
  }
}
</style>
