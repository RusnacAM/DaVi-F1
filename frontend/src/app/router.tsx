import { createBrowserRouter, RouterProvider } from 'react-router-dom';

// eslint-disable-next-line react-refresh/only-export-components
export const createAppRouter = () => 
    createBrowserRouter([
    {
      path: '/',
      lazy: async () => {
        const { VisualizationRoute } = await import('./routes/visualization');
        return { Component: VisualizationRoute };
      },
    }
  ]);

  export const AppRouter = () => {
    const router = createAppRouter();

    return <RouterProvider router={router} />;
  }