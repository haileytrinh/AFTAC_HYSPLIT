import L from 'leaflet';
import { mount, unmount } from 'svelte';
import ScreenOverlay from './ScreenOverlay.svelte'

interface ScreenOverlayOptions {
  position: string;
  overlayElement: Element | null;
}

const ScreenOverlayControl = L.Control.extend({
  options: {
    position: 'topleft',
    overlayElement: null
  },
  
  onAdd: function (map: L.Map) {
    if (!this.options.overlayElement) return;
    var container = L.DomUtil.create('div');
    
    container.style.position = 'absolute';
    container.style.margin = '0';
    container.style.width = '100vw';
    container.style.height = '100vh';
    
    const props = this.options.overlayElement;
    
    this._overlayContainer = mount(ScreenOverlay, {
      target: container,
      props: { overlayElement: props }
    });
    
    return container;
  },
  
  onRemove: function () {
    if (this._overlayContainer) {
      unmount(this._overlayContainer);
    }
  }
});


export function screenOverlayControl(options: ScreenOverlayOptions) {
  return new ScreenOverlayControl(options)
}
