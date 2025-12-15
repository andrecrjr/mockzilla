import { describe, it, expect, afterEach } from "bun:test";
import React from "react";
import { render, screen, cleanup } from "@testing-library/react";
import { Button } from "../../components/ui/button";

describe("Button", () => {
  afterEach(cleanup);

  it("renders correctly", () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText("Click me")).toBeTruthy();
    expect(screen.getByRole("button")).toBeTruthy();
  });

  it("applies variant classes", () => {
     render(<Button variant="destructive">Delete</Button>);
     const button = screen.getByRole("button");
     // Just checking partial match because other classes are present
     expect(button.className).toContain("bg-destructive");
  });

  it("renders as child when asChild is true", () => {
      render(
          <Button asChild>
              <a href="/link">Link Button</a>
          </Button>
      );
      expect(screen.getByRole("link")).toBeTruthy();
      // When asChild is true, it renders the child, which is an 'a' tag. 
      // The 'button' role should not be present (unless 'a' has role='button', which it doesn't by default here)
      // Note: getByRole throws if not found, queryByRole returns null
      expect(screen.queryByRole("button")).toBeNull();
      expect(screen.getByText("Link Button")).toBeTruthy();
  });
});
