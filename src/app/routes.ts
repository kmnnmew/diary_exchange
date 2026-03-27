import { createBrowserRouter } from "react-router";
import { Landing } from "./pages/Landing";
import { Auth } from "./pages/Auth";
import { Home } from "./pages/Home";
import { Write } from "./pages/Write";
import { Received } from "./pages/Received";
import { GroupExchange } from "./pages/GroupExchange";
import { AIExchange } from "./pages/AIExchange";
import { Archive } from "./pages/Archive";
import { Customize } from "./pages/Customize";
import { MyPage } from "./pages/MyPage";
import { NotFound } from "./pages/NotFound";
import { JoinGroup } from "./pages/JoinGroup";
import { MainLayout } from "./components/MainLayout";
import { ProtectedRoute } from "./components/ProtectedRoute";

export const router = createBrowserRouter(
  [
    {
      path: "/",
      Component: Landing,
    },
    {
      path: "/auth",
      Component: Auth,
    },
    {
      path: "/app",
      Component: ProtectedRoute,
      children: [
        {
          Component: MainLayout,
          children: [
            { index: true, Component: Home },
            { path: "write", Component: Write },
            { path: "received", Component: Received },
            { path: "group", Component: GroupExchange },
            { path: "ai", Component: AIExchange },
            { path: "archive", Component: Archive },
            { path: "customize", Component: Customize },
            { path: "mypage", Component: MyPage },
          ],
        },
      ],
    },
    {
      path: "/join/:inviteCode",
      Component: JoinGroup,
    },
    {
      path: "*",
      Component: NotFound,
    },
  ],
  { basename: import.meta.env.BASE_URL }
);
