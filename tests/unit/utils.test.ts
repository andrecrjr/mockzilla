import { describe, it, expect } from "bun:test";
import { cn, copyToClipboard } from "../../lib/utils";

describe("lib/utils", () => {
  describe("cn", () => {
    it("merges class names correctly", () => {
      expect(cn("px-2 py-1", "bg-red-500")).toBe("px-2 py-1 bg-red-500");
    });

    it("handles conditional classes", () => {
        expect(cn("px-2", true && "py-1", false && "bg-red-500")).toBe("px-2 py-1");
    });

    it("merges tailwind classes overriding", () => {
        expect(cn("p-2 p-4")).toBe("p-4");
    });
  });

  describe("copyToClipboard", () => {
    it("copies text using clipboard API if available", async () => {
      // Mock navigator.clipboard
      const originalClipboard = navigator.clipboard;
      let writtenText = "";
      
      // We need to ensure navigator exists (Happy DOM should provide window.navigator)
      if (typeof navigator === 'undefined') {
        throw new Error("Navigator not found in test environment");
      }

      Object.defineProperty(navigator, 'clipboard', {
        value: {
          writeText: async (text: string) => {
            writtenText = text;
            return Promise.resolve();
          }
        },
        writable: true,
        configurable: true
      });

      const success = await copyToClipboard("hello world");
      expect(success).toBe(true);
      expect(writtenText).toBe("hello world");

      // cleanup (optional if environment resets, but good practice)
      if (originalClipboard) {
          Object.defineProperty(navigator, 'clipboard', { value: originalClipboard, writable: true, configurable: true });
      }
    });

     it("falls back to execCommand if clipboard API is missing", async () => {
        // Remove clipboard API
        const originalClipboard = navigator.clipboard;
        Object.defineProperty(navigator, 'clipboard', { value: undefined, writable: true, configurable: true });

        // Mock execCommand
        let execCommandCalled = false;
        document.execCommand = ((command: string) => {
             if (command === 'copy') {
                 execCommandCalled = true;
                 return true;
             }
             return false;
        }) as any;

        const success = await copyToClipboard("fallback text");
        expect(success).toBe(true);
        expect(execCommandCalled).toBe(true);
        
        // Restore
        if (originalClipboard) {
          Object.defineProperty(navigator, 'clipboard', { value: originalClipboard, writable: true, configurable: true });
        }
    });
  });
});
