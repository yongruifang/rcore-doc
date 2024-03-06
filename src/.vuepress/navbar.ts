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
      {
        text: "Lab3",
        icon: "tag",
        link: '/experiment/lab3'
      },
      {
        text: "Lab4",
        icon: "tag",
        link: '/experiment/lab4'
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
      {
        text: "ch3",
        icon: "hashtag",
        link: '/theory/ch3'
      },
      {
        text: "ch4",
        icon: "hashtag",
        link: '/theory/ch4'
      },
      {
        text: "ch5",
        icon: "hashtag",
        link: '/theory/ch5'
      },
      {
        text: "ch6",
        icon: "hashtag",
        link: '/theory/ch6'
      },
    ],
  },
  {
    text: "参考",
    icon: "book",
    link: "/reference/",
  },
  {
    text: "常见问题",
    icon: "question",
    link: "/trouble/",
  }
]);
