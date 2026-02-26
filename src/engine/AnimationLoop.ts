export class AnimationLoop {
  private fps: number = 12;
  private isPlaying: boolean = false;
  private lastTime: number = 0;
  private frameInterval: number = 1000 / 12;
  private onFrame: (frameIndex: number) => void;
  private totalFrames: number = 0;
  private currentFrame: number = 0;

  constructor(onFrame: (frameIndex: number) => void) {
    this.onFrame = onFrame;
  }

  setFPS(fps: number) {
    this.fps = fps;
    this.frameInterval = 1000 / fps;
  }

  setTotalFrames(total: number) {
    this.totalFrames = total;
  }

  start(startFrame: number = 0) {
    this.isPlaying = true;
    this.currentFrame = startFrame;
    this.lastTime = performance.now();
    requestAnimationFrame(this.loop.bind(this));
  }

  stop() {
    this.isPlaying = false;
  }

  private loop(now: number) {
    if (!this.isPlaying) return;

    const elapsed = now - this.lastTime;

    if (elapsed >= this.frameInterval) {
      // Calculate how many frames to skip if lagging
      const framesToAdvance = Math.floor(elapsed / this.frameInterval);
      this.currentFrame = (this.currentFrame + framesToAdvance) % this.totalFrames;
      this.lastTime = now - (elapsed % this.frameInterval);
      
      this.onFrame(this.currentFrame);
    }

    requestAnimationFrame(this.loop.bind(this));
  }
}
