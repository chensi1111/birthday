<script setup lang="ts">
import { ref, onMounted } from "vue";

const threshold = 15; // 設定加速度變化的閾值
const candle = ref<HTMLElement | null>(null);
const statusText = ref("請吹氣或搖動手機");

onMounted(() => {
    if (window.DeviceMotionEvent) {
        window.addEventListener("devicemotion", (event: DeviceMotionEvent) => {
            if (!event.accelerationIncludingGravity) return;

            const acc = event.accelerationIncludingGravity;
            const totalAcceleration = Math.abs(acc.x || 0) + Math.abs(acc.y || 0) + Math.abs(acc.z || 0);

            if (totalAcceleration > threshold && candle.value) {
                candle.value.style.opacity = "0"; // 讓蠟燭熄滅（隱藏）
                statusText.value = "蠟燭熄滅了！";
            }
        });
    } else {
        statusText.value = "您的裝置不支援加速度感測。";
    }
});
</script>

<template>
    <div>
        <h1>吹氣來熄滅蠟燭</h1>
        <div ref="candle" style="font-size: 100px; transition: opacity 0.5s;">🕯️</div>
        <p>{{ statusText }}</p>
    </div>
</template>