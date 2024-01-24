import { navbar } from "vuepress-theme-hope";

export default navbar([
  "/",
  // "/demo",
  {
    text: "实验",
    icon: "hammer",
    prefix: "/experiment/",
    children: [
      {
        text: "Lab1",
        icon: "fire",
        // prefix: "bar/",
        // children: ["baz", { text: "...", icon: "ellipsis", link: "" }],
        link: '/lab1'
      },
      {
        text: "Lab2",
        icon: "fire",
        // prefix: "foo/",
        // children: ["ray", { text: "...", icon: "ellipsis", link: "" }],
        link: '/lab2'
      },
    ],
  },
  {
    text: "理论",
    icon: "flask",
    prefix: "/theory/",
    children: [
      {
        text: "ch1",
        icon: "lightbulb",
        link: '/ch1'
      },
      {
        text: "ch2",
        icon: "lightbulb",
        link: '/ch2'
      },
    ],
  },
  {
    text: "参考",
    icon: "book",
    link: "/reference/",
  },
]);
