// src/ipc/commands.ts
import { invoke } from "@tauri-apps/api/core";
import type { Config, ScanResult } from "../types";

export const scanDirectory = (path: string): Promise<ScanResult> =>
  invoke<ScanResult>("scan_directory_cmd", { path });

export const startProcess = (sourceDir: string, config: Config): Promise<void> =>
  invoke<void>("start_process_cmd", { sourceDir, config });

export const cancelProcess = (): Promise<boolean> =>
  invoke<boolean>("cancel_process_cmd");

export const pauseProcess = (): Promise<boolean> =>
  invoke<boolean>("pause_process_cmd");

export const resumeProcess = (): Promise<boolean> =>
  invoke<boolean>("resume_process_cmd");

export const openOutput = (path: string): Promise<void> =>
  invoke<void>("open_output_cmd", { path });
