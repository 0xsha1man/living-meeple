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

  getState(): StoryStateData {
    return { ...this.state };
  }

  private setState(newState: Partial<StoryStateData>) {
    this.state = { ...this.state, ...newState };
    this.emit('change', this.getState());
  }

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

  addLog(message: string) {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = { timestamp, message };
    const logLine = `[${timestamp}] ${message}\n`;
    this.setState({
      debugLog: [...this.state.debugLog, logEntry],
      logFileContent: this.state.logFileContent + logLine,
    });
  }

  setProgress(progress: number, text: string) {
    this.setState({ progress, progressText: text });
  }

  setProgressText(text: string) {
    this.setState({ progressText: text });
  }

  addRealTimeAsset(key: string, asset: GeneratedAsset) {
    this.setState({
      realTimeAssets: { ...this.state.realTimeAssets, [key]: asset },
    });
  }

  updateRealTimeFrames(index: number, frames: GeneratedAsset[]) {
    const newFrames = [...this.state.realTimeFrames];
    newFrames[index] = [...frames];
    this.setState({ realTimeFrames: newFrames });
  }

  setFinalStory(story: StoredStory | null) {
    this.setState({ currentStory: story });
  }

  setLoading(isLoading: boolean) {
    this.setState({ isLoading });
  }
}

export const storyState = new StoryStateStore();