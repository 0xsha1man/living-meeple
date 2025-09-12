/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { GeneratedAsset, StoredStory } from './interfaces';

type Listener = (...args: any[]) => void;

class SimpleEventEmitter {
  private listeners: { [event: string]: Listener[] } = {};

  on(event: string, listener: Listener): void {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(listener);
  }

  off(event: string, listener: Listener): void {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(l => l !== listener);
    }
  }

  emit(event: string, ...args: any[]): void {
    if (this.listeners[event]) {
      this.listeners[event].forEach(l => l(...args));
    }
  }
}
interface StoryStateData {
  isLoading: boolean;
  currentStory: StoredStory | null;
  debugLog: { timestamp: string, message: string }[];
  realTimeAssets: { [key: string]: GeneratedAsset };
  realTimeFrames: GeneratedAsset[][];
  progress: number;
  progressText: string;
  logFileContent: string;
  logFilename: string;
}

/**
 * A simple global state store for the story generation process.
 * It uses an event emitter to notify listeners (like React components) of state changes.
 * This allows for real-time UI updates as the story is generated.
 */
class StoryStateStore extends SimpleEventEmitter {
  private state: StoryStateData = {
    isLoading: false,
    currentStory: null,
    debugLog: [],
    realTimeAssets: {},
    realTimeFrames: [],
    progress: 0,
    progressText: '',
    logFileContent: '',
    logFilename: '',
  };

  /**
   * Returns a copy of the current state.
   * @returns The current state data.
   */
  getState(): StoryStateData {
    return { ...this.state };
  }

  /**
   * Updates the state and emits a 'change' event.
   * @param newState A partial state object to merge into the current state.
   */
  private setState(newState: Partial<StoryStateData>) {
    this.state = { ...this.state, ...newState };
    this.emit('change', this.getState());
  }

  /**
   * Resets the state to its initial values for a new generation run.
   */
  reset() {
    const now = new Date();
    const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}-${String(now.getSeconds()).padStart(2, '0')}`;

    this.setState({
      isLoading: true,
      debugLog: [],
      currentStory: null,
      realTimeAssets: {},
      realTimeFrames: [],
      progress: 0,
      progressText: '',
      logFileContent: '',
      logFilename: `debug-${timestamp}.log`,
    });
  }

  /**
   * Adds a message to the debug log.
   * @param message The log message.
   */
  addLog(message: string) {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = { timestamp, message };
    const logLine = `[${timestamp}] ${message}\n`;
    this.setState({
      debugLog: [...this.state.debugLog, logEntry],
      logFileContent: this.state.logFileContent + logLine,
    });
  }

  /**
   * Sets the overall progress of the generation.
   * @param progress A number between 0 and 1.
   * @param text A description of the current progress.
   */
  setProgress(progress: number, text: string) {
    this.setState({ progress, progressText: text });
  }

  /**
   * Sets only the text description of the current progress.
   * @param text A description of the current progress.
   */
  setProgressText(text: string) {
    this.setState({ progressText: text });
  }

  /**
   * Adds a newly generated asset to the real-time asset dictionary.
   * @param key The asset's name/key.
   * @param asset The generated asset object.
   */
  addRealTimeAsset(key: string, asset: GeneratedAsset) {
    this.setState({
      realTimeAssets: { ...this.state.realTimeAssets, [key]: asset },
    });
  }

  /**
   * Updates the real-time storyboard frames for a specific page.
   * @param index The index of the storyboard page.
   * @param frames An array of the composite images for that page.
   */
  updateRealTimeFrames(index: number, frames: GeneratedAsset[]) {
    const newFrames = [...this.state.realTimeFrames];
    newFrames[index] = [...frames];
    this.setState({ realTimeFrames: newFrames });
  }

  /**
   * Sets the final, complete story object in the state.
   * @param story The complete story object, or null to clear it.
   */
  setFinalStory(story: StoredStory | null) {
    this.setState({ currentStory: story });
  }

  /**
   * Sets the loading state.
   * @param isLoading Whether the application is in a loading state.
   */
  setLoading(isLoading: boolean) {
    this.setState({ isLoading });
  }
}

export const storyState = new StoryStateStore();