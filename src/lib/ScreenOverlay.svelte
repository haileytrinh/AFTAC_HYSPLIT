<script lang="ts">
    import { kmz } from './state.svelte';
    
    const { overlayElement }: { overlayElement: Element } = $props();
    
    // svelte-ignore state_referenced_locally
    const altText = overlayElement.getElementsByTagName("name")[0].textContent;
    
    const {left, right, bottom, top, tx, ty} = getAlignment();
    const imgSrc = getImgSrc();
    
    function getImgSrc() {
      let imgSrc = 'https://placehold.co/600x400';
      const blobKey = overlayElement.getElementsByTagName("href")[0].textContent;
      if(kmz.images && kmz.images[blobKey]) imgSrc = kmz.images[blobKey];
      return imgSrc
    }
    
    function getAlignment() {
      const screenXY = overlayElement.getElementsByTagName("screenXY")[0];
      const screenXUnits = screenXY.getAttribute("xunits") || "fraction";
      const screenYUnits = screenXY.getAttribute("yunits") || "fraction";
      const screenXValue = parseFloat(screenXY.getAttribute("x") || "0");
      const screenYValue = parseFloat(screenXY.getAttribute("y") || "0");
      
      let left = 'auto', right = 'auto', bottom = 'auto', top = 'auto';
      
      if (screenXUnits === 'pixels') left = `${screenXValue}px`;
      else if (screenXUnits === 'insetPixels') right = `${screenXValue}px`;
      else if (screenXUnits === 'fraction') left = `${screenXValue * 100}%`;
      
      if (screenYUnits === 'pixels') bottom = `${screenYValue}px`;
      else if (screenYUnits === 'insetPixels') top = `${screenYValue}px`;
      else if (screenYUnits === 'fraction') bottom = `${screenYValue * 100}%`;
      
      const overlayXY = overlayElement.getElementsByTagName("overlayXY")[0];
      const overlayXUnits = overlayXY.getAttribute("xunits") || "fraction";
      const overlayYUnits = overlayXY.getAttribute("yunits") || "fraction";
      const overlayXValue = parseFloat(overlayXY.getAttribute("x") || "0");
      const overlayYValue = parseFloat(overlayXY.getAttribute("y") || "0");
      let tx = '0px', ty = '0px';
      
      if (overlayXUnits === 'pixels') tx = `-${overlayXValue}px`;
      else if (overlayXUnits === 'insetPixels') tx = `calc(-100% + ${overlayXValue}px)`;
      else if (overlayXUnits === 'fraction') tx = `-${overlayXValue * 100}%`;
      
      if (overlayYUnits === 'pixels') ty = `calc(-100% + ${overlayYValue}px)`;
      else if (overlayYUnits === 'insetPixels') ty = `-${overlayYValue}px`;
      else if (overlayYUnits === 'fraction') ty = `-${(1 - overlayYValue) * 100}%`;
      
      return {left, right, bottom, top, tx, ty}
    }
    
</script>

<div 
    class="anchor"
    style:left
    style:right
    style:top
    style:bottom
>
    {#if imgSrc}
        <img 
            src={imgSrc} 
            alt={altText}
            style:transform="translate({tx}, {ty})"
        />
    {/if}
</div>

<style>
    .anchor {
        position: absolute;
        width: 0;
        height: 0;
    }
</style>
