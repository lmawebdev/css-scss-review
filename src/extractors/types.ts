import * as vscode from 'vscode';
import { ExtensionConfig } from '../config';

export interface ScanContext {
  text: string;
  uri: vscode.Uri;
  lineStarts: number[];
  classNames: Set<string>;
  idNames: Set<string>;
  tagNames: Set<string>;
  classLocations: Map<string, vscode.Location[]>;
  idLocations: Map<string, vscode.Location[]>;
  tagLocations: Map<string, vscode.Location[]>;
  classGroups: Set<string>; // Complete strings containing classes (e.g. "card active")
  cfg: ExtensionConfig;
}

export interface UsageExtractor {
  /** Human-readable name for debugging */
  readonly name: string;
  /** Check if this extractor should run for the given file/config */
  shouldScan(ctx: ScanContext): boolean;
  /** Scan text and add locations to the context maps */
  scan(ctx: ScanContext): void;
}

/** Helper to add a location to a map */
export function addLocation(
  map: Map<string, vscode.Location[]>,
  name: string,
  uri: vscode.Uri,
  lineStarts: number[],
  offset: number,
  length: number
): void {
  const start = offsetToPosition(lineStarts, offset);
  const end = new vscode.Position(start.line, start.character + length);
  const loc = new vscode.Location(uri, new vscode.Range(start, end));
  let arr = map.get(name);
  if (!arr) {
    arr = [];
    map.set(name, arr);
  }
  arr.push(loc);
}

export function offsetToPosition(lineStarts: number[], offset: number): vscode.Position {
  let low = 0;
  let high = lineStarts.length - 1;
  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    if (lineStarts[mid] <= offset) {
      low = mid;
    } else {
      high = mid - 1;
    }
  }
  return new vscode.Position(low, offset - lineStarts[low]);
}

export function buildLineStarts(text: string): number[] {
  const starts: number[] = [0];
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '\n') {
      starts.push(i + 1);
    }
  }
  return starts;
}
