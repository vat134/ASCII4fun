describe("ASCII4fun foundation", () => {
  it("serves the React application", () => {
    cy.visit("/");

    cy.get("main").should("have.text", "ASCII4fun");
  });
});
