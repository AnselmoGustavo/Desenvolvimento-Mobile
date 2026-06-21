import { createContext, useContext } from "react";
import { useAppData } from "../hooks/useAppData";

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const value = useAppData();
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  return useContext(AppContext);
}
