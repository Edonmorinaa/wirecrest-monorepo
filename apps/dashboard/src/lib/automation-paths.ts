import fs from 'fs';
import path from 'path';

/**
 * Get the correct base path for automation files
 * This handles the case where the working directory might not be the project root
 */
export function getAutomationBasePath(): string {
  // Try to find the automation-flow.js file in various possible locations
  const possiblePaths = [
    // Current working directory
    process.cwd(),
    // Next.js project root (if we're in a subdirectory)
    path.join(process.cwd(), 'next-js'),
    // Parent directory (if we're in next-js/src)
    path.dirname(process.cwd()),
    // Two levels up (if we're in next-js/src/app/api)
    path.dirname(path.dirname(process.cwd())),
  ];

  for (const basePath of possiblePaths) {
    const automationFlowPath = path.join(basePath, 'automation-flow.js');
    if (fs.existsSync(automationFlowPath)) {
      return basePath;
    }
  }

  // Fallback to current working directory
  return process.cwd();
}

/**
 * Get the full path to an automation file
 */
export function getAutomationFilePath(filename: string): string {
  const basePath = getAutomationBasePath();
  return path.join(basePath, filename);
}

/**
 * Check if an automation file exists
 */
export function automationFileExists(filename: string): boolean {
  const filePath = getAutomationFilePath(filename);
  return fs.existsSync(filePath);
}

/**
 * Get the automation directory path
 */
export function getAutomationDirPath(): string {
  const basePath = getAutomationBasePath();
  return path.join(basePath, 'automation-system');
}
