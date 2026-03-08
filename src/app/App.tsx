import { RouterProvider } from "react-router";
import { Toaster } from "sonner";
import { router } from "./routes";
import { AppProvider } from "./context/AppContext";

export default function App() {
  return (
    <AppProvider>
      <RouterProvider router={router} />
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            fontFamily: 'Noto Serif KR, serif',
            background: 'var(--surface, #FFFDF7)',
            color: 'var(--text-primary, #2C2416)',
            border: '1px solid var(--line, #B8AFA0)',
            borderRadius: '2px',
          },
        }}
      />
    </AppProvider>
  );
}
