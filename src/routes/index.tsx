import { createHashRouter } from "react-router-dom";

import { MainContentLayout } from "@/layout/MainContentLayout";
import { MainContentWrap } from "@/layout/MainContentWrap";
import { EmptyChat } from "@/pages/chat/EmptyChat";
import { QueryChat } from "@/pages/chat/queryChat";

import contactRoutes from "./ContactRoutes";
import thirdRoutes from "./thirdRoutes";

const router = createHashRouter([
  {
    path: "/",
    element: <MainContentWrap />,
    children: [
      {
        path: "/",
        element: <MainContentLayout />,
        children: [
          {
            path: "/chat",
            async lazy() {
              const { Chat } = await import("@/pages/chat");
              return { Component: Chat };
            },
            children: [
              {
                index: true,
                element: <EmptyChat />,
              },
              {
                path: ":conversationID",
                element: <QueryChat />,
              },
            ],
          },
          {
            path: "contact",
            async lazy() {
              const { Contact } = await import("@/pages/contact");
              return { Component: Contact };
            },
            children: contactRoutes,
          },
        ],
      },
      {
        path: "login",
        async lazy() {
          const { Login } = await import("@/pages/login");
          return { Component: Login };
        },
      },
    ],
  },
  {
    path: "third",
    children: [...thirdRoutes],
  },
]);

export default router;
