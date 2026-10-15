
import { BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import WeighmentSearch from "./pages/weighment/WeighmentSearch";
import WeighmentCreate from "./pages/weighment/WeighmentCreate";
import WeighmentEdit from "./pages/weighment/WeighmentEdit";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={<Navigate to="/weighment" replace />}
        />

        <Route
          path="/weighment"
          element={<WeighmentSearch />}
        />

        <Route
          path="/weighment/create"
          element={<WeighmentCreate />}
        />

        <Route
          path="/weighment/edit/:id"
          element={<WeighmentEdit />}
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
