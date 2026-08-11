<script lang="ts">
  import Map from './lib/Map.svelte'
  import KMZPicker from './lib/KMZPicker.svelte'
  import Scrubber from './lib/Scrubber.svelte'
</script>

<div class="app-container">
  <!-- Top Bar -->
  <div class="top-bar">
    <h1 class="title">AFTAC HYSPLIT Visualization</h1>
    <div class="controls">
      <KMZPicker/>
    </div>
  </div>

  <!-- Main Content -->
  <div class="main-content">
    <Map />
    <Scrubber/>
  </div>
</div>

<style>
  :global(html, body, #app) {
    margin: 0;
    padding: 0;
    width: 100%;
    height: 100%;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  }

  :global(#app) {
    display: flex;
    flex-direction: column;
  }

  .app-container {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
  }

  .top-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem 1.5rem;
    background-color: #2c3e50;
    color: white;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    z-index: 1000;
    min-height: 60px;
    flex-shrink: 0;
  }

  .title {
    margin: 0;
    font-size: 1.5rem;
    font-weight: 600;
    letter-spacing: -0.5px;
    white-space: nowrap;
}

.controls {
    display: flex;
    align-items: center;
    gap: 1rem;
    background-color: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.25);
    border-radius: 6px;
    padding: 0.4rem 0.75rem;
    flex-shrink: 0;
    overflow: hidden;
    max-width: 480px;
}

  .main-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    position: relative;
    overflow: hidden;
  }
</style>