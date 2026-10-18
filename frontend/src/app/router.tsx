import { createBrowserRouter, Link } from "react-router-dom";
import App from "@/App";
import { CatalogPage } from "@/features/catalog/CatalogPage";
import { NyquistPage } from "@/features/control/nyquist/NyquistPage";
import { Button } from "@/components/ui/button";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      {
        index: true,
        element: <CatalogPage />,
      },
      {
        path: "calculators",
        element: <CatalogPage />,
      },
      {
        path: "control/nyquist",
        element: <NyquistPage />,
      },
      {
        path: "*",
        element: (
          <div className="container max-w-md py-16 text-center space-y-4">
            <h2 className="text-xl font-bold">Page Not Found</h2>
            <p className="text-sm text-muted-foreground">
              The requested calculator or page does not exist.
            </p>
            <Link to="/">
              <Button size="sm">Back to Home</Button>
            </Link>
          </div>
        ),
      },
    ],
  },
]);
