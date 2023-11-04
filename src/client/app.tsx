import React from "react";
import { createRoot } from "react-dom/client";

import { Options } from "./components/Options";

function App(): React.ReactElement {
  return <Options />;
}

const root = createRoot(document.getElementById("app"));
root.render(<App />);
