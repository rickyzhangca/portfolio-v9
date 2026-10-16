/**
 * Three cards dealt onto the desk while the canvas loads, a small echo of the
 * scene's own entrance. Pure CSS (`.portfolio-loader` in index.css), so it
 * moves from the first paint of the prerendered page, before any JavaScript.
 */
export const PortfolioLoader = () => (
  <div className="portfolio-loader">
    <div aria-hidden="true" className="portfolio-loader-deck">
      <span />
      <span />
      <span />
    </div>
    <p>Opening Ricky’s portfolio…</p>
  </div>
);
