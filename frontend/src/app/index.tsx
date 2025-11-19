import { FilterConfigsProvider } from "../hooks/useFilterConfigs";
import { AppRouter } from "./router";

function App() {
  return (
    <FilterConfigsProvider>
      <AppRouter />
    </FilterConfigsProvider>
  )
}

export default App;
