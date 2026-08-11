<script lang="ts">
    import {timestamp} from './state.svelte';
    let minValue = 0;
    let maxValue = $state(0);
    let stepValue = 1;
    let currentTime = $state("");
    let isPlaying = $state(false);
    let timeoutIds: ReturnType<typeof setTimeout>[] = [];
    let playSpeed = $state(500);
    let isLooping = $state(false);

    function handleInput(event) {
        const value = Number(event.target.value);
        timestamp.index = Math.round(value / stepValue) * stepValue;
        currentTime = timestamp.times[timestamp.index];
    }

    function prevStep() {
        if (timestamp.index > minValue) {
            timestamp.index -= stepValue;
            currentTime = timestamp.times[timestamp.index];
        }
    }

    function nextStep() {
        if (timestamp.index < maxValue) {
            timestamp.index += stepValue;
            currentTime = timestamp.times[timestamp.index];
        }
    }

    function clearTimeouts() {
        timeoutIds.forEach(id => clearTimeout(id));
        timeoutIds = [];
    }

    function play() {
        clearTimeouts();
        isPlaying = true;
        let startIndex = timestamp.index;

        if (maxValue === 0 || startIndex > maxValue) {
            isPlaying = false;
            return;
        }

        if (startIndex === maxValue) {
            timestamp.index = minValue;
            currentTime = timestamp.times[timestamp.index];
            startIndex = timestamp.index;
        }

        for (let i = startIndex; i <= maxValue; i++) {
            const id = setTimeout(() => {
                timestamp.index = i;
                currentTime = timestamp.times[timestamp.index];
                if (i === maxValue && !isLooping) {
                    isPlaying = false;
                }
            }, (i - timestamp.index) * playSpeed); // Adjust the delay as needed
            timeoutIds.push(id);
        }
    }

    function pause() {
        isPlaying = false;
        clearTimeouts();
    }

    function togglePlay() {
        if (isPlaying) {
            pause();
        } else {
            play();
        }
    }

    function toggleLoop() {
        isLooping = !isLooping;
        if (isLooping && !isPlaying) {
            play();
        }
    }

    $effect(() => {
        if (timestamp.index === maxValue && isLooping) {
            const id = setTimeout(() => {
                timestamp.index = minValue;
                currentTime = timestamp.times[minValue];
                play();
            }, playSpeed);
            timeoutIds.push(id);
        }
    })

    $effect(() => {
        pause();
        maxValue = timestamp.times.length-1;
        timestamp.index = 0;
        currentTime = timestamp.times[0];
    })
</script>

<div class="scrubber-container">
    <div class="divColor">
        <button type="button" title="previous" onclick={prevStep}>
            <i class="arrow left"></i>
        </button>
        <button type="button" title={isPlaying ? "pause" : "play"} onclick={togglePlay}>
            {#if isPlaying}
                <div class="pause"></div>
            {:else}
                <i class="play"></i>
            {/if}
        </button>
        <button type="button" title="loop" onclick={toggleLoop} class:active={isLooping}>
            <div class="loop-icon">
                <div class="loop-arrow loop-arrow-top"></div>
                <div class="loop-arrow loop-arrow-bottom"></div>
            </div>
        </button>
        <button type="button" title="next" onclick={nextStep}>
            <i class="arrow right"></i>
        </button>
        <select value={playSpeed}
            onchange={(e) => {
                playSpeed = Number(e.target.value);
                if (isPlaying) { pause(); play(); }
            }}
            title="playback speed">
            <option value={1000}>0.5×</option>
            <option value={500} selected>1×</option>
            <option value={250}>2×</option>
            <option value={125}>4×</option>
        </select>
        <input
            type="range"
            min={minValue}
            max={maxValue}
            step={stepValue}
            bind:value={timestamp.index}
            oninput={handleInput}
            id="slider"
        />
        <p class="timespan">
            {currentTime}
        </p>
    </div>
</div>

<style>
    .scrubber-container {
        position: absolute;
        bottom: 10%;
        width: 100%;
        height: auto;
        min-height: 40px;

        display: flex;
        justify-content: center;
        align-items: center;

        z-index: 1;
    }

    .divColor {
        width: clamp(320px, 50%, 700px);
        height: 100%;
        padding: 6px 12px;
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 8px;
        background-color: white;
        outline: 1px solid black;
        border-radius: 4px;
        box-sizing: border-box;
        z-index: 2;
    }

    .scrubber-container input[type="range"] {
        flex: 1;
        min-width: 0;
        cursor: pointer;
        z-index: 3;
    }

    .timespan {
        font-size: clamp(10px, 1.2vw, 14px);
        white-space: nowrap;
        padding: 0 4px;
        margin: 0;
        flex-shrink: 0;
        color: black;
    }

    button {
        flex-shrink: 0;
        background: none;
        border: none;
        cursor: pointer;
        padding: 6px;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    button:hover .arrow {
        border-color: #555;
    }

    .arrow {
        border: solid black;
        border-width: 0 3px 3px 0;
        display: inline-block;
        padding: 3px;
    }

    .right {
        transform: rotate(-45deg);
        -webkit-transform: rotate(-45deg);
    }

    .left {
        transform: rotate(135deg);
        -webkit-transform: rotate(135deg);
    }

    .play {
        width: 3px;
        height: 3px;
        box-sizing: border-box;
        border-style: solid;
        border-width: 6px 0px 6px 12px;
        border-color: transparent transparent transparent #202020;
    }

    .pause {
        width: 10px;
        height: 12px;
        box-sizing: border-box;
        border-style: double;
        border-width: 0px 0px 0px 10px;
        border-color: transparent transparent transparent #202020;
    }

    select {
        font-size: clamp(10px, 1.2vw, 13px);
        flex-shrink: 0;
        border: 1px solid #ccc;
        border-radius: 4px;
        background: white;
        cursor: pointer;
        padding: 2px 4px;
        color: black;
    }

    .loop-icon {
        width: 16px;
        height: 14px;
        position: relative;
    }

    .loop-arrow {
        position: absolute;
        width: 12px;
        height: 6px;
        border: 1.5px solid #202020;
        border-bottom: none;
        border-radius: 6px 6px 0 0;
    }

    .loop-arrow-top {
        top: -2px;
        left: 1px;
        border-top-left-radius: 9px;
        border-top-right-radius: 9px;
    }

    .loop-arrow-top::after {
        content: '';
        position: absolute;
        right: -4px;
        top: -3px;
        border: 4px solid transparent;
        border-bottom-color: #202020;
        transform: rotate(30deg);
    }

    .loop-arrow-bottom {
        bottom: -2px;
        right: 1px;
        transform: rotate(180deg);
    }

    .loop-arrow-bottom::after {
        content: '';
        position: absolute;
        right: -4px;
        top: -3px;
        border: 4px solid transparent;
        border-bottom-color: #202020;
        transform: rotate(30deg);
    }

    button.active .loop-arrow,
    button.active .loop-arrow::after {
        border-color: #0077cc;
        border-bottom-color: transparent;
    }

    button.active .loop-arrow-top::after,
    button.active .loop-arrow-bottom::after {
        border-color: transparent;
        border-bottom-color: #0077cc;
    }
</style>
