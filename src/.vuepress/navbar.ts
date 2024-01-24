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
        icon: "tag",
        link: '/experiment/lab1'
      },
      {
        text: "Lab2",
        icon: "tag",
        link: '/experiment/lab2'
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
        icon: "hashtag",
        link: '/theory/ch1'
      },
      {
        text: "ch2",
        icon: "hashtag",
        link: '/theory/ch2'
      },
    ],
  },
  {
    text: "参考",
    icon: "book",
    link: "/reference/",
  },
]);
