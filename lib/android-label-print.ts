import html2canvas from "html2canvas";

export type AndroidLabelType =
  | "child"
  | "parent"
  | "volunteer";

type AndroidPrintResult = {
  jobId: string;
  success: boolean;
  message: string;
};

type ShepherdKidsAndroidBridge = {
  isAvailable: () => boolean;
  printLabel: (
    jobId: string,
    labelType: AndroidLabelType,
    base64Png: string,
  ) => void;
};

declare global {
  interface Window {
    ShepherdKidsAndroid?: ShepherdKidsAndroidBridge;
  }
}

export function hasAndroidPrintBridge(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    return window.ShepherdKidsAndroid?.isAvailable() === true;
  } catch {
    return false;
  }
}

export async function printLabelElementOnAndroid({
  element,
  jobId,
  labelType,
}: {
  element: HTMLElement;
  jobId: string;
  labelType: AndroidLabelType;
}): Promise<void> {
  if (typeof window === "undefined") {
    throw new Error(
      "Android label printing is only available in the browser.",
    );
  }

  const bridge = window.ShepherdKidsAndroid;

  if (!bridge) {
    throw new Error(
      "The ShepherdKids Android print bridge is unavailable.",
    );
  }

  if (document.fonts?.ready) {
    await document.fonts.ready;
  }

  const bounds = element.getBoundingClientRect();

  if (bounds.width <= 0 || bounds.height <= 0) {
    throw new Error(
      "The label was not fully rendered and could not be captured.",
    );
  }

  const canvas = await html2canvas(element, {
    backgroundColor: "#FFFFFF",
    scale: 2,
    useCORS: true,
    logging: false,
  });

  if (canvas.width <= 0 || canvas.height <= 0) {
    throw new Error(
      "The label image could not be created.",
    );
  }

  const base64Png = canvas.toDataURL("image/png");
  const resultPromise = waitForAndroidPrintResult(jobId);

  try {
    bridge.printLabel(
      jobId,
      labelType,
      base64Png,
    );
  } catch (error) {
    throw new Error(
      error instanceof Error
        ? error.message
        : "The Android print request could not be started.",
    );
  }

  await resultPromise;
}

function waitForAndroidPrintResult(
  jobId: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      cleanup();

      reject(
        new Error(
          "The printer did not respond within 30 seconds.",
        ),
      );
    }, 30_000);

    function handleResult(event: Event) {
      const customEvent =
        event as CustomEvent<AndroidPrintResult>;

      const detail = customEvent.detail;

      if (!detail || detail.jobId !== jobId) {
        return;
      }

      cleanup();

      if (detail.success) {
        resolve();
      } else {
        reject(
          new Error(
            detail.message ||
              "The label could not be printed.",
          ),
        );
      }
    }

    function cleanup() {
      window.clearTimeout(timeoutId);

      window.removeEventListener(
        "shepherdkids-print-result",
        handleResult as EventListener,
      );
    }

    window.addEventListener(
      "shepherdkids-print-result",
      handleResult as EventListener,
    );
  });
}
