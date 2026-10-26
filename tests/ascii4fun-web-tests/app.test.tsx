import { expect, test } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import { App } from "../../src/ascii4fun-web/app";

test("renders the application root", () => {
  render(<App />);

  expect(screen.getByRole("main")).toHaveTextContent("ASCII4fun");
});
